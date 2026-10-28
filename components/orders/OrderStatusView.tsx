'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock,
  MapPin,
  Calendar,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  XCircle,
  CreditCard,
  ChefHat,
  PackageCheck,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { getCustomerStatusMeta } from '@/lib/orders/customer-status';
import { derivePaymentStatus } from '@/lib/orders/payment-status';
import { reportCustomerOrderPayment, type BankTransferSettings } from '@/app/actions/orders';
import { OrderPushPrompt } from '@/components/push/OrderPushPrompt';

interface OrderItemOption {
  id: string;
  option_name: string;
  group_name: string;
  quantity: number;
  unit_price_cents: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  options?: OrderItemOption[];
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  products_subtotal_cents: number;
  delivery_fee_cents: number | null;
  total_amount_cents: number;
  amount_paid_cents?: number | null;
  deposit_required_pct?: number | null;
  payment_reported_at?: string | null;
  payment_reference?: string | null;
  payment_reported_amount_cents?: number | null;
  delivery_quote_status: string;
  requested_date: string;
  requested_time: string;
  delivery_name: string;
  delivery_type: string;
  delivery_address: string | null;
  delivery_requires_quote: boolean;
  notes?: string | null;
  delivery_point?: {
    name: string;
    address: string;
    public_reference?: string | null;
    type?: string;
    requires_special_pickup_permission?: boolean;
  } | null;
  items: OrderItem[];
}

export function OrderStatusView({
  order,
  bankSettings,
}: {
  order: OrderData;
  bankSettings?: BankTransferSettings;
}) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Customer reporting form state
  const [referenceInput, setReferenceInput] = useState('');
  const [isReportingPayment, setIsReportingPayment] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Automatic status polling every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 20000);
    return () => clearInterval(interval);
  }, [router]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleCopyClabe = (clabeText: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(clabeText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleReportPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReportingPayment(true);
    setReportError(null);

    try {
      const res = await reportCustomerOrderPayment(order.id, referenceInput);
      if (!res.success) {
        setReportError(res.error || 'No pudimos registrar tu reporte de pago. Intenta de nuevo.');
      } else {
        router.refresh();
      }
    } catch {
      setReportError('Ocurrió un error inesperado al reportar tu pago.');
    } finally {
      setIsReportingPayment(false);
    }
  };

  // Derive authoritative customer & payment statuses
  const statusMeta = getCustomerStatusMeta(order.status);
  const paymentMeta = derivePaymentStatus(
    order.total_amount_cents || order.products_subtotal_cents || 0,
    order.amount_paid_cents || 0,
    order.deposit_required_pct,
    order.payment_reported_at
  );

  const isCetys = order.delivery_type === 'special' || order.delivery_point?.type === 'special';
  const isOther = order.delivery_type === 'other' || order.delivery_point?.type === 'other';
  const isFreeDelivery = !isOther;
  const isDeliveryPending = isOther && order.delivery_quote_status === 'pending';

  const subtotalPesos = Math.round(order.products_subtotal_cents / 100);
  const totalPesos = isDeliveryPending
    ? subtotalPesos
    : Math.round((order.total_amount_cents || order.products_subtotal_cents) / 100);

  // Format date safely for Mexico/Tijuana
  const [year, month, day] = (order.requested_date || '').split('-');
  let formattedDate = order.requested_date;
  if (year && month && day) {
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    formattedDate = dateObj.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  const formattedTime = (order.requested_time || '').slice(0, 5);
  const isNegativeTerminal = statusMeta.isNegative;
  const isApprovedWaitingPayment = order.status === 'deposit_pending';
  const hasReported = Boolean(order.payment_reported_at);
  const isConfigured = Boolean(bankSettings?.isConfigured);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-14 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1] shadow-2xs text-center space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4D5C1]/40 pb-3">
          <span className="font-mono text-xs sm:text-sm font-bold bg-[#FFF9F2] px-3 py-1 rounded-lg border border-[#E4D5C1] text-[#261C19]">
            Pedido {order.order_number}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs text-[#6E564F] hover:text-[#A73832] font-medium transition-colors"
            title="Consultar estado más reciente"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#A73832]' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar estado'}</span>
          </button>
        </div>

        <div className="pt-2 space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FFF9F2] border border-[#E4D5C1] flex items-center justify-center text-3xl">
            {isNegativeTerminal ? '⚠️' : isApprovedWaitingPayment ? '💳' : '🍎'}
          </div>

          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#261C19]">
            {statusMeta.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{statusMeta.badgeLabel}</span>
            </span>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${paymentMeta.badgeClass}`}>
              <CreditCard className="w-3.5 h-3.5" />
              <span>{paymentMeta.label}</span>
            </span>
          </div>

          <p className="max-w-md mx-auto text-xs sm:text-sm text-[#6E564F] leading-relaxed pt-1">
            {statusMeta.description}
          </p>
        </div>
      </div>

      {/* Non-blocking push notification opt-in prompt */}
      <OrderPushPrompt />

      {/* Primary Payment Section when in deposit_pending */}
      {isApprovedWaitingPayment && (
        <div className="space-y-4">
          {!isConfigured ? (
            /* Controlled state when payment instructions are disabled or incomplete */
            <div className="bg-[#FFFBF2] border border-[#FDE68A] p-5 sm:p-6 rounded-2xl flex items-start gap-3.5 shadow-2xs">
              <Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h2 className="font-bold text-sm text-[#92400E]">
                  Instrucciones de pago en preparación
                </h2>
                <p className="text-[#78350F] leading-relaxed">
                  Las instrucciones de pago aún no están disponibles. En breve se habilitarán los datos bancarios para que puedas realizar tu transferencia.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-5 sm:p-7 rounded-2xl space-y-5 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-[#1E3A8A]">
                    PAGO PENDIENTE
                  </h2>
                  <p className="text-xs sm:text-sm text-[#1E40AF] leading-relaxed">
                    Tu pedido fue aprobado. Realiza tu transferencia bancaria con los datos a continuación y repórtala para confirmar tu pedido.
                  </p>
                </div>
              </div>

              {/* Bank Transfer Details Card */}
              <div className="bg-white rounded-xl border border-[#DBEAFE] p-4 sm:p-5 space-y-3.5 text-xs text-[#1E3A8A]">
                <div className="flex justify-between items-baseline border-b border-[#EFF6FF] pb-2">
                  <span className="font-semibold text-[#1E40AF]">Total a pagar:</span>
                  <span className="font-serif font-bold text-xl text-[#1E3A8A]">${totalPesos.toFixed(2)} MXN</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Banco:</span>
                    <span className="font-bold text-[#1E293B]">{bankSettings?.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Titular:</span>
                    <span className="font-bold text-[#1E293B]">{bankSettings?.accountHolder}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pt-1">
                    <span className="text-[#64748B]">CLABE interbancaria:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1E293B] bg-[#F1F5F9] px-2.5 py-1 rounded-md text-xs sm:text-sm">
                        {bankSettings?.clabe}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyClabe(bankSettings?.clabe || '')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2563EB] text-white rounded-md text-xs font-semibold hover:bg-[#1D4ED8] transition-colors"
                      >
                        {isCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#F1F5F9]">
                    <span className="text-[#64748B]">Concepto / Referencia:</span>
                    <span className="font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-md border border-[#BFDBFE]">
                      {order.order_number}
                    </span>
                  </div>
                </div>

                {bankSettings?.instructions && (
                  <p className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#F1F5F9]">
                    {bankSettings.instructions}
                  </p>
                )}
              </div>

              {/* Customer Payment Reporting Flow */}
              {hasReported ? (
                <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl space-y-1.5 text-xs text-[#065F46]">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#065F46]">
                    <Check className="w-4 h-4 text-[#059669]" />
                    <span>Pago reportado · En verificación</span>
                  </div>
                  <p>
                    Reportaste tu pago el{' '}
                    <strong>
                      {new Date(order.payment_reported_at!).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </strong>
                    .{order.payment_reference ? ` Referencia: ${order.payment_reference}.` : ''}
                  </p>
                  <p className="text-[11px] text-[#047857]">
                    Estamos verificando tu depósito para programar la preparación de tu pedido. Esta página se actualizará automáticamente una vez confirmado.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReportPayment} className="bg-white/90 border border-[#DBEAFE] p-4 rounded-xl space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#1E3A8A]">
                    ¿Ya realizaste tu transferencia?
                  </h3>

                  {reportError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{reportError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="referenceInput" className="block text-[11px] font-semibold text-[#1E40AF] mb-1">
                      Referencia o últimos 4 dígitos de tu transferencia (opcional):
                    </label>
                    <input
                      id="referenceInput"
                      type="text"
                      maxLength={50}
                      value={referenceInput}
                      onChange={(e) => setReferenceInput(e.target.value)}
                      placeholder="Ej. 1234 o clave de rastreo"
                      className="w-full px-3 py-2 rounded-lg border border-[#DBEAFE] text-xs font-mono text-[#1E293B] bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isReportingPayment}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isReportingPayment ? 'Enviando reporte...' : 'Ya realicé mi pago'}</span>
                    </button>
                    <p className="text-[10px] text-[#64748B] mt-1.5">
                      Al hacer clic, notificarás a taller que realizaste la transferencia para su verificación.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Banner for other statuses */}
      {order.status === 'pending_approval' ? (
        <div className="bg-[#FFFBF2] border border-[#FDE68A] p-4 sm:p-5 rounded-2xl flex items-start gap-3 text-xs text-[#92400E]">
          <Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Revisión en curso</p>
            <p>
              Estamos revisando tu pedido y confirmando disponibilidad para la fecha solicitada. Esta página se actualizará automáticamente en cuanto sea aprobado.
            </p>
          </div>
        </div>
      ) : order.status === 'confirmed' ? (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-4 sm:p-5 rounded-2xl flex items-start gap-3 text-xs text-[#166534]">
          <Check className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Pedido confirmado</p>
            <p>
              Tu pago fue confirmado y tu pedido quedó programado para preparación en cocina con anticipación para tu fecha y hora.
            </p>
          </div>
        </div>
      ) : order.status === 'preparing' ? (
        <div className="bg-[#FFF7ED] border border-[#FED7AA] p-4 sm:p-5 rounded-2xl flex items-start gap-3 text-xs text-[#9A3412]">
          <ChefHat className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">En preparación en cocina</p>
            <p>
              Estamos preparando tu pedido para que esté listo en la fecha programada.
            </p>
          </div>
        </div>
      ) : order.status === 'ready' ? (
        <div className="bg-[#FAF5FF] border border-[#E9D5FF] p-4 sm:p-5 rounded-2xl flex items-start gap-3 text-xs text-[#6B21A8]">
          <PackageCheck className="w-5 h-5 text-[#9333EA] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">¡Tu pedido está listo!</p>
            <p>
              Tu pedido te espera en tu punto de entrega programado. Preséntate con tu número de pedido {order.order_number}.
            </p>
          </div>
        </div>
      ) : isNegativeTerminal ? (
        <div className="bg-[#FEF2F2] border border-[#FECACA] p-4 sm:p-5 rounded-2xl flex items-start gap-3 text-xs text-[#991B1B]">
          <XCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">{statusMeta.title}</p>
            <p>{statusMeta.description}</p>
          </div>
        </div>
      ) : null}

      {/* Progress Stepper */}
      {!isNegativeTerminal && (
        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E564F]">
            Progreso del pedido
          </h2>

          <div className="grid grid-cols-4 gap-2 text-center pt-2 relative">
            {/* Step 1: Recibido */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                  statusMeta.stepIndex >= 1
                    ? 'bg-[#2D6A4F] text-white'
                    : 'bg-[#FFF9F2] border border-[#E4D5C1] text-[#6E564F]'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className={`text-[10px] sm:text-xs font-bold ${statusMeta.stepIndex >= 1 ? 'text-[#2D6A4F]' : 'text-[#6E564F]'}`}>
                Recibido
              </span>
            </div>

            {/* Step 2: Por pagar / Confirmado */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                  order.status === 'deposit_pending'
                    ? 'bg-[#2563EB] text-white ring-4 ring-[#2563EB]/20 animate-pulse'
                    : statusMeta.stepIndex >= 2
                    ? 'bg-[#2D6A4F] text-white'
                    : 'bg-[#FFF9F2] border border-[#E4D5C1] text-[#6E564F]'
                }`}
              >
                {statusMeta.stepIndex > 2 || order.status === 'confirmed' ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>2</span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-bold ${
                  order.status === 'deposit_pending'
                    ? 'text-[#2563EB]'
                    : statusMeta.stepIndex >= 2
                    ? 'text-[#2D6A4F]'
                    : 'text-[#6E564F]'
                }`}
              >
                {order.status === 'deposit_pending' ? 'Por pagar' : 'Confirmado'}
              </span>
            </div>

            {/* Step 3: Cocina */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                  order.status === 'preparing'
                    ? 'bg-[#EA580C] text-white ring-4 ring-[#EA580C]/20 animate-pulse'
                    : statusMeta.stepIndex >= 3
                    ? 'bg-[#2D6A4F] text-white'
                    : 'bg-[#FFF9F2] border border-[#E4D5C1] text-[#6E564F]'
                }`}
              >
                {statusMeta.stepIndex > 3 ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>3</span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-bold ${
                  order.status === 'preparing'
                    ? 'text-[#EA580C]'
                    : statusMeta.stepIndex >= 3
                    ? 'text-[#2D6A4F]'
                    : 'text-[#6E564F]'
                }`}
              >
                Cocina
              </span>
            </div>

            {/* Step 4: Entrega */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                  order.status === 'ready'
                    ? 'bg-[#9333EA] text-white ring-4 ring-[#9333EA]/20 animate-pulse'
                    : order.status === 'delivered'
                    ? 'bg-[#2D6A4F] text-white'
                    : 'bg-[#FFF9F2] border border-[#E4D5C1] text-[#6E564F]'
                }`}
              >
                {order.status === 'delivered' ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>4</span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-bold ${
                  order.status === 'ready'
                    ? 'text-[#9333EA]'
                    : order.status === 'delivered'
                    ? 'text-[#2D6A4F]'
                    : 'text-[#6E564F]'
                }`}
              >
                {order.status === 'delivered' ? 'Entregado' : 'Listo'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Details Card */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-5">
        <h2 className="font-serif font-bold text-base sm:text-lg text-[#261C19] border-b border-[#E4D5C1]/60 pb-3">
          Detalles de entrega
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#261C19]">
              <Calendar className="w-3.5 h-3.5 text-[#A73832]" />
              <span>Fecha y hora programada</span>
            </div>
            <p className="text-[#6E564F] capitalize">{formattedDate}</p>
            <p className="text-[#261C19] font-bold">{formattedTime} hrs (Tijuana)</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#261C19]">
              <MapPin className="w-3.5 h-3.5 text-[#A73832]" />
              <span>Punto o modalidad de entrega</span>
            </div>
            <p className="font-medium text-[#261C19]">
              {order.delivery_name || order.delivery_point?.name || 'Entrega a domicilio'}
            </p>
            {order.delivery_address || order.delivery_point?.address || order.delivery_point?.public_reference ? (
              <p className="text-[#6E564F]">
                {order.delivery_address || order.delivery_point?.address || order.delivery_point?.public_reference}
              </p>
            ) : order.status === 'pending_approval' ? (
              <p className="italic text-[#A75D28]">Por confirmar</p>
            ) : null}
          </div>
        </div>

        {order.notes && (
          <div className="p-3 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1]/60 text-xs space-y-1">
            <span className="font-bold text-[#261C19]">Notas de tu pedido:</span>
            <p className="text-[#6E564F] italic">{order.notes}</p>
          </div>
        )}

        {/* Products List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E564F]">
            Productos solicitados ({order.items.length})
          </h3>
          <div className="divide-y divide-[#E4D5C1]/60 border border-[#E4D5C1] rounded-xl overflow-hidden">
            {order.items.map((item) => (
              <div key={item.id} className="p-3.5 sm:p-4 flex items-start justify-between gap-4 bg-white">
                <div className="space-y-1 min-w-0">
                  <p className="font-serif font-bold text-sm text-[#261C19]">
                    {item.quantity}× {item.product_name}
                  </p>
                  {item.options && item.options.length > 0 && (
                    <ul className="text-[11px] text-[#6E564F] space-y-0.5">
                      {item.options.map((opt) => (
                        <li key={opt.id}>
                          • <span className="font-medium text-[#261C19]">{opt.option_name}</span>
                          {opt.quantity > 1 ? ` ×${opt.quantity}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="font-bold text-sm text-[#261C19] shrink-0">
                  ${Math.round(item.subtotal_cents / 100)} MXN
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="pt-3 border-t border-[#E4D5C1]/60 space-y-2 text-xs">
          <div className="flex justify-between text-[#6E564F]">
            <span>Subtotal de productos</span>
            <span className="font-bold text-[#261C19]">${subtotalPesos} MXN</span>
          </div>

          <div className="flex justify-between items-center text-[#6E564F]">
            <span>Costo de entrega</span>
            {isCetys ? (
              <span className="font-bold text-[#2D6A4F]">Sin costo ($0 MXN)</span>
            ) : isDeliveryPending ? (
              <span className="italic text-[#A75D28] font-medium">Por confirmar</span>
            ) : isFreeDelivery ? (
              <span className="font-bold text-[#2D6A4F]">Sin costo de entrega</span>
            ) : (
              <span className="font-bold text-[#261C19]">
                ${Math.round((order.delivery_fee_cents || 0) / 100)} MXN
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-[#E4D5C1]/60 flex justify-between items-baseline">
            <span className="text-sm font-bold text-[#261C19]">Total</span>
            <span className="font-serif font-bold text-xl text-[#A73832]">
              ${totalPesos} MXN
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1] space-y-1 text-xs">
            <div className="flex justify-between text-[#6E564F]">
              <span>Monto pagado confirmado:</span>
              <span className="font-bold text-[#261C19]">${paymentMeta.amountPaidPesos.toFixed(2)} MXN</span>
            </div>
            <div className="flex justify-between text-[#6E564F]">
              <span>Saldo restante por liquidar:</span>
              <span className={`font-bold ${paymentMeta.remainingPesos > 0 ? 'text-[#A73832]' : 'text-[#2D6A4F]'}`}>
                ${paymentMeta.remainingPesos.toFixed(2)} MXN
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/productos"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-[#A73832] hover:bg-[#8e2e28] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs text-center"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ver más productos</span>
          </Link>

          <Link
            href="/mi-cuenta"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-[#E4D5C1] hover:border-[#A73832] text-[#261C19] hover:text-[#A73832] bg-[#FFF9F2] text-xs font-bold uppercase tracking-wider transition-colors text-center"
          >
            <span>Ir a Mis pedidos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
