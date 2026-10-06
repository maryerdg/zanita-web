import type { CartItem } from '@/contexts/CartContext';

const SESSION_KEY = 'zanita_checkout_idempotency';

interface IdempotencySessionData {
  key: string;
  fingerprint: string;
}

/**
 * Computes a lightweight deterministic fingerprint of cart items and their selected options.
 * If anything in the cart changes, this fingerprint changes.
 */
export function computeCartFingerprint(items: CartItem[]): string {
  const simplified = (items || []).map((item) => ({
    id: item.productId,
    qty: item.quantity,
    options: (item.selectedOptions || [])
      .map((opt) => `${opt.optionId}:${opt.quantity}`)
      .sort()
      .join(','),
  }));
  return JSON.stringify(simplified);
}

/**
 * Retrieves the current idempotency key from sessionStorage if it matches the current cart fingerprint.
 * Generates a new UUID v4 if no key exists or if the cart items have changed.
 * Survives page refreshes and network retries while keeping the same key.
 */
export function getOrCreateIdempotencyKey(items: CartItem[]): string {
  if (typeof window === 'undefined') {
    return crypto.randomUUID();
  }

  const currentFingerprint = computeCartFingerprint(items);

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const data: IdempotencySessionData = JSON.parse(raw);
      if (data && data.key && data.fingerprint === currentFingerprint) {
        return data.key;
      }
    }
  } catch {
    // Ignore JSON parse errors and generate fresh key
  }

  const newKey = crypto.randomUUID();
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ key: newKey, fingerprint: currentFingerprint })
    );
  } catch {
    // Ignore sessionStorage quota or access errors
  }
  return newKey;
}

/**
 * Clears the stored idempotency key from sessionStorage upon successful order creation.
 */
export function clearIdempotencyKey(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}
