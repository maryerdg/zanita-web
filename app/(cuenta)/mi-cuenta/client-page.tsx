'use client';

import React from 'react';
import Link from 'next/link';
import { signOut, updateProfile } from '@/app/actions/auth';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Calendar,
  MapPin,
  ArrowRight,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { getCustomerStatusMeta } from '@/lib/orders/customer-status';
import { derivePaymentStatus } from '@/lib/orders/payment-status';

export interface CustomerOrderListItem {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount_cents: number;
  amount_paid_cents?: number | null;
  deposit_required_pct?: number | null;
  payment_reported_at?: string | null;
  payment_reference?: string | null;
  payment_reported_amount_cents?: number | null;
  requested_date: string;
  requested_time: string;
  delivery_name_snapshot: string;
  delivery_type_snapshot: string;
}

type ProfileData = {
  email?: string;
  full_name?: string;
  phone?: string;
  [key: string]: unknown;
};

function SubmitProfileButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto px-6 py-2.5 bg-[#A73832] text-white rounded-md text-sm font-medium hover:bg-[#8e2e28] transition-colors disabled:opacity-50"
    >
      {pending ? 'Guardando...' : 'Guardar Cambios'}
    </button>
  );
}

export default function MiCuentaClient({
  profile,
  orders = [],
}: {
  profile: ProfileData;
  orders?: CustomerOrderListItem[];
}) {
  const [, signOutAction] = useActionState(
    signOut as unknown as (prevState: unknown, formData: FormData) => Promise<unknown>,
    null
  );
  const [profileState, profileAction] = useActionState(updateProfile, null);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  return (
    <div className="min-h-screen bg-[#FFFBF8] pt-28 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 grid md:grid-cols-12 gap-8">
        {/* Sidebar / Menu */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8DCC4]/40">
            <h1 className="text-2xl font-serif text-[#6E564F] mb-1">Mi Cuenta</h1>
            <p className="text-sm text-[#261C19] opacity-70 mb-6 truncate">{profile?.email}</p>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between ${
                  activeTab === 'orders'
                    ? 'bg-[#F4E9D8] text-[#261C19]'
                    : 'hover:bg-[#F4E9D8]/50 text-[#6E564F]'
                }`}
              >
                <span>Mis pedidos</span>
                {orders.length > 0 && (
                  <span className="text-xs bg-[#A73832] text-white px-2 py-0.5 rounded-full font-bold">
                    {orders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-[#F4E9D8] text-[#261C19]'
                    : 'hover:bg-[#F4E9D8]/50 text-[#6E564F]'
                }`}
              >
                Mis Datos
              </button>
            </nav>

            <form action={signOutAction} className="mt-8 pt-6 border-t border-[#E8DCC4]/40">
              <button type="submit" className="text-sm text-[#D95F52] font-medium hover:underline">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-8 space-y-6">
          {activeTab === 'orders' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#E8DCC4]/40 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E8DCC4]/40 pb-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#261C19]">Mis pedidos</h2>
                  <p className="text-xs text-[#6E564F]">
                    Consulta el estado de aprobación, pago y entrega de tus pedidos.
                  </p>
                </div>
                <Link
                  href="/productos"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#A73832] font-bold hover:underline"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Nuevo pedido</span>
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF9F2] border border-[#E4D5C1] flex items-center justify-center text-xl">
                    🛍️
                  </div>
                  <p className="text-sm text-[#6E564F]">Aún no tienes pedidos registrados.</p>
                  <Link
                    href="/productos"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#A73832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#8e2e28] transition-colors shadow-2xs"
                  >
                    <span>Ver catálogo de productos</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => {
                    const statusMeta = getCustomerStatusMeta(o.status);
                    const paymentMeta = derivePaymentStatus(
                      o.total_amount_cents || 0,
                      o.amount_paid_cents || 0,
                      o.deposit_required_pct,
                      o.payment_reported_at
                    );

                    // Format date safely
                    const [year, month, day] = (o.requested_date || '').split('-');
                    let formattedDate = o.requested_date;
                    if (year && month && day) {
                      const dateObj = new Date(
                        parseInt(year, 10),
                        parseInt(month, 10) - 1,
                        parseInt(day, 10)
                      );
                      formattedDate = dateObj.toLocaleDateString('es-MX', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      });
                    }
                    const formattedTime = (o.requested_time || '').slice(0, 5);
                    const totalPesos = (o.total_amount_cents / 100).toFixed(2);
                    const isWaitingPayment = o.status === 'deposit_pending';
                    const hasReported = Boolean(o.payment_reported_at);

                    // Determine canonical CTA text and style
                    let ctaText = 'Ver seguimiento';
                    let isPrimaryCta = false;

                    if (o.status === 'pending_approval') {
                      ctaText = 'Ver seguimiento';
                    } else if (isWaitingPayment) {
                      if (!hasReported) {
                        ctaText = 'Pagar pedido';
                        isPrimaryCta = true;
                      } else {
                        ctaText = 'Pago en verificación';
                      }
                    } else if (['confirmed', 'preparing', 'ready'].includes(o.status)) {
                      ctaText = 'Ver seguimiento';
                    } else if (o.status === 'delivered') {
                      ctaText = 'Ver pedido';
                    }

                    return (
                      <div
                        key={o.id}
                        className={`p-4 sm:p-5 rounded-xl border transition-all ${
                          isWaitingPayment && !hasReported
                            ? 'border-[#BFDBFE] bg-[#F8FAFC]'
                            : hasReported && isWaitingPayment
                            ? 'border-[#A7F3D0] bg-[#F0FDF4]'
                            : 'border-[#E4D5C1]/70 bg-white hover:border-[#A73832]/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E8DCC4]/30 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#261C19] bg-[#FFF9F2] px-2.5 py-1 rounded-md border border-[#E4D5C1]">
                              {o.order_number}
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusMeta.badgeClass}`}>
                              {statusMeta.badgeLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${paymentMeta.badgeClass}`}>
                              <CreditCard className="w-3 h-3 inline mr-1" />
                              {paymentMeta.label}
                            </span>
                            <span className="font-serif font-bold text-sm text-[#A73832]">
                              ${totalPesos} MXN
                            </span>
                          </div>
                        </div>

                        {/* Order Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#6E564F] pt-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#A73832] shrink-0" />
                            <span>
                              Entrega: <strong className="text-[#261C19] capitalize">{formattedDate}</strong> a las{' '}
                              <strong className="text-[#261C19]">{formattedTime} hrs</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#A73832] shrink-0" />
                            <span className="truncate">
                              Punto: <strong className="text-[#261C19]">{o.delivery_name_snapshot || 'Punto de entrega'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Next Action Callout & Link */}
                        <div className="mt-3 pt-3 border-t border-[#E8DCC4]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <p className="text-xs text-[#6E564F]">
                            {isWaitingPayment && !hasReported ? (
                              <span className="font-bold text-[#1E40AF]">
                                ⚠️ Pedido aprobado. Realiza tu transferencia para confirmar.
                              </span>
                            ) : isWaitingPayment && hasReported ? (
                              <span className="font-bold text-[#065F46]">
                                ✅ Pago reportado. En verificación por taller.
                              </span>
                            ) : (
                              statusMeta.nextStepText
                            )}
                          </p>

                          <Link
                            href={`/pedidos/${encodeURIComponent(o.order_number)}`}
                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                              isPrimaryCta
                                ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-2xs'
                                : 'bg-[#FFF9F2] text-[#261C19] border border-[#E4D5C1] hover:border-[#A73832] hover:text-[#A73832]'
                            }`}
                          >
                            <span>{ctaText}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#E8DCC4]/40 space-y-6">
              <h2 className="text-xl font-serif font-bold text-[#261C19] border-b border-[#E8DCC4]/40 pb-3">
                Mis Datos
              </h2>

              {profileState?.success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">{profileState.success}</p>
                </div>
              )}
              {profileState?.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-[#A73832]">{profileState.error}</p>
                </div>
              )}

              <form action={profileAction} className="space-y-5 max-w-md">
                <div>
                  <label className="block text-xs text-[#6E564F] mb-1">Nombre completo</label>
                  <input
                    name="full_name"
                    type="text"
                    defaultValue={profile?.full_name || ''}
                    required
                    className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6E564F] mb-1">Teléfono</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={profile?.phone || ''}
                    required
                    className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6E564F] mb-1">Correo electrónico</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={profile?.email || ''}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-[#E4D5C1] bg-gray-50 opacity-70 rounded-md text-sm text-[#261C19] cursor-not-allowed"
                  />
                </div>
                <div className="pt-2">
                  <SubmitProfileButton />
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
