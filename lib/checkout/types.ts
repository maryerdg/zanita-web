export type CheckoutProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  cetysPickupEnabled: boolean;
};

export type DeliveryPoint = {
  id: string;
  name: string;
  address: string | null;
  instructions: string | null;
  type: 'standard' | 'special' | 'other';
  requires_quote: boolean;
  delivery_fee_cents: number | null;
  requires_special_pickup_permission: boolean;
  is_active: boolean;
  display_order: number;
};

export type CetysSchedule = {
  days: number[]; // 1 = Monday, ..., 7 = Sunday
  start: string;  // e.g. "16:00"
  end: string;    // e.g. "20:00"
};

export type StoreSettings = {
  timezone: string;
  minAnticipationHours: number;
  cetysPickupSchedule: CetysSchedule;
  orderSubmissionCutoff: string;
};

export type SubmitOrderItemPayload = {
  product_id: string;
  quantity: number;
  options: {
    option_id: string;
    quantity: number;
  }[];
};

export type SubmitOrderPayload = {
  idempotency_key: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  requested_date: string;
  requested_time: string;
  delivery_point_id: string;
  delivery_address: string | null;
  notes: string | null;
  items: SubmitOrderItemPayload[];
};
