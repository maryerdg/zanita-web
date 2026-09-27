'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { buildCartLineId } from '@/lib/catalog/validation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CartSelectedOption = {
  groupId:             string;
  groupName:           string;
  optionId:            string;
  optionName:          string;
  quantity:                 number;
  unitExtraPrice:           number;  // MXN pesos
  totalExtraPrice:          number;  // MXN pesos
  alwaysCharge:             boolean;
  groupIncludedSelections?: number;
};

export type CartItem = {
  lineId:          string;
  productId:       string;
  slug:            string;
  name:            string;
  /** Base price WITHOUT extras (pesos) */
  baseUnitPrice:   number;
  /** Final unit price including extras (pesos) */
  unitPrice:       number;
  quantity:        number;
  photoSrc?:       string;
  selectedOptions: CartSelectedOption[];
};

type CartContextType = {
  items:          CartItem[];
  itemCount:      number;
  subtotal:       number;
  isHydrated:     boolean;
  addItem:        (item: Omit<CartItem, 'lineId'>) => void;
  removeItem:     (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart:      () => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'zanita_cart_v2';

// ---------------------------------------------------------------------------
// Safe localStorage parsing (backward-compatible)
// ---------------------------------------------------------------------------

function safeParseCartSelectedOption(raw: unknown): CartSelectedOption | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;

  const groupId    = typeof o.groupId    === 'string' ? o.groupId    : '';
  const groupName  = typeof o.groupName  === 'string' ? o.groupName  : '';
  const optionId   = typeof o.optionId   === 'string' ? o.optionId   : '';
  const optionName = typeof o.optionName === 'string' ? o.optionName : '';
  const qty        = typeof o.quantity   === 'number' ? o.quantity   : 0;

  if (!groupId || !optionId || qty <= 0) return null;

  return {
    groupId,
    groupName,
    optionId,
    optionName,
    quantity:        qty,
    unitExtraPrice:  typeof o.unitExtraPrice  === 'number' ? o.unitExtraPrice  : 0,
    totalExtraPrice:         typeof o.totalExtraPrice === 'number' ? o.totalExtraPrice : 0,
    alwaysCharge:            typeof o.alwaysCharge    === 'boolean' ? o.alwaysCharge   : false,
    groupIncludedSelections: typeof o.groupIncludedSelections === 'number' ? o.groupIncludedSelections : 0,
  };
}

function safeParseCart(data: string | null): CartItem[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    const validItems: CartItem[] = [];

    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;

      const slug  = typeof item.slug  === 'string' ? item.slug.trim()  : '';
      const name  = typeof item.name  === 'string' ? item.name.trim()  : '';
      const productId = typeof item.productId === 'string' ? item.productId : slug;

      // Support both old (unitPrice only) and new (baseUnitPrice + unitPrice) schemas
      const unitPrice     = typeof item.unitPrice     === 'number' ? item.unitPrice     : -1;
      const baseUnitPrice = typeof item.baseUnitPrice === 'number' ? item.baseUnitPrice : unitPrice;
      const quantity      = typeof item.quantity      === 'number' ? item.quantity      : -1;

      if (
        !slug ||
        !name ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        continue;
      }

      // Parse selectedOptions — old items without this field default to []
      const rawOptions = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
      const selectedOptions: CartSelectedOption[] = rawOptions
        .map(safeParseCartSelectedOption)
        .filter((o: CartSelectedOption | null): o is CartSelectedOption => o !== null);

      // Rebuild deterministic lineId from productId + options
      // (handles old items that used slug as lineId)
      const selectedForId = selectedOptions.map(o => ({
        groupId:             o.groupId,
        groupName:           o.groupName,
        optionId:            o.optionId,
        optionName:          o.optionName,
        quantity:            o.quantity,
        unitExtraPriceCents: Math.round(o.unitExtraPrice * 100),
        totalExtraPriceCents: Math.round(o.totalExtraPrice * 100),
        alwaysCharge:        o.alwaysCharge,
      }));
      const lineId = buildCartLineId(productId, selectedForId);

      validItems.push({
        lineId,
        productId,
        slug,
        name,
        baseUnitPrice,
        unitPrice,
        quantity,
        photoSrc:       typeof item.photoSrc === 'string' ? item.photoSrc : undefined,
        selectedOptions,
      });
    }

    // Merge duplicate lineIds (shouldn't happen, but defensive)
    const merged: CartItem[] = [];
    for (const item of validItems) {
      const existing = merged.find(i => i.lineId === item.lineId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.push(item);
      }
    }

    return merged;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers run once on mount (client-only).
  // We avoid calling setState inside a useEffect to satisfy react-hooks/set-state-in-effect.
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const storedV2 = localStorage.getItem(CART_STORAGE_KEY);
    const storedV1 = !storedV2 ? localStorage.getItem('zanita_cart_v1') : null;
    return safeParseCart(storedV2 ?? storedV1);
  });

  // isHydrated is true as soon as useState runs on the client.
  // We still need a boolean flag for SSR hydration (server renders false,
  // client flips to true via useEffect so the cart displays correctly).
  const [isHydrated, setIsHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIsHydrated(true); }, []);

  // Persist
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  // -------------------------------------------------------------------------
  // addItem — uses deterministic lineId for merge
  // -------------------------------------------------------------------------
  const addItem = (newItem: Omit<CartItem, 'lineId'>) => {
    setItems(current => {
      // Build lineId from the selectedOptions that come in (already in SelectedOption format
      // via the customizer, but CartSelectedOption is stored in pesos — convert)
      const selectedForId = (newItem.selectedOptions ?? []).map(o => ({
        groupId:              o.groupId,
        groupName:            o.groupName,
        optionId:             o.optionId,
        optionName:           o.optionName,
        quantity:             o.quantity,
        unitExtraPriceCents:  Math.round(o.unitExtraPrice * 100),
        totalExtraPriceCents: Math.round(o.totalExtraPrice * 100),
        alwaysCharge:         o.alwaysCharge,
      }));

      const lineId   = buildCartLineId(newItem.productId, selectedForId);
      const existing = current.find(i => i.lineId === lineId);

      if (existing) {
        return current.map(item =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }

      return [...current, { ...newItem, lineId }];
    });
  };

  const removeItem = (lineId: string) =>
    setItems(current => current.filter(item => item.lineId !== lineId));

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(current =>
      current.map(item =>
        item.lineId === lineId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{
      items, itemCount, subtotal, isHydrated,
      addItem, removeItem, updateQuantity, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
