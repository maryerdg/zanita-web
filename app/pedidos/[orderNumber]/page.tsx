import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/app/actions/supabase-server';
import { OrderStatusView } from '@/components/orders/OrderStatusView';

interface PageProps {
  params: Promise<{
    orderNumber: string;
  }>;
}

export default async function OrderPage({ params }: PageProps) {
  const { orderNumber } = await params;

  if (!orderNumber || typeof orderNumber !== 'string') {
    notFound();
  }

  const supabase = await createClient();

  // 1. Auth Guard: Require logged-in customer
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/iniciar-sesion?next=/pedidos/${encodeURIComponent(orderNumber)}`);
  }

  // 2. Fetch order via authenticated client (RLS enforces that user only sees their own orders)
  const { data: order, error } = await supabase
    .from('zanita_orders')
    .select(`
      id,
      order_number,
      status,
      products_subtotal_cents,
      delivery_fee_cents,
      total_amount_cents,
      delivery_quote_status,
      requested_date,
      requested_time,
      delivery_address:delivery_address_snapshot,
      delivery_name:delivery_name_snapshot,
      delivery_type:delivery_type_snapshot,
      delivery_requires_quote:delivery_requires_quote_snapshot,
      user_id,
      delivery_point:zanita_delivery_points(
        name,
        address,
        type,
        requires_special_pickup_permission
      ),
      items:zanita_order_items(
        id,
        product_name:product_name_snapshot,
        quantity,
        unit_price_cents:final_unit_price_snapshot_cents,
        subtotal_cents,
        options:zanita_order_item_options(
          id,
          option_name:option_name_snapshot,
          group_name:group_name_snapshot,
          quantity,
          unit_price_cents:additional_price_snapshot_cents
        )
      )
    `)
    .eq('order_number', orderNumber)
    .maybeSingle();

  // 3. RLS / Ownership verification: Return 404 if order does not exist or doesn't belong to user
  if (error || !order || order.user_id !== user.id) {
    notFound();
  }

  // Format delivery point (prefer current point or fallback to snapshot)
  const dpRaw = Array.isArray(order.delivery_point)
    ? order.delivery_point[0] || null
    : order.delivery_point;

  const formattedOrder = {
    ...order,
    delivery_point: dpRaw || {
      name: order.delivery_name || 'Punto de entrega',
      address: order.delivery_address || '',
      type: order.delivery_type || 'standard',
      requires_special_pickup_permission: order.delivery_type === 'special',
    },
    items: order.items || [],
  };

  return <OrderStatusView order={formattedOrder} />;
}
