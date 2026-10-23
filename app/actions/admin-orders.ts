'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdminCaller } from './admin';
import { getTijuanaDateString } from '@/lib/time/tijuana';
import type { CanonicalOrderStatus } from '@/lib/orders/operational-status';
import { validateOrderTransition } from '@/lib/orders/transitions';

export interface AdminOrderItemOptionDetail {
  id: string;
  option_name_snapshot: string;
  group_name_snapshot: string;
  additional_price_snapshot_cents: number;
  quantity: number;
}

export interface AdminOrderItemDetail {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  base_unit_price_snapshot_cents: number;
  final_unit_price_snapshot_cents: number;
  subtotal_cents: number;
  options: AdminOrderItemOptionDetail[];
}

interface RawOrderItemOptionRow {
  id: string;
  option_name_snapshot: string;
  group_name_snapshot: string;
  additional_price_snapshot_cents: number;
  quantity: number;
}

interface RawOrderItemRow {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  base_unit_price_snapshot_cents: number;
  final_unit_price_snapshot_cents: number;
  subtotal_cents: number;
  options?: RawOrderItemOptionRow[];
}

interface RawOrderRow {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: CanonicalOrderStatus;
  customer_name_snapshot: string;
  customer_phone_snapshot: string;
  customer_email_snapshot: string;
  products_subtotal_cents: number;
  delivery_fee_cents: number | null;
  total_amount_cents: number;
  amount_paid_cents: number;
  deposit_required_pct: number | null;
  requested_date: string;
  requested_time: string;
  delivery_point_id: string | null;
  delivery_name_snapshot: string;
  delivery_type_snapshot: string;
  delivery_mode_snapshot: string | null;
  delivery_address_snapshot: string | null;
  delivery_requires_quote_snapshot: boolean;
  delivery_quote_status: string;
  notes: string | null;
  items?: RawOrderItemRow[];
}

export interface AdminOrderListItem {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: CanonicalOrderStatus;
  customer_name_snapshot: string;
  customer_phone_snapshot: string;
  customer_email_snapshot: string;
  products_subtotal_cents: number;
  delivery_fee_cents: number | null;
  total_amount_cents: number;
  amount_paid_cents: number;
  deposit_required_pct: number | null;
  requested_date: string;
  requested_time: string;
  delivery_point_id: string | null;
  delivery_name_snapshot: string;
  delivery_type_snapshot: string;
  delivery_mode_snapshot: string | null;
  delivery_address_snapshot: string | null;
  delivery_requires_quote_snapshot: boolean;
  delivery_quote_status: string;
  notes: string | null;
  items_count: number;
  items_summary: string;
  items: AdminOrderItemDetail[];
}

export interface TodayOperationSummary {
  tijuanaDate: string;
  ordersTodayCount: number;
  pendingApprovalCount: number;
  toPrepareCount: number;
  readyCount: number;
  scheduledTotalCentsToday: number;
}

/**
 * Retrieves operational metrics for Today in Tijuana.
 */
export async function getAdminTodayOperationSummary(): Promise<{
  summary?: TodayOperationSummary;
  error?: string;
}> {
  const auth = await verifyAdminCaller();
  if (auth.error || !auth.supabase) return { error: auth.error || 'No autorizado' };

  try {
    const tijuanaToday = getTijuanaDateString();

    // Query active orders relevant to today or pending attention
    const { data: orders, error } = await auth.supabase
      .from('zanita_orders')
      .select('id, status, requested_date, total_amount_cents')
      .not('status', 'in', '("cancelled","rejected")');

    if (error) {
      console.error('Error fetching today operation summary:', error);
      return { error: 'Error al consultar operaciones del día' };
    }

    const allActive = orders || [];
    const todayOrders = allActive.filter((o) => o.requested_date === tijuanaToday);

    const ordersTodayCount = todayOrders.length;
    const toPrepareCount = allActive.filter(
      (o) => o.status === 'confirmed' && o.requested_date <= tijuanaToday
    ).length;
    const readyCount = todayOrders.filter((o) => o.status === 'ready').length;

    // Pending approval orders need attention regardless of fulfillment date
    const { count: pendingApprovalCount, error: pendingErr } = await auth.supabase
      .from('zanita_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_approval');

    if (pendingErr) {
      console.error('Error fetching pending approval count:', pendingErr);
    }

    const scheduledTotalCentsToday = todayOrders.reduce(
      (sum, o) => sum + (o.total_amount_cents || 0),
      0
    );

    return {
      summary: {
        tijuanaDate: tijuanaToday,
        ordersTodayCount,
        pendingApprovalCount: pendingApprovalCount || 0,
        toPrepareCount,
        readyCount,
        scheduledTotalCentsToday,
      },
    };
  } catch (err: unknown) {
    console.error('getAdminTodayOperationSummary exception:', err);
    return { error: 'Error inesperado al cargar resumen de operaciones' };
  }
}

/**
 * Retrieves the operational orders list with details, sorted for optimal workflow.
 */
export async function getAdminOrdersList(filter: string = 'hoy'): Promise<{
  orders?: AdminOrderListItem[];
  error?: string;
}> {
  const auth = await verifyAdminCaller();
  if (auth.error || !auth.supabase) return { error: auth.error || 'No autorizado' };

  try {
    const tijuanaToday = getTijuanaDateString();

    let query = auth.supabase.from('zanita_orders').select(`
      id,
      order_number,
      created_at,
      updated_at,
      status,
      customer_name_snapshot,
      customer_phone_snapshot,
      customer_email_snapshot,
      products_subtotal_cents,
      delivery_fee_cents,
      total_amount_cents,
      amount_paid_cents,
      deposit_required_pct,
      requested_date,
      requested_time,
      delivery_point_id,
      delivery_name_snapshot,
      delivery_type_snapshot,
      delivery_mode_snapshot,
      delivery_address_snapshot,
      delivery_requires_quote_snapshot,
      delivery_quote_status,
      notes,
      items:zanita_order_items(
        id,
        product_name_snapshot,
        quantity,
        base_unit_price_snapshot_cents,
        final_unit_price_snapshot_cents,
        subtotal_cents,
        options:zanita_order_item_options(
          id,
          option_name_snapshot,
          group_name_snapshot,
          additional_price_snapshot_cents,
          quantity
        )
      )
    `);

    // Apply filtering
    if (filter === 'hoy') {
      query = query
        .eq('requested_date', tijuanaToday)
        .not('status', 'in', '("cancelled","rejected")');
    } else if (filter === 'por_aprobar') {
      query = query.eq('status', 'pending_approval');
    } else if (filter === 'por_preparar') {
      query = query.eq('status', 'confirmed');
    } else if (filter === 'listos') {
      query = query.eq('status', 'ready');
    } else if (filter === 'proximos') {
      query = query
        .gt('requested_date', tijuanaToday)
        .not('status', 'in', '("cancelled","rejected","delivered")');
    } else if (filter === 'completados') {
      query = query.eq('status', 'delivered');
    }
    // 'todos' applies no status/date filter

    // Order by priority: attention (pending_approval) first, then chronological requested_date / requested_time
    const { data, error } = await query
      .order('requested_date', { ascending: true })
      .order('requested_time', { ascending: true });

    if (error) {
      console.error('Error fetching admin orders list:', error);
      return { error: 'Error al consultar lista de pedidos' };
    }

    const formatted: AdminOrderListItem[] = ((data as unknown as RawOrderRow[]) || []).map((row: RawOrderRow) => {
      const itemsList: AdminOrderItemDetail[] = (row.items || []).map((it: RawOrderItemRow) => ({
        id: it.id,
        product_name_snapshot: it.product_name_snapshot,
        quantity: it.quantity,
        base_unit_price_snapshot_cents: it.base_unit_price_snapshot_cents,
        final_unit_price_snapshot_cents: it.final_unit_price_snapshot_cents,
        subtotal_cents: it.subtotal_cents,
        options: (it.options || []).map((opt: RawOrderItemOptionRow) => ({
          id: opt.id,
          option_name_snapshot: opt.option_name_snapshot,
          group_name_snapshot: opt.group_name_snapshot,
          additional_price_snapshot_cents: opt.additional_price_snapshot_cents,
          quantity: opt.quantity,
        })),
      }));

      const itemsCount = itemsList.reduce((acc, it) => acc + it.quantity, 0);
      const itemsSummary = itemsList
        .map((it) => `${it.quantity}x ${it.product_name_snapshot}`)
        .join(', ');

      return {
        id: row.id,
        order_number: row.order_number,
        created_at: row.created_at,
        updated_at: row.updated_at,
        status: row.status as CanonicalOrderStatus,
        customer_name_snapshot: row.customer_name_snapshot,
        customer_phone_snapshot: row.customer_phone_snapshot,
        customer_email_snapshot: row.customer_email_snapshot,
        products_subtotal_cents: row.products_subtotal_cents,
        delivery_fee_cents: row.delivery_fee_cents,
        total_amount_cents: row.total_amount_cents,
        amount_paid_cents: row.amount_paid_cents,
        deposit_required_pct: row.deposit_required_pct,
        requested_date: row.requested_date,
        requested_time: row.requested_time,
        delivery_point_id: row.delivery_point_id,
        delivery_name_snapshot: row.delivery_name_snapshot,
        delivery_type_snapshot: row.delivery_type_snapshot,
        delivery_mode_snapshot: row.delivery_mode_snapshot,
        delivery_address_snapshot: row.delivery_address_snapshot,
        delivery_requires_quote_snapshot: row.delivery_requires_quote_snapshot,
        delivery_quote_status: row.delivery_quote_status,
        notes: row.notes,
        items_count: itemsCount,
        items_summary: itemsSummary,
        items: itemsList,
      };
    });

    // Custom sorting: If viewing 'hoy' or 'todos', hoist 'pending_approval' to the top
    if (filter === 'hoy' || filter === 'todos') {
      formatted.sort((a, b) => {
        if (a.status === 'pending_approval' && b.status !== 'pending_approval') return -1;
        if (a.status !== 'pending_approval' && b.status === 'pending_approval') return 1;
        if (a.requested_date !== b.requested_date) {
          return a.requested_date.localeCompare(b.requested_date);
        }
        return a.requested_time.localeCompare(b.requested_time);
      });
    }

    return { orders: formatted };
  } catch (err: unknown) {
    console.error('getAdminOrdersList exception:', err);
    return { error: 'Error inesperado al recuperar los pedidos' };
  }
}

/**
 * Retrieves deep detail for a single order by order_number.
 */
export async function getAdminOrderDetail(orderNumber: string): Promise<{
  order?: AdminOrderListItem;
  error?: string;
}> {
  const auth = await verifyAdminCaller();
  if (auth.error || !auth.supabase) return { error: auth.error || 'No autorizado' };

  try {
    const { data, error } = await auth.supabase
      .from('zanita_orders')
      .select(`
        id,
        order_number,
        created_at,
        updated_at,
        status,
        customer_name_snapshot,
        customer_phone_snapshot,
        customer_email_snapshot,
        products_subtotal_cents,
        delivery_fee_cents,
        total_amount_cents,
        amount_paid_cents,
        deposit_required_pct,
        requested_date,
        requested_time,
        delivery_point_id,
        delivery_name_snapshot,
        delivery_type_snapshot,
        delivery_mode_snapshot,
        delivery_address_snapshot,
        delivery_requires_quote_snapshot,
        delivery_quote_status,
        notes,
        items:zanita_order_items(
          id,
          product_name_snapshot,
          quantity,
          base_unit_price_snapshot_cents,
          final_unit_price_snapshot_cents,
          subtotal_cents,
          options:zanita_order_item_options(
            id,
            option_name_snapshot,
            group_name_snapshot,
            additional_price_snapshot_cents,
            quantity
          )
        )
      `)
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error || !data) {
      return { error: 'Pedido no encontrado' };
    }

    const raw = data as unknown as RawOrderRow;
    const itemsList: AdminOrderItemDetail[] = (raw.items || []).map((it: RawOrderItemRow) => ({
      id: it.id,
      product_name_snapshot: it.product_name_snapshot,
      quantity: it.quantity,
      base_unit_price_snapshot_cents: it.base_unit_price_snapshot_cents,
      final_unit_price_snapshot_cents: it.final_unit_price_snapshot_cents,
      subtotal_cents: it.subtotal_cents,
      options: (it.options || []).map((opt: RawOrderItemOptionRow) => ({
        id: opt.id,
        option_name_snapshot: opt.option_name_snapshot,
        group_name_snapshot: opt.group_name_snapshot,
        additional_price_snapshot_cents: opt.additional_price_snapshot_cents,
        quantity: opt.quantity,
      })),
    }));

    const itemsCount = itemsList.reduce((acc, it) => acc + it.quantity, 0);
    const itemsSummary = itemsList
      .map((it) => `${it.quantity}x ${it.product_name_snapshot}`)
      .join(', ');

    return {
      order: {
        id: data.id,
        order_number: data.order_number,
        created_at: data.created_at,
        updated_at: data.updated_at,
        status: data.status as CanonicalOrderStatus,
        customer_name_snapshot: data.customer_name_snapshot,
        customer_phone_snapshot: data.customer_phone_snapshot,
        customer_email_snapshot: data.customer_email_snapshot,
        products_subtotal_cents: data.products_subtotal_cents,
        delivery_fee_cents: data.delivery_fee_cents,
        total_amount_cents: data.total_amount_cents,
        amount_paid_cents: data.amount_paid_cents,
        deposit_required_pct: data.deposit_required_pct,
        requested_date: data.requested_date,
        requested_time: data.requested_time,
        delivery_point_id: data.delivery_point_id,
        delivery_name_snapshot: data.delivery_name_snapshot,
        delivery_type_snapshot: data.delivery_type_snapshot,
        delivery_mode_snapshot: data.delivery_mode_snapshot,
        delivery_address_snapshot: data.delivery_address_snapshot,
        delivery_requires_quote_snapshot: data.delivery_requires_quote_snapshot,
        delivery_quote_status: data.delivery_quote_status,
        notes: data.notes,
        items_count: itemsCount,
        items_summary: itemsSummary,
        items: itemsList,
      },
    };
  } catch (err: unknown) {
    console.error('getAdminOrderDetail exception:', err);
    return { error: 'Error al consultar detalle del pedido' };
  }
}

/**
 * Authoritatively executes an order lifecycle transition with server-side validation.
 */
export async function adminUpdateOrderStatus(
  orderId: string,
  requestedStatus: CanonicalOrderStatus
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyAdminCaller();
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' };

  try {
    // 1. Fetch current order state
    const { data: order, error: fetchErr } = await auth.supabase
      .from('zanita_orders')
      .select('id, status, total_amount_cents, amount_paid_cents, deposit_required_pct, order_number')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return { success: false, error: 'Pedido no encontrado' };
    }

    const currentStatus = order.status as CanonicalOrderStatus;

    // 2. Validate transition through authoritative engine
    const validation = validateOrderTransition(currentStatus, requestedStatus, {
      totalAmountCents: order.total_amount_cents,
      amountPaidCents: order.amount_paid_cents,
      depositRequiredPct: order.deposit_required_pct,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 3. Mutate order status in DB
    const { error: updateErr } = await auth.supabase
      .from('zanita_orders')
      .update({
        status: requestedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateErr) {
      console.error('Error updating order status:', updateErr);
      return { success: false, error: 'Error en base de datos al actualizar estado' };
    }

    // 4. Revalidate cache
    revalidatePath('/admin');
    revalidatePath('/admin/pedidos');
    if (order.order_number) {
      revalidatePath(`/pedidos/${order.order_number}`);
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('adminUpdateOrderStatus exception:', err);
    return { success: false, error: 'Error inesperado al procesar la acción' };
  }
}
