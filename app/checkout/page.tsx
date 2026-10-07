import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/app/actions/supabase-server';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import type { CheckoutProfile, DeliveryPoint, StoreSettings } from '@/lib/checkout/types';

export const metadata: Metadata = {
  title: 'Finaliza tu pedido | Zanita',
  description: 'Revisa y finaliza tu pedido de manzanitas y botanas con chamoy artesanal en Tijuana.',
};

export default async function CheckoutPage() {
  const supabase = await createClient();

  // 1. Auth Guard: Require authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/iniciar-sesion?next=/checkout');
  }

  // 2. Fetch authenticated profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, cetys_pickup_enabled')
    .eq('id', user.id)
    .single();

  const initialProfile: CheckoutProfile = {
    id: user.id,
    fullName: profile?.full_name || (user.user_metadata?.full_name as string) || '',
    phone: profile?.phone || (user.user_metadata?.phone as string) || '',
    email: profile?.email || user.email || '',
    cetysPickupEnabled: profile?.cetys_pickup_enabled === true,
  };

  // 3. Fetch active delivery points from DB
  const { data: rawDeliveryPoints } = await supabase
    .from('zanita_delivery_points')
    .select('id, name, address, instructions, type, requires_quote, delivery_fee_cents, requires_special_pickup_permission, is_active, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const deliveryPoints: DeliveryPoint[] = (rawDeliveryPoints || []) as DeliveryPoint[];

  // 4. Fetch store settings from DB
  const { data: rawSettings } = await supabase
    .from('zanita_store_settings')
    .select('key, value, is_public')
    .in('key', ['timezone', 'min_anticipation_hours']);

  const settingsMap = new Map<string, unknown>();
  (rawSettings || []).forEach((row) => {
    settingsMap.set(row.key, row.value);
  });

  const storeSettings: StoreSettings = {
    timezone: (settingsMap.get('timezone') as string) || 'America/Tijuana',
    minAnticipationHours: (settingsMap.get('min_anticipation_hours') as number) || 24,
    cetysPickupSchedule: {
      days: [1, 2, 3, 4, 5],
      start: '16:00',
      end: '20:00',
    },
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9]">
      <CheckoutForm
        initialProfile={initialProfile}
        deliveryPoints={deliveryPoints}
        storeSettings={storeSettings}
      />
    </div>
  );
}
