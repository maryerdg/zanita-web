/**
 * lib/catalog/validation.ts
 *
 * Selection model + validation logic for Zanita product customizer.
 * This file is shared by the customizer UI and the cart line-ID builder.
 */

import type { CatalogOptionGroup } from './index';

// ---------------------------------------------------------------------------
// Selection model
// ---------------------------------------------------------------------------

/**
 * Represents a single option chosen by the customer, with an explicit quantity.
 * We never use a boolean `selected` — quantity=0 means not selected.
 */
export interface SelectedOption {
  groupId:            string;
  groupName:          string;
  optionId:           string;
  optionName:         string;
  quantity:           number;   // 0 = not selected
  unitExtraPriceCents: number;  // cents per unit (from CatalogOption.additionalPriceCents)
  totalExtraPriceCents: number; // = quantity × unitExtraPriceCents (informational)
  alwaysCharge:       boolean;
}

// ---------------------------------------------------------------------------
// Group validation result
// ---------------------------------------------------------------------------

export interface GroupValidationResult {
  valid:              boolean;
  /** Quantity of normal (non-alwaysCharge) selections */
  normalQty:          number;
  /** Quantity of alwaysCharge selections */
  alwaysChargeQty:    number;
  /** Total quantity used toward minSelections/includedSelections */
  effectiveQty:       number;
  errors:             string[];
}

// ---------------------------------------------------------------------------
// validateOptionGroup
// ---------------------------------------------------------------------------

/**
 * Validates whether the user's selections satisfy a group's rules.
 *
 * Critical rule (alwaysCharge):
 *   - Options with alwaysCharge=true do NOT count toward effectiveQty
 *     (minSelections / includedSelections).
 *   - This is specific to the Toppings group where "Uvas Forradas" is premium.
 *   - For groups where NO options have alwaysCharge, the distinction is moot
 *     (Composición, Frutas — all options count normally).
 *
 * NOTE: for groups where all options have alwaysCharge=false (e.g. Composición,
 * Frutas), effectiveQty = totalQty and the rule works as expected.
 */
export function validateOptionGroup(
  group:      CatalogOptionGroup,
  selections: SelectedOption[]
): GroupValidationResult {
  const groupSelections  = selections.filter(s => s.groupId === group.id);

  const normalSelections      = groupSelections.filter(s => !s.alwaysCharge);
  const alwaysChargeSelections = groupSelections.filter(s => s.alwaysCharge);

  const normalQty      = normalSelections.reduce((sum, s) => sum + s.quantity, 0);
  const alwaysChargeQty = alwaysChargeSelections.reduce((sum, s) => sum + s.quantity, 0);

  // effectiveQty is what counts toward min/max (excludes alwaysCharge)
  const effectiveQty = normalQty;

  const errors: string[] = [];

  // Required groups must have at least minSelections effective units
  if (group.isRequired && effectiveQty < group.minSelections) {
    const remaining = group.minSelections - effectiveQty;
    errors.push(
      `Faltan ${remaining} topping${remaining !== 1 ? 's' : ''} por elegir.`
    );
  }

  // maxSelections applies to effective qty (NULL = unlimited)
  if (group.maxSelections !== null && effectiveQty > group.maxSelections) {
    errors.push(
      `Máximo ${group.maxSelections} selección${group.maxSelections !== 1 ? 'es' : ''}.`
    );
  }

  // If not required, 0 selections is fine
  const valid =
    errors.length === 0 &&
    (group.isRequired ? effectiveQty >= group.minSelections : true) &&
    (group.maxSelections !== null ? effectiveQty <= group.maxSelections : true);

  return { valid, normalQty, alwaysChargeQty, effectiveQty, errors };
}

// ---------------------------------------------------------------------------
// validateAllGroups
// ---------------------------------------------------------------------------

export function validateAllGroups(
  optionGroups: CatalogOptionGroup[],
  selections:   SelectedOption[]
): boolean {
  return optionGroups.every(g => validateOptionGroup(g, selections).valid);
}

// ---------------------------------------------------------------------------
// buildCartLineId  (deterministic, order-independent)
// ---------------------------------------------------------------------------

/**
 * Produces a stable string key that uniquely identifies a product+configuration.
 *
 * Algorithm:
 *   1. Start with productId.
 *   2. Sort selections by (groupId, optionId).
 *   3. Filter to quantity > 0.
 *   4. Append each as "groupId:optionId:qty".
 *   5. Join with "|".
 *
 * This guarantees:
 *   - Same config regardless of click order → same lineId → merge in cart.
 *   - Different config → different lineId → separate cart line.
 *   - No random, no timestamp, fully deterministic.
 */
export function buildCartLineId(
  productId:  string,
  selections: SelectedOption[]
): string {
  const active = selections
    .filter(s => s.quantity > 0)
    .slice()
    .sort((a, b) => {
      if (a.groupId < b.groupId) return -1;
      if (a.groupId > b.groupId) return 1;
      if (a.optionId < b.optionId) return -1;
      if (a.optionId > b.optionId) return 1;
      return 0;
    });

  if (active.length === 0) return productId;

  const signature = active.map(s => `${s.groupId}:${s.optionId}:${s.quantity}`).join('|');
  return `${productId}::${signature}`;
}
