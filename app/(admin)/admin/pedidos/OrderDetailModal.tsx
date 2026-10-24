'use client';

import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Sparkles,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import type { AdminOrderListItem } from '@/app/actions/admin-orders';
import {
  adminUpdateOrderStatus,
  adminRecordOrderPayment,
  adminConfirmPaymentAndOrder,
} from '@/app/actions/admin-orders';
import type { CanonicalOrderStatus } from '@/lib/orders/operational-status';
import { getOperationalStatusMeta } from '@/lib/orders/operational-status';
import { derivePaymentStatus } from '@/lib/orders/payment-status';
import { formatDateLong, formatTimeShort } from '@/lib/time/tijuana';
import { calculateRequiredDepositCents } from '@/lib/orders/transitions';

interface OrderDetailModalProps {
  order: AdminOrderListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onStatusUpdated,
}: OrderDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Payment confirmation form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  if (!isOpen || !order) return null;

  const statusMeta = getOperationalStatusMeta(order.status);
  const paymentMeta = derivePaymentStatus(
    order.total_amount_cents,
    order.amount_paid_cents,
    order.deposit_required_pct,
    order.payment_reported_at
  );

  const requiredDepositCents = calculateRequiredDepositCents(
    order.total_amount_cents,
    order.deposit_required_pct
  );
  const isPaymentThresholdMet = order.amount_paid_cents >= requiredDepositCents;

  const handleAction = async (nextStatus: CanonicalOrderStatus) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const res = await adminUpdateOrderStatus(order.id, nextStatus);
      if (!res.success) {
        setActionError(res.error || 'No se pudo actualizar el estado');
      } else {
        onStatusUpdated?.();
        onClose();
      }
    } catch {
      setActionError('Error de red al actualizar el pedido');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePayment = async (amountInPesos: number) => {
    setIsSavingPayment(true);
    setActionError(null);
    try {
      const res =
        order.status === 'deposit_pending'
          ? await adminConfirmPaymentAndOrder(order.id, amountInPesos)
          : await adminRecordOrderPayment(order.id, amountInPesos);
      if (!res.success) {
        setActionError(res.error || 'No se pudo registrar el pago');
      } else {
        setShowPaymentForm(false);
        onStatusUpdated?.();
        if (order.status === 'deposit_pending') {
          onClose();
        }
      }
    } catch {
      setActionError('Error de red al registrar el pago');
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-[#E8DCC4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F2ECE1] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-mono text-base font-bold text-[#261C19]">
              {order.order_number}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusMeta.dotClass}`} />
              {statusMeta.label}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${paymentMeta.badgeClass}`}
            >
              {paymentMeta.label}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6E564F] hover:bg-[#F2ECE1] transition-colors"
            aria-label="Cerrar detalle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#261C19]">
          {/* Action error banner */}
          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Attention Banner if customer reported payment */}
          {order.payment_reported_at && order.amount_paid_cents < order.total_amount_cents && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Pago Reportado por el Cliente
                </span>
                <span className="text-[11px] text-blue-700 font-mono">
                  {new Date(order.payment_reported_at).toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-900">
                <p>
                  <strong>Referencia / Dígitos:</strong>{' '}
                  <span className="font-mono">{order.payment_reference || 'Sin referencia'}</span>
                </p>
                <p>
                  <strong>Monto esperado:</strong>{' '}
                  <span className="font-bold">${(order.total_amount_cents / 100).toFixed(2)} MXN</span>
                </p>
              </div>

              {!showPaymentForm && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setPaymentAmountInput(((order.total_amount_cents - order.amount_paid_cents) / 100).toFixed(2));
                      setShowPaymentForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verificar y Confirmar Pago Recibido</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Payment Input Form Modal/Card */}
          {showPaymentForm && (
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DCC4] space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#261C19] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Registrar Pago Autorizado
              </h4>
              <p className="text-[11px] text-[#6E564F]">
                Ingresa el monto recibido que confirmaste en tu cuenta bancaria.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    max={(order.total_amount_cents / 100).toFixed(2)}
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full pl-7 pr-12 py-2 rounded-lg border border-[#E4D5C1] text-sm font-mono font-bold bg-white text-[#261C19]"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">MXN</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmountInput((order.total_amount_cents / 100).toFixed(2))}
                    className="px-2.5 py-2 text-xs bg-white border border-[#E4D5C1] rounded-lg text-stone-700 hover:bg-stone-50"
                  >
                    Total (${(order.total_amount_cents / 100).toFixed(0)})
                  </button>

                  <button
                    disabled={isSavingPayment}
                    onClick={() => handleSavePayment(parseFloat(paymentAmountInput) || 0)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isSavingPayment
                      ? 'Procesando...'
                      : order.status === 'deposit_pending'
                      ? 'Confirmar pago y pedido'
                      : 'Confirmar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attention Banner if pending approval */}
          {order.status === 'pending_approval' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Pedido pendiente de aprobación
              </p>
              <p className="text-[11px] text-amber-800">
                Revisa los productos, la fecha y hora solicitada. Al aprobar, el pedido quedará pendiente de pago.
              </p>
            </div>
          )}

          {/* Customer Card */}
          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#F2ECE1] space-y-2">
            <h3 className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider">
              Cliente
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-[#261C19]">
                  {order.customer_name_snapshot}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[#6E564F]">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#A73832]" />
                    {order.customer_phone_snapshot}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#A73832]" />
                    {order.customer_email_snapshot}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery & Schedule Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#F2ECE1] space-y-1">
              <span className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#A73832]" />
                Fecha y Hora Programada
              </span>
              <p className="font-bold text-stone-900 capitalize text-xs">
                {formatDateLong(order.requested_date)}
              </p>
              <p className="text-stone-600 font-medium">
                {formatTimeShort(order.requested_time)} hrs (Tijuana)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#F2ECE1] space-y-1">
              <span className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#A73832]" />
                Punto o Modalidad
              </span>
              <p className="font-bold text-stone-900 text-xs">
                {order.delivery_name_snapshot || 'Punto de entrega'}
              </p>
              {order.delivery_address_snapshot && (
                <p className="text-[11px] text-[#6E564F]">
                  {order.delivery_address_snapshot}
                </p>
              )}
            </div>
          </div>

          {/* Products & Customizations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#A73832]" />
              Productos a Preparar ({order.items_count})
            </h3>

            <div className="border border-[#F2ECE1] rounded-xl divide-y divide-[#F2ECE1] bg-white">
              {order.items.map((item) => (
                <div key={item.id} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-[#261C19]">
                      <span className="text-[#A73832] mr-1.5">{item.quantity}x</span>
                      {item.product_name_snapshot}
                    </p>
                    <span className="font-mono font-semibold text-stone-700">
                      ${(item.subtotal_cents / 100).toFixed(2)}
                    </span>
                  </div>

                  {item.options.length > 0 && (
                    <div className="pl-4 flex flex-wrap gap-1.5 pt-1">
                      {item.options.map((opt) => (
                        <span
                          key={opt.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E8DCC4] text-[10px] font-medium text-stone-700"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-[#D46240]" />
                          <span>{opt.group_name_snapshot}:</span>
                          <strong>{opt.option_name_snapshot}</strong>
                          {opt.quantity > 1 && <span>(x{opt.quantity})</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Customer Notes */}
          {order.notes && (
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs">
              <span className="font-bold text-amber-900 block mb-0.5">Notas del cliente:</span>
              <p className="text-amber-800 italic">&ldquo;{order.notes}&rdquo;</p>
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#F2ECE1] space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider">
                Resumen Financiero
              </h3>
              {!showPaymentForm && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmountInput(((order.total_amount_cents - order.amount_paid_cents) / 100).toFixed(2));
                    setShowPaymentForm(true);
                  }}
                  className="text-xs text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Registrar pago</span>
                </button>
              )}
            </div>

            <div className="flex justify-between text-stone-600">
              <span>Subtotal productos:</span>
              <span className="font-mono">${(order.products_subtotal_cents / 100).toFixed(2)} MXN</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Envío / Entrega:</span>
              <span className="font-mono">
                {order.delivery_fee_cents !== null
                  ? `$${(order.delivery_fee_cents / 100).toFixed(2)} MXN`
                  : 'Por cotizar'}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[#261C19] pt-2 border-t border-[#E8DCC4]">
              <span>Total del pedido:</span>
              <span className="font-mono">${(order.total_amount_cents / 100).toFixed(2)} MXN</span>
            </div>
            <div className="flex justify-between text-xs text-stone-600 pt-1">
              <span>Monto pagado:</span>
              <span className="font-mono font-semibold text-emerald-700">
                ${(order.amount_paid_cents / 100).toFixed(2)} MXN
              </span>
            </div>
            {order.total_amount_cents > order.amount_paid_cents && (
              <div className="flex justify-between text-xs text-stone-600">
                <span>Saldo pendiente:</span>
                <span className="font-mono font-semibold text-amber-700">
                  ${((order.total_amount_cents - order.amount_paid_cents) / 100).toFixed(2)} MXN
                </span>
              </div>
            )}
            {order.payment_confirmed_at && (
              <div className="flex justify-between text-[11px] text-stone-500 pt-0.5 border-t border-[#F2ECE1]">
                <span>Pago verificado:</span>
                <span className="font-mono">
                  {new Date(order.payment_confirmed_at).toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Next Actions */}
        <div className="p-4 border-t border-[#F2ECE1] bg-stone-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-stone-500 font-medium">
            Creado el {formatDateLong(order.created_at.slice(0, 10))} a las {order.created_at.slice(11, 16)} hrs
          </div>

          <div className="flex items-center gap-2">
            {order.status === 'pending_approval' && (
              <>
                <button
                  disabled={isUpdating}
                  onClick={() => handleAction('rejected')}
                  className="px-3.5 py-2 rounded-xl border border-red-200 text-red-700 bg-white hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleAction('deposit_pending')}
                  className="px-4 py-2 rounded-xl bg-[#A73832] hover:bg-[#8E2E28] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aprobar Pedido
                </button>
              </>
            )}

            {order.status === 'deposit_pending' && (
              <div className="flex flex-wrap items-center gap-2">
                {isPaymentThresholdMet ? (
                  <button
                    disabled={isUpdating}
                    onClick={() => handleAction('confirmed')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar Pedido (Pago Cubierto)</span>
                  </button>
                ) : (
                  <>
                    <button
                      disabled={isUpdating}
                      onClick={() => {
                        setPaymentAmountInput(((order.total_amount_cents - order.amount_paid_cents) / 100).toFixed(2));
                        setShowPaymentForm(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar pago y pedido</span>
                    </button>
                    <span className="text-xs text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                      {order.payment_reported_at ? 'Pago por verificar' : 'Esperando pago del cliente'}
                    </span>
                  </>
                )}

                <button
                  disabled={isUpdating}
                  onClick={() => handleAction('cancelled')}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            )}

            {order.status === 'confirmed' && (
              <>
                <button
                  disabled={isUpdating}
                  onClick={() => handleAction('cancelled')}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 bg-white hover:bg-stone-50 text-xs font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleAction('preparing')}
                  className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  Iniciar Preparación
                </button>
              </>
            )}

            {order.status === 'preparing' && (
              <button
                disabled={isUpdating}
                onClick={() => handleAction('ready')}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Package className="w-3.5 h-3.5" />
                Marcar como Listo
              </button>
            )}

            {order.status === 'ready' && (
              <button
                disabled={isUpdating}
                onClick={() => handleAction('delivered')}
                className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar como Entregado
              </button>
            )}

            {['delivered', 'cancelled', 'rejected'].includes(order.status) && (
              <span className="text-xs text-stone-500 italic">Pedido finalizado</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
