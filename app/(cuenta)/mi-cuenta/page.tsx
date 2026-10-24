import { createClient } from '@/app/actions/supabase-server';
import { redirect } from 'next/navigation';
import MiCuentaClient, { type CustomerOrderListItem } from './client-page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MiCuentaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/iniciar-sesion');
  }

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('zanita_orders')
      .select(`
        id,
        order_number,
        created_at,
        status,
        total_amount_cents,
        amount_paid_cents,
        deposit_required_pct,
        payment_reported_at,
        payment_reference,
        payment_reported_amount_cents,
        requested_date,
        requested_time,
        delivery_name_snapshot,
        delivery_type_snapshot
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <MiCuentaClient
      profile={profile || {}}
      orders={(orders as CustomerOrderListItem[]) || []}
    />
  );
}
