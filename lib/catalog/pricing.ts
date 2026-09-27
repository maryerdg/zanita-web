/**
 * lib/catalog/pricing.ts
 *
 * Isolated, testable pricing logic for Zanita product customizer.
 * All internal calculations are in CENTS. Dollar amounts only at the boundary.
 *
 * SECURITY NOTE (PASS 8C):
 * Prices stored in localStorage must NOT be trusted server-side.
 * PASS 8C checkout must re-fetch productId + optionId + quantity from Supabase
 * and recalculate the total independently.
 */

import type { CatalogOptionGroup } from './index';
import type { SelectedOption } from './validation';

/**
 * For a single option group, calculate the extra cost in cents.
 *
 * Rules:
 * - Options with alwaysCharge=true  → always cost qty × unitPrice; never count toward includedSelections.
 * - Options with alwaysCharge=false → first `includedSelections` total qty units are free;
 *   remaining units cost qty × additionalPriceCents each.
 */
export function calculateGroupExtraCents(
  group: CatalogOptionGroup,
  selections: SelectedOption[]
): number {
  const groupSelections = selections.filter(s => s.groupId === group.id);

  const alwaysChargeSelections = groupSelections.filter(s => s.alwaysCharge);
  const normalSelections       = groupSelections.filter(s => !s.alwaysCharge);

  // alwaysCharge: every unit costs its unitExtraPriceCents
  const alwaysChargeTotal = alwaysChargeSelections.reduce(
    (sum, s) => sum + s.quantity * s.unitExtraPriceCents,
    0
  );

  // normal: first `includedSelections` units are free, the rest cost money
  const totalNormalQty  = normalSelections.reduce((sum, s) => sum + s.quantity, 0);
  const extraNormalQty  = Math.max(0, totalNormalQty - group.includedSelections);

  // All normal options share the same unit price (currently $15 = 1500 cents).
  // Use the price from the first normal selection found.
  const normalUnitPrice = normalSelections.length > 0
    ? normalSelections[0].unitExtraPriceCents
    : 0;

  const normalExtraTotal = extraNormalQty * normalUnitPrice;

  return alwaysChargeTotal + normalExtraTotal;
}

/**
 * For a given group and selections, calculate how much extra (in cents) each option
 * is actually charged.
 *
 * Rules:
 * - Options with alwaysCharge=true  → charged = quantity × unitExtraPriceCents
 * - Options with alwaysCharge=false → first `includedSelections` units across all normal
 *   options are free (charged = 0). Units beyond `includedSelections` are charged
 *   at their unitExtraPriceCents.
 */
export function calculateOptionExtraChargesCents(
  group: CatalogOptionGroup,
  selections: SelectedOption[]
): Map<string, number> {
  const result = new Map<string, number>();
  const groupSelections = selections.filter(s => s.groupId === group.id && s.quantity > 0);

  let freeSlotsLeft = group.includedSelections;

  // 1. alwaysCharge options: each unit is charged
  for (const s of groupSelections) {
    if (s.alwaysCharge) {
      result.set(s.optionId, s.quantity * s.unitExtraPriceCents);
    }
  }

  // 2. normal options: waterfall through free slots
  for (const s of groupSelections) {
    if (!s.alwaysCharge) {
      if (freeSlotsLeft >= s.quantity) {
        freeSlotsLeft -= s.quantity;
        result.set(s.optionId, 0);
      } else if (freeSlotsLeft > 0) {
        const paidQty = s.quantity - freeSlotsLeft;
        freeSlotsLeft = 0;
        result.set(s.optionId, paidQty * s.unitExtraPriceCents);
      } else {
        result.set(s.optionId, s.quantity * s.unitExtraPriceCents);
      }
    }
  }

  return result;
}

/**
 * Calculate the total customized price in cents for a product with all its groups.
 */
export function calculateCustomizedPriceCents(
  basePriceCents: number,
  optionGroups:   CatalogOptionGroup[],
  selections:     SelectedOption[]
): number {
  const extraCents = optionGroups.reduce(
    (sum, group) => sum + calculateGroupExtraCents(group, selections),
    0
  );
  return basePriceCents + extraCents;
}

/** Convenience: returns price in MXN pesos (number) */
export function calculateCustomizedPrice(
  basePriceCents: number,
  optionGroups:   CatalogOptionGroup[],
  selections:     SelectedOption[]
): number {
  return calculateCustomizedPriceCents(basePriceCents, optionGroups, selections) / 100;
}

/** Format a cent value to "$X" display string (no decimals for round amounts) */
export function formatMXN(cents: number): string {
  const pesos = cents / 100;
  return Number.isInteger(pesos) ? `$${pesos}` : `$${pesos.toFixed(2)}`;
}

export interface GroupExtraSummary {
  normalExtraQuantity:   number;
  normalExtraPricePesos: number;
  premiumCharges:        Array<{
    optionId:        string;
    optionName:      string;
    quantity:        number;
    totalExtraPesos: number;
  }>;
}

/**
 * For a group with included selections (e.g. Charolas), calculate the aggregated
 * extra summary for cart display:
 * - normalExtraQuantity: excess normal selections beyond includedSelections
 * - normalExtraPricePesos: total extra price for normal selections
 * - premiumCharges: alwaysCharge options (e.g. Uvas Forradas) with their individual prices
 */
export function calculateGroupExtraSummary(
  includedSelections: number,
  options: Array<{
    optionId:       string;
    optionName:     string;
    quantity:       number;
    unitExtraPrice: number;
    alwaysCharge:   boolean;
  }>
): GroupExtraSummary {
  const normalOpts  = options.filter(o => !o.alwaysCharge);
  const premiumOpts = options.filter(o => o.alwaysCharge && o.quantity > 0);

  const totalNormalQty = normalOpts.reduce((sum, o) => sum + o.quantity, 0);
  const normalExtraQuantity = Math.max(0, totalNormalQty - includedSelections);
  const normalUnitPrice = normalOpts.length > 0 ? normalOpts[0].unitExtraPrice : 0;
  const normalExtraPricePesos = normalExtraQuantity * normalUnitPrice;

  const premiumCharges = premiumOpts.map(o => ({
    optionId:        o.optionId,
    optionName:      o.optionName,
    quantity:        o.quantity,
    totalExtraPesos: o.quantity * o.unitExtraPrice,
  }));

  return {
    normalExtraQuantity,
    normalExtraPricePesos,
    premiumCharges,
  };
}
