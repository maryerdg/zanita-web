import React from 'react';
import { getAdminOrdersList } from '@/app/actions/admin-orders';
import { OrdersClient } from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const resolvedParams = await searchParams;
  const initialFilter = resolvedParams?.filter || 'hoy';
  const { orders = [], error } = await getAdminOrdersList(initialFilter);

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded-2xl border border-red-200 text-red-800 text-sm">
        <p className="font-semibold">Error al cargar pedidos</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  return <OrdersClient initialOrders={orders} initialFilter={initialFilter} />;
}
