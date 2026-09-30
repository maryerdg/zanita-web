import type { CartItem } from '@/contexts/CartContext';
import type { CetysSchedule, SubmitOrderPayload } from './types';

// Helper to extract Tijuana timezone components deterministically
export function getTijuanaParts(date: Date = new Date(), timezone: string = 'America/Tijuana') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10) === 24 ? 0 : parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

// Calculate minimum requested date & time in Tijuana given anticipation hours
export function getMinAnticipationDateTime(minHours: number = 24, timezone: string = 'America/Tijuana') {
  const nowEpoch = Date.now();
  const minEpoch = nowEpoch + minHours * 60 * 60 * 1000;
  const parts = getTijuanaParts(new Date(minEpoch), timezone);
  const pad = (n: number) => String(n).padStart(2, '0');

  const minDateStr = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  const minTimeStr = `${pad(parts.hour)}:${pad(parts.minute)}`;

  return {
    minDateStr,
    minTimeStr,
    minEpoch,
  };
}

// Check if requested date and time satisfies min anticipation hours
export function isDateTimeAtLeast24Hours(
  dateStr: string,
  timeStr: string,
  minHours: number = 24,
  timezone: string = 'America/Tijuana'
): boolean {
  if (!dateStr || !timeStr) return false;

  const { minDateStr, minTimeStr } = getMinAnticipationDateTime(minHours, timezone);

  if (dateStr < minDateStr) return false;
  if (dateStr === minDateStr && timeStr < minTimeStr) return false;

  return true;
}

// Validate CETYS pickup schedule (days and hours)
export function validateCetysSchedule(
  dateStr: string,
  timeStr: string,
  schedule: CetysSchedule
): { valid: boolean; error?: string } {
  if (!dateStr || !timeStr) {
    return { valid: false, error: 'Fecha y hora requeridas.' };
  }

  // Parse YYYY-MM-DD to get ISO day of week (1 = Mon, ..., 7 = Sun)
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const jsDay = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const isoDay = jsDay === 0 ? 7 : jsDay;

  const allowedDays = schedule.days || [1, 2, 3, 4, 5];
  if (!allowedDays.includes(isoDay)) {
    return {
      valid: false,
      error: 'Pickup CETYS está disponible únicamente de lunes a viernes.',
    };
  }

  const startTime = schedule.start || '16:00';
  const endTime = schedule.end || '20:00';

  if (timeStr < startTime || timeStr > endTime) {
    return {
      valid: false,
      error: `El horario de entrega en CETYS debe ser entre 4:00 p.m. y 8:00 p.m. (${startTime} a ${endTime}).`,
    };
  }

  return { valid: true };
}

// Pure payload builder conforming strictly to public.submit_order RPC requirements
export function buildOrderPayload({
  idempotencyKey,
  customerName,
  customerPhone,
  customerEmail,
  requestedDate,
  requestedTime,
  deliveryPointId,
  deliveryAddress,
  notes,
  cartItems,
}: {
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  requestedDate: string;
  requestedTime: string;
  deliveryPointId: string;
  deliveryAddress?: string | null;
  notes?: string | null;
  cartItems: CartItem[];
}): SubmitOrderPayload {
  return {
    idempotency_key: idempotencyKey,
    customer_name: customerName.trim(),
    customer_phone: customerPhone.trim(),
    customer_email: customerEmail.trim().toLowerCase(),
    requested_date: requestedDate,
    requested_time: requestedTime.length === 5 ? `${requestedTime}:00` : requestedTime,
    delivery_point_id: deliveryPointId,
    delivery_address: deliveryAddress && deliveryAddress.trim().length > 0 ? deliveryAddress.trim() : null,
    notes: notes && notes.trim().length > 0 ? notes.trim() : null,
    items: cartItems.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      options: (item.selectedOptions || []).map((opt) => ({
        option_id: opt.optionId,
        quantity: opt.quantity,
      })),
    })),
  };
}

// Strictly validates and sanitizes internal next redirection paths
export function getSafeNextUrl(rawUrl: string | null | undefined, defaultUrl: string = '/mi-cuenta'): string {
  if (!rawUrl || typeof rawUrl !== 'string') return defaultUrl;
  const trimmed = rawUrl.trim();

  // Must begin with a single '/' and cannot start with '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return defaultUrl;
  }

  // Reject protocol schemes or dangerous URLs
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:') ||
    lower.includes('vbscript:') ||
    lower.includes('http:') ||
    lower.includes('https:')
  ) {
    return defaultUrl;
  }

  // Reject CRLF injection
  if (/[\r\n]/.test(trimmed)) {
    return defaultUrl;
  }

  return trimmed;
}

