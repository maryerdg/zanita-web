'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type CartSelectedOption = {
  name: string;
  value: string;
};

export type CartItem = {
  lineId: string;
  productId?: string;
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  photoSrc?: string;
  selectedOptions?: CartSelectedOption[];
};

type CartContextType = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  addItem: (item: Omit<CartItem, 'lineId'>) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'zanita_cart_v1';

// Defensive local storage parsing
function safeParseCart(data: string | null): CartItem[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    const validItems: CartItem[] = [];

    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;

      const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : -1;
      const quantity = typeof item.quantity === 'number' ? item.quantity : -1;

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

      let lineId = slug;
      if (typeof item.lineId === 'string' && item.lineId.trim() !== '') {
        lineId = item.lineId.trim();
      }

      validItems.push({
        lineId,
        slug,
        name,
        unitPrice,
        quantity,
        productId: typeof item.productId === 'string' ? item.productId : undefined,
        photoSrc: typeof item.photoSrc === 'string' ? item.photoSrc : undefined,
        selectedOptions: Array.isArray(item.selectedOptions) ? item.selectedOptions : undefined
      });
    }

    return validItems;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from local storage
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const initialItems = safeParseCart(stored);

    if (initialItems.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(initialItems);
    }

    setIsHydrated(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addItem = (newItem: Omit<CartItem, 'lineId'>) => {
    setItems(current => {
      // Use slug as lineId for now. Future: hash(slug + options)
      const lineId = newItem.slug;

      const existingItem = current.find(i => i.lineId === lineId);

      if (existingItem) {
        // Immutable update
        return current.map(item =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }

      return [...current, { ...newItem, lineId }];
    });
  };

  const removeItem = (lineId: string) => {
    setItems(current => current.filter(item => item.lineId !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity < 1) return; // Enforce minimum 1

    setItems(current =>
      current.map(item =>
        item.lineId === lineId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0), [items]);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal,
      isHydrated,
      addItem,
      removeItem,
      updateQuantity,
      clearCart
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
