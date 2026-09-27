'use client';

/**
 * components/store/ProductCustomizer.tsx
 *
 * Client-side product customizer. Receives serializable product data from the
 * Server Component (app/productos/[slug]/page.tsx) so the page itself stays RSC.
 *
 * Business rules come 100% from Supabase via the CatalogOptionGroup fields:
 *   isRequired, minSelections, maxSelections, includedSelections, allowRepeats,
 *   additionalPriceCents, alwaysCharge.
 *
 * NO business rule is hardcoded by slug name here.
 */

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Minus, ShoppingBag, Check, MessageSquare, AlertCircle, Info, ChevronDown, ChevronUp,
} from 'lucide-react';

import type { CatalogProduct, CatalogOptionGroup, CatalogOption } from '@/lib/catalog';
import type { SelectedOption } from '@/lib/catalog/validation';
import { validateOptionGroup, validateAllGroups } from '@/lib/catalog/validation';
import { calculateCustomizedPrice, calculateOptionExtraChargesCents } from '@/lib/catalog/pricing';
import { useCart } from '@/contexts/CartContext';
import { SITE_CONFIG } from '@/config/site';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductCustomizerProps {
  product:      CatalogProduct;
  optionGroups: CatalogOptionGroup[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initSelections(optionGroups: CatalogOptionGroup[]): SelectedOption[] {
  const result: SelectedOption[] = [];
  for (const group of optionGroups) {
    for (const opt of group.options) {
      result.push({
        groupId:             group.id,
        groupName:           group.name,
        optionId:            opt.id,
        optionName:          opt.name,
        quantity:            0,
        unitExtraPriceCents: opt.additionalPriceCents,
        totalExtraPriceCents: 0,
        alwaysCharge:        opt.alwaysCharge,
      });
    }
  }
  return result;
}

function setQty(
  prev:     SelectedOption[],
  optionId: string,
  newQty:   number
): SelectedOption[] {
  return prev.map(s => {
    if (s.optionId !== optionId) return s;
    const qty = Math.max(0, newQty);
    return { ...s, quantity: qty, totalExtraPriceCents: qty * s.unitExtraPriceCents };
  });
}

// ---------------------------------------------------------------------------
// Sub-component: Stepper row (allowRepeats groups: Toppings, Composición)
// ---------------------------------------------------------------------------

interface StepperRowProps {
  option:          CatalogOption;
  group:           CatalogOptionGroup;
  quantity:        number;
  groupTotal:      number; // effective qty already selected in this group
  onIncrement:     () => void;
  onDecrement:     () => void;
  showNormalPrice: boolean; // whether to show +$15 on normal options
}

function StepperRow({
  option,
  group,
  quantity,
  groupTotal,
  onIncrement,
  onDecrement,
  showNormalPrice,
}: StepperRowProps) {
  const atMax = group.maxSelections !== null && groupTotal >= group.maxSelections && quantity === 0
    ? false // new option, but group is full
    : group.maxSelections !== null && groupTotal >= group.maxSelections;

  // For alwaysCharge options, maxSelections check is bypassed (they don't count toward effective qty)
  const canIncrement = option.alwaysCharge ? true : !atMax;

  const priceCents   = option.additionalPriceCents;
  // Always show price for alwaysCharge (e.g. ⭐ +$35 c/u).
  // For normal options, ONLY show price if showNormalPrice is true (groups without included selections).
  const priceLabel   = option.alwaysCharge
    ? `+$${priceCents / 100} c/u`
    : showNormalPrice && priceCents > 0
    ? `+$${priceCents / 100} c/u`
    : null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F5EBDC] last:border-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[#261C19]">{option.name}</span>
        {priceLabel && (
          <span className={`text-xs font-medium ${option.alwaysCharge ? 'text-[#A73832]' : 'text-[#6E564F]'}`}>
            {option.alwaysCharge ? `⭐ ${priceLabel}` : priceLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDecrement}
          disabled={quantity <= 0}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E4D5C1] text-[#A73832] hover:bg-[#F5EBDC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={`Reducir ${option.name}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="w-7 text-center text-sm font-bold text-[#261C19] tabular-nums">
          {quantity}
        </span>

        <button
          type="button"
          onClick={onIncrement}
          disabled={!canIncrement}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E4D5C1] text-[#A73832] hover:bg-[#F5EBDC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={`Agregar ${option.name}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Checkbox-style select row (no-repeats groups: Frutas)
// ---------------------------------------------------------------------------

interface CheckRowProps {
  option:    CatalogOption;
  selected:  boolean;
  disabled:  boolean;
  onToggle:  () => void;
}

function CheckRow({ option, selected, disabled, onToggle }: CheckRowProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && !selected}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
        selected
          ? 'border-[#A73832] bg-[#FFF9F2] shadow-inner'
          : disabled
          ? 'border-[#E4D5C1] bg-[#FAFAFA] opacity-50 cursor-not-allowed'
          : 'border-[#E4D5C1] bg-white hover:border-[#A73832]/40 hover:bg-[#FFF9F2]/60'
      }`}
      aria-pressed={selected}
    >
      <span className="text-sm font-semibold text-[#261C19]">{option.name}</span>
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        selected ? 'border-[#A73832] bg-[#A73832]' : 'border-[#E4D5C1]'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Option Group renderer
// ---------------------------------------------------------------------------

interface GroupSectionProps {
  group:      CatalogOptionGroup;
  selections: SelectedOption[];
  onChange:   (newSelections: SelectedOption[]) => void;
  isBlocked?: boolean;
}

function GroupSection({ group, selections, onChange, isBlocked = false }: GroupSectionProps) {
  const groupSelections  = selections.filter(s => s.groupId === group.id);
  const validation       = validateOptionGroup(group, selections);

  const normalQty        = validation.normalQty;
  const alwaysChargeQty  = validation.alwaysChargeQty;
  const included         = group.includedSelections;
  const maxSel           = group.maxSelections;

  // Total quantity selected in this group
  const totalGroupQty    = groupSelections.reduce((sum, s) => sum + s.quantity, 0);

  // Group type identification
  const isComposition    = group.name.toLowerCase().includes('composición');
  const isToppingsGroup  = group.name.toLowerCase().includes('topping');
  const isOptional       = !group.isRequired && included === 0;

  // Accordion state:
  // - Blocked by empty required group: force closed
  // - Composición: always flat, never accordion
  // - Required Toppings (Charolas, Mix): open by default
  // - Optional Toppings (Manzanitas, Combos, Munxie): closed by default
  const [isOpen, setIsOpen] = useState(() => {
    if (isBlocked) return false;
    if (isComposition) return true;
    return group.isRequired || included > 0;
  });

  // Check if group has no active options
  const hasNoOptions = group.options.length === 0;

  // Content element ID for accessibility
  const contentId = `group-content-${group.id}`;

  // ---- Render no-options state (e.g., Frutas all inactive) ---------------
  if (hasNoOptions && group.isRequired) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#261C19] uppercase tracking-wider">{group.name}</h3>
            <span className="text-[10px] font-bold text-[#A73832] bg-[#F09CA9]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Requerido
            </span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1] flex items-center gap-3">
          <Info className="w-4 h-4 text-[#6E564F] shrink-0" />
          <p className="text-xs text-[#6E564F]">
            Por el momento no hay frutas de temporada disponibles.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASE 1: COMPOSICIÓN DE MANZANITAS (Always visible, clean, no accordion)
  // =========================================================================
  if (isComposition) {
    const isComplete = maxSel !== null && totalGroupQty === maxSel;

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#261C19] uppercase tracking-wider">
                COMPOSICIÓN DE MANZANITAS
              </h3>
              <span className="text-[10px] font-bold text-[#A73832] bg-[#F09CA9]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Requerido
              </span>
            </div>
            <p className="text-xs text-[#6E564F]">
              Elige cuántas manzanitas verdes y rojas llevará tu combo.
            </p>
          </div>

          {/* Counter badge: e.g. "0 / 6 manzanitas" or "6 / 6 manzanitas" */}
          {maxSel !== null && (
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 transition-colors ${
                isComplete
                  ? 'bg-[#4F7942]/15 text-[#4F7942]'
                  : 'bg-[#F5EBDC] text-[#A73832]'
              }`}
            >
              {totalGroupQty} / {maxSel} manzanitas
            </span>
          )}
        </div>

        {/* Progress bar */}
        {maxSel !== null && maxSel > 0 && (
          <div className="w-full h-1.5 bg-[#F5EBDC] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete ? 'bg-[#4F7942]' : 'bg-[#A73832]'
              }`}
              style={{ width: `${Math.min(100, (totalGroupQty / maxSel) * 100)}%` }}
            />
          </div>
        )}

        {/* Stepper options */}
        <div className="bg-white border border-[#E4D5C1] rounded-xl px-4 divide-y divide-[#F5EBDC]">
          {group.options.map(opt => {
            const sel = groupSelections.find(s => s.optionId === opt.id);
            const qty = sel?.quantity ?? 0;

            const handleIncrement = () => {
              if (maxSel !== null && totalGroupQty >= maxSel) return;
              onChange(setQty(selections, opt.id, qty + 1));
            };

            const handleDecrement = () => {
              onChange(setQty(selections, opt.id, Math.max(0, qty - 1)));
            };

            return (
              <StepperRow
                key={opt.id}
                option={opt}
                group={group}
                quantity={qty}
                groupTotal={totalGroupQty}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                showNormalPrice={false}
              />
            );
          })}
        </div>

        {/* Validation errors */}
        {!validation.valid && validation.errors.map((err, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-[#A73832]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{err}</span>
          </div>
        ))}
      </div>
    );
  }

  // =========================================================================
  // CASE 2: TOPPINGS (Accordion disclosure)
  // =========================================================================
  const isToppingsAccordion = isToppingsGroup || (group.allowRepeats && !isComposition);

  if (isToppingsAccordion) {
    const isIncludedMet = included > 0 && normalQty >= included;

    // Header labels
    const titleText = isOptional ? 'Agregar toppings' : 'TOPPINGS';
    const badgeText = isOptional ? 'Opcional' : 'Requerido';

    // Summary text for closed accordion
    let closedSummary = '';
    if (isBlocked) {
      closedSummary = 'Disponible cuando haya frutas de temporada.';
    } else if (included > 0) {
      if (normalQty === 0 && alwaysChargeQty === 0) {
        closedSummary = '0 seleccionados';
      } else if (normalQty < included) {
        closedSummary = `${normalQty} de ${included} incluidos seleccionados`;
      } else {
        const extrasCount = (normalQty - included) + alwaysChargeQty;
        closedSummary = extrasCount > 0
          ? `${included} incluidos + ${extrasCount} extra${extrasCount !== 1 ? 's' : ''}`
          : `${included} incluidos seleccionados`;
      }
    } else {
      if (totalGroupQty === 0) {
        closedSummary = '0 seleccionados';
      } else {
        closedSummary = `${totalGroupQty} extra${totalGroupQty !== 1 ? 's' : ''} seleccionado${totalGroupQty !== 1 ? 's' : ''}`;
      }
    }

    return (
      <div className="space-y-3">
        {/* Accordion Toggle Header */}
        <button
          type="button"
          onClick={() => {
            if (!isBlocked) setIsOpen(open => !open);
          }}
          disabled={isBlocked}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className={`w-full flex items-center justify-between gap-3 text-left py-2 px-1 rounded-lg transition-colors ${
            isBlocked
              ? 'opacity-60 cursor-not-allowed bg-transparent'
              : 'hover:bg-[#FFF9F2]/80 group/hdr cursor-pointer'
          }`}
        >
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#261C19] uppercase tracking-wider">
                {titleText}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isBlocked
                    ? 'text-[#6E564F] bg-[#E4D5C1]/40'
                    : isOptional
                    ? 'text-[#6E564F] bg-[#E4D5C1]/40'
                    : 'text-[#A73832] bg-[#F09CA9]/20'
                }`}
              >
                {isBlocked ? 'No disponible' : badgeText}
              </span>
            </div>

            {/* Description or Closed Summary */}
            {!isOpen ? (
              <p className={`text-xs font-medium ${isBlocked ? 'text-[#6E564F]' : 'text-[#A73832]'}`}>
                {closedSummary}
              </p>
            ) : isOptional ? (
              <p className="text-xs text-[#6E564F]">
                Personaliza tu pedido si quieres agregar algo extra.
              </p>
            ) : (
              <p className="text-xs text-[#6E564F]">
                Incluye {included} topping{included !== 1 ? 's' : ''}. Puedes repetir opciones.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Counter badge (only if not blocked) */}
            {!isBlocked && (
              included > 0 ? (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 transition-colors ${
                    isIncludedMet
                      ? 'bg-[#4F7942]/15 text-[#4F7942]'
                      : 'bg-[#F5EBDC] text-[#A73832]'
                  }`}
                >
                  Toppings incluidos · {Math.min(normalQty, included)}/{included}
                </span>
              ) : totalGroupQty > 0 ? (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 bg-[#4F7942]/15 text-[#4F7942]">
                  {totalGroupQty} extra{totalGroupQty !== 1 ? 's' : ''}
                </span>
              ) : null
            )}

            {/* Chevron (only if not blocked) */}
            {!isBlocked && (
              <span className="w-7 h-7 flex items-center justify-center rounded-full text-[#6E564F] group-hover/hdr:text-[#A73832] transition-colors">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            )}
          </div>
        </button>

        {/* Progress bar (when open and has included selections) */}
        {isOpen && included > 0 && (
          <div className="w-full h-1.5 bg-[#F5EBDC] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isIncludedMet ? 'bg-[#4F7942]' : 'bg-[#A73832]'
              }`}
              style={{ width: `${Math.min(100, (normalQty / included) * 100)}%` }}
            />
          </div>
        )}

        {/* Extra notice: Only appears when included toppings are met */}
        {isOpen && included > 0 && isIncludedMet && (
          <div className="p-2.5 rounded-lg bg-[#FFF9F2] border border-[#E4D5C1] text-xs text-[#A73832] font-medium flex items-center gap-2">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>¿Quieres agregar más? Los toppings adicionales cuestan +$15 c/u.</span>
          </div>
        )}

        {/* Accordion Content */}
        {isOpen && (
          <div id={contentId} className="space-y-3">
            <div className="bg-white border border-[#E4D5C1] rounded-xl px-4 divide-y divide-[#F5EBDC]">
              {group.options.map(opt => {
                const sel = groupSelections.find(s => s.optionId === opt.id);
                const qty = sel?.quantity ?? 0;

                const handleIncrement = () => {
                  if (!opt.alwaysCharge && maxSel !== null) {
                    const effQty = groupSelections
                      .filter(s => !s.alwaysCharge)
                      .reduce((sum, s) => sum + s.quantity, 0);
                    if (effQty >= maxSel) return;
                  }
                  onChange(setQty(selections, opt.id, qty + 1));
                };

                const handleDecrement = () => {
                  onChange(setQty(selections, opt.id, Math.max(0, qty - 1)));
                };

                const effectiveQty = groupSelections
                  .filter(s => !s.alwaysCharge)
                  .reduce((sum, s) => sum + s.quantity, 0);

                return (
                  <StepperRow
                    key={opt.id}
                    option={opt}
                    group={group}
                    quantity={qty}
                    groupTotal={effectiveQty}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    showNormalPrice={included === 0}
                  />
                );
              })}
            </div>

            {/* Validation errors */}
            {!validation.valid && validation.errors.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#A73832]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // CASE 3: NO-REPEATS GROUPS (e.g. Frutas de Temporada cards grid)
  // =========================================================================
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#261C19] uppercase tracking-wider">{group.name}</h3>
            {group.isRequired && (
              <span className="text-[10px] font-bold text-[#A73832] bg-[#F09CA9]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Requerido
              </span>
            )}
          </div>
          {maxSel !== null && (
            <p className="text-xs text-[#6E564F]">
              Elige {maxSel} opción{maxSel !== 1 ? 'es' : ''}.
            </p>
          )}
        </div>

        {/* Counter badge */}
        {maxSel !== null && (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
              validation.valid
                ? 'bg-[#4F7942]/15 text-[#4F7942]'
                : 'bg-[#F5EBDC] text-[#A73832]'
            }`}
          >
            {totalGroupQty} / {maxSel} seleccionadas
          </span>
        )}
      </div>

      {/* Checkbox cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {group.options.map(opt => {
          const sel      = groupSelections.find(s => s.optionId === opt.id);
          const selected = (sel?.quantity ?? 0) > 0;
          const atMax    = maxSel !== null && totalGroupQty >= maxSel && !selected;

          const handleToggle = () => {
            if (selected) {
              onChange(setQty(selections, opt.id, 0));
            } else if (!atMax) {
              onChange(setQty(selections, opt.id, 1));
            }
          };

          return (
            <CheckRow
              key={opt.id}
              option={opt}
              selected={selected}
              disabled={atMax}
              onToggle={handleToggle}
            />
          );
        })}
      </div>

      {/* Validation errors */}
      {!validation.valid && validation.errors.map((err, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-[#A73832]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{err}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductCustomizer({ product, optionGroups }: ProductCustomizerProps) {
  const { addItem } = useCart();
  const [selections, setSelections] = useState<SelectedOption[]>(() => initSelections(optionGroups));
  const [cartQty, setCartQty]       = useState(1);
  const [justAdded, setJustAdded]   = useState(false);

  // ---- Derived state -------------------------------------------------------
  const isFormValid = useMemo(
    () => validateAllGroups(optionGroups, selections),
    [optionGroups, selections]
  );

  const dynamicPricePesos = useMemo(
    () => calculateCustomizedPrice(
      Math.round(product.price * 100),
      optionGroups,
      selections
    ),
    [product.price, optionGroups, selections]
  );

  const extrasPesos = dynamicPricePesos - product.price;

  // ---- Handlers -----------------------------------------------------------
  const handleChange = useCallback((newSelections: SelectedOption[]) => {
    setSelections(newSelections);
  }, []);

  const handleAddToCart = () => {
    if (!isFormValid) return;

    const activeOptions = selections.filter(s => s.quantity > 0);

    // Compute exact extra charges for each option using the derived pricing helper
    const chargesByOption = new Map<string, number>();
    for (const group of optionGroups) {
      const groupCharges = calculateOptionExtraChargesCents(group, selections);
      groupCharges.forEach((cents, optId) => {
        chargesByOption.set(optId, cents);
      });
    }

    const cartOptions = activeOptions.map(s => {
      const chargedCents = chargesByOption.get(s.optionId) ?? 0;
      const group = optionGroups.find(g => g.id === s.groupId);
      const isCompGroup = group ? group.name.toLowerCase().includes('composición') : false;
      const isOptionalGroup = group ? group.includedSelections === 0 && !group.isRequired : false;

      let displayGroupName = s.groupName;
      if (isCompGroup) {
        displayGroupName = 'Composición';
      } else if (isOptionalGroup) {
        displayGroupName = 'Toppings opcionales';
      }

      return {
        groupId:                 s.groupId,
        groupName:               displayGroupName,
        optionId:                s.optionId,
        optionName:              s.optionName,
        quantity:                s.quantity,
        unitExtraPrice:          s.unitExtraPriceCents / 100,
        totalExtraPrice:         chargedCents / 100,
        alwaysCharge:            s.alwaysCharge,
        groupIncludedSelections: group ? group.includedSelections : 0,
      };
    });

    addItem({
      productId:       product.id,
      slug:            product.slug,
      name:            product.name,
      baseUnitPrice:   product.price,
      unitPrice:       dynamicPricePesos,
      quantity:        cartQty,
      photoSrc:        product.photoSrc ?? undefined,
      selectedOptions: cartOptions,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

  // No option groups → simple add-to-cart (Manzanitas, etc.)
  const hasGroups = optionGroups.length > 0;

  // Check if any required group has no active options (e.g. Frutas de Temporada)
  const hasBlockedRequiredGroup = useMemo(
    () => optionGroups.some(g => g.isRequired && g.options.length === 0),
    [optionGroups]
  );

  // ---- If no groups, render simple controls --------------------------------
  if (!hasGroups) {
    return <SimpleAddToCart product={product} />;
  }

  // ---- Render customizer --------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Option Groups */}
      {optionGroups.map(group => {
        const isThisGroupBlocked = hasBlockedRequiredGroup && !(group.isRequired && group.options.length === 0);

        return (
          <div key={group.id} className="space-y-3 pt-4 border-t border-[#F5EBDC] first:border-t-0 first:pt-0">
            <GroupSection
              group={group}
              selections={selections}
              onChange={handleChange}
              isBlocked={isThisGroupBlocked}
            />
          </div>
        );
      })}

      {/* Dynamic Price Summary */}
      <div className="mt-2 p-4 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1]">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[#6E564F] block">Precio por unidad</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-serif font-bold text-2xl text-[#A73832]">
                ${dynamicPricePesos}
              </span>
              <span className="text-xs text-[#6E564F]">MXN</span>
            </div>
            {extrasPesos > 0 && (
              <span className="text-xs text-[#6E564F] mt-0.5 block">
                Base ${product.price} + extras ${extrasPesos}
              </span>
            )}
          </div>

          {/* Quantity selector for cart */}
          <div className="flex items-center border border-[#A73832] rounded-md overflow-hidden bg-white shrink-0">
            <button
              onClick={() => setCartQty(q => Math.max(1, q - 1))}
              disabled={cartQty <= 1}
              className="p-2.5 text-[#A73832] hover:bg-[#F5EBDC] disabled:opacity-50 transition-colors"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center text-sm font-bold text-[#261C19]">{cartQty}</span>
            <button
              onClick={() => setCartQty(q => q + 1)}
              className="p-2.5 text-[#A73832] hover:bg-[#F5EBDC] transition-colors"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Total line */}
        {cartQty > 1 && (
          <div className="mt-2 pt-2 border-t border-[#E4D5C1] flex justify-between text-sm">
            <span className="text-[#6E564F]">Total ({cartQty} ×)</span>
            <span className="font-bold text-[#261C19]">${dynamicPricePesos * cartQty} MXN</span>
          </div>
        )}
      </div>

      {/* Add to Cart Button */}
      <div className="space-y-3">
        <button
          onClick={handleAddToCart}
          disabled={!isFormValid || justAdded}
          className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-md text-white transition-all text-xs font-bold uppercase tracking-wider shadow-2xs ${
            !isFormValid
              ? 'bg-[#E4D5C1] cursor-not-allowed text-[#6E564F]'
              : justAdded
              ? 'bg-[#4F7942]'
              : 'bg-[#A73832] hover:bg-[#8e2e28]'
          }`}
          aria-label={`Agregar ${product.name} al carrito`}
        >
          {justAdded ? (
            <>
              <Check className="w-4.5 h-4.5" />
              <span>¡Agregado al carrito!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>Agregar al carrito</span>
            </>
          )}
        </button>

        {/* Secondary links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#E4D5C1]">
          <Link
            href="/carrito"
            className="text-sm font-bold text-[#A73832] hover:underline"
          >
            Ver carrito
          </Link>
          <a
            href={`${SITE_CONFIG.whatsapp.url}?text=Hola%20Zanita%2C%20tengo%20una%20duda%20sobre%20${encodeURIComponent(product.name)}.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#6E564F] hover:text-[#A73832] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>¿Dudas? Contáctanos por WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SimpleAddToCart — for products without option groups (Manzanitas)
// ---------------------------------------------------------------------------

function SimpleAddToCart({ product }: { product: CatalogProduct }) {
  const { addItem } = useCart();
  const [quantity, setQuantity]   = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = () => {
    addItem({
      productId:       product.id,
      slug:            product.slug,
      name:            product.name,
      baseUnitPrice:   product.price,
      unitPrice:       product.price,
      quantity,
      photoSrc:        product.photoSrc ?? undefined,
      selectedOptions: [],
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

  return (
    <div className="pt-2 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center border border-[#A73832] rounded-md overflow-hidden bg-white shrink-0">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="p-3 md:p-4 text-[#A73832] hover:bg-[#F5EBDC] disabled:opacity-50 transition-colors"
            aria-label="Disminuir cantidad"
          >
            <Minus className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <span className="w-12 md:w-16 text-center text-sm md:text-base font-bold text-[#261C19]">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            className="p-3 md:p-4 text-[#A73832] hover:bg-[#F5EBDC] transition-colors"
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={justAdded}
          className={`flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-md text-white transition-all text-xs font-bold uppercase tracking-wider shadow-2xs ${
            justAdded ? 'bg-[#4F7942]' : 'bg-[#A73832] hover:bg-[#8e2e28]'
          }`}
          aria-label={`Agregar ${product.name} al carrito`}
        >
          {justAdded ? (
            <>
              <Check className="w-4.5 h-4.5" />
              <span>¡Agregado al carrito!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>Agregar al carrito</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E4D5C1]">
        <Link href="/carrito" className="text-sm font-bold text-[#A73832] hover:underline">
          Ver carrito
        </Link>
        <a
          href={`${SITE_CONFIG.whatsapp.url}?text=Hola%20Zanita%2C%20tengo%20una%20duda%20sobre%20${encodeURIComponent(product.name)}.`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-[#6E564F] hover:text-[#A73832] transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>¿Dudas? Contáctanos por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
