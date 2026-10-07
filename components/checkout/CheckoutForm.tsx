'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart, type CartSelectedOption } from '@/contexts/CartContext';
import { calculateGroupExtraSummary } from '@/lib/catalog/pricing';
import type { CheckoutProfile, DeliveryPoint, StoreSettings } from '@/lib/checkout/types';
import {
  getMinAnticipationDateTime,
  isDateTimeAtLeast24Hours,
  validateCetysSchedule,
  buildOrderPayload,
} from '@/lib/checkout/validation';
import {
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
} from '@/lib/checkout/idempotency';
import { submitCheckoutOrder, getCheckoutSlots } from '@/app/actions/orders';
import { useEffect } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  MapPin,
  User,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Selected Options Display for Order Summary (consistent with Cart)
// ---------------------------------------------------------------------------
function SelectedOptionsSummary({ options }: { options: CartSelectedOption[] }) {
  if (!options || options.length === 0) return null;

  const byGroup = new Map<string, CartSelectedOption[]>();
  for (const opt of options) {
    const existing = byGroup.get(opt.groupName) ?? [];
    existing.push(opt);
    byGroup.set(opt.groupName, existing);
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      {Array.from(byGroup.entries()).map(([groupName, opts]) => {
        const includedCount = opts[0]?.groupIncludedSelections ?? 0;
        const hasIncluded = includedCount > 0;

        if (hasIncluded) {
          const summary = calculateGroupExtraSummary(includedCount, opts);
          const normalOpts = opts.filter((o) => !o.alwaysCharge);

          return (
            <div key={groupName} className="space-y-0.5">
              <p className="text-[10px] font-bold text-[#6E564F] uppercase tracking-wider">{groupName}:</p>
              <ul className="space-y-0.5">
                {normalOpts.map((opt) => (
                  <li key={opt.optionId} className="flex items-center gap-1 text-[11px] text-[#6E564F]">
                    <span className="text-[#A73832]">•</span>
                    <span className="font-medium text-[#261C19]">{opt.optionName}</span>
                    <span>×{opt.quantity}</span>
                  </li>
                ))}
              </ul>

              {(summary.normalExtraQuantity > 0 || summary.premiumCharges.length > 0) && (
                <div className="pt-0.5">
                  <p className="text-[10px] font-bold text-[#A73832] uppercase tracking-wider">EXTRAS:</p>
                  <ul className="space-y-0.5">
                    {summary.normalExtraQuantity > 0 && (
                      <li className="flex items-center gap-1 text-[11px] text-[#6E564F]">
                        <span className="text-[#A73832]">•</span>
                        <span className="font-medium text-[#261C19]">
                          {summary.normalExtraQuantity} topping{summary.normalExtraQuantity > 1 ? 's' : ''} extra
                        </span>
                        <span className="text-[#A73832] font-bold">+${summary.normalExtraPricePesos}</span>
                      </li>
                    )}
                    {summary.premiumCharges.map((p) => (
                      <li key={p.optionId} className="flex items-center gap-1 text-[11px] text-[#6E564F]">
                        <span className="text-[#A73832]">•</span>
                        <span className="font-medium text-[#261C19]">{p.optionName}</span>
                        <span>×{p.quantity}</span>
                        <span className="text-[#A73832] font-bold">+${p.totalExtraPesos}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={groupName}>
            <p className="text-[10px] font-bold text-[#6E564F] uppercase tracking-wider">{groupName}:</p>
            <ul className="space-y-0.5">
              {opts.map((opt) => (
                <li key={opt.optionId} className="flex items-center gap-1 text-[11px] text-[#6E564F]">
                  <span className="text-[#A73832]">•</span>
                  <span className="font-medium text-[#261C19]">{opt.optionName}</span>
                  <span>×{opt.quantity}</span>
                  {opt.totalExtraPrice > 0 && (
                    <span className="text-[#A73832] font-medium">+${opt.totalExtraPrice}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CheckoutFormProps {
  initialProfile: CheckoutProfile;
  deliveryPoints: DeliveryPoint[];
  storeSettings: StoreSettings;
}

export default function CheckoutForm({
  initialProfile,
  deliveryPoints,
  storeSettings,
}: CheckoutFormProps) {
  const router = useRouter();
  const { items, itemCount, subtotal, isHydrated, clearCart } = useCart();

  // Compute 24h default and minimums in Tijuana timezone
  const { minDateStr, minTimeStr } = getMinAnticipationDateTime(
    storeSettings.minAnticipationHours || 24,
    storeSettings.timezone || 'America/Tijuana'
  );

  // Form State (Section 1: Customer Data)
  const [customerName, setCustomerName] = useState(initialProfile.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(initialProfile.phone || '');
  const [customerEmail, setCustomerEmail] = useState(initialProfile.email || '');

  // Form State (Section 2: Requested Datetime)
  const [requestedDate, setRequestedDate] = useState(minDateStr);
  const [requestedTime, setRequestedTime] = useState(minTimeStr);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [slotsDateStatus, setSlotsDateStatus] = useState<string | null>(null);

  // Form State (Section 3: Delivery Point & Address)
  // Filter active delivery points, hiding CETYS if profile is not authorized
  const visibleDeliveryPoints = deliveryPoints.filter((dp) => {
    if (dp.requires_special_pickup_permission) {
      return initialProfile.cetysPickupEnabled === true;
    }
    return true;
  });

  const [selectedPointId, setSelectedPointId] = useState<string>(
    visibleDeliveryPoints[0]?.id || ''
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Form State (Section 4: Notes)
  const [notes, setNotes] = useState('');

  // Validation & Submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedPoint = visibleDeliveryPoints.find((dp) => dp.id === selectedPointId);
  const isOtherLocation = selectedPoint?.type === 'other';
  const isCetys = selectedPoint?.requires_special_pickup_permission === true;

  // Autoritative dynamic slot fetching from engine
  useEffect(() => {
    let isCancelled = false;

    async function fetchSlots() {
      if (!requestedDate) {
        setAvailableSlots([]);
        setSlotsDateStatus(null);
        return;
      }

      setIsLoadingSlots(true);

      const mode = isCetys
        ? 'cetys_pickup'
        : isOtherLocation
        ? 'home_delivery'
        : 'official_point';

      const pointId = mode === 'official_point' ? selectedPointId : null;

      try {
        const res = await getCheckoutSlots(mode, pointId, requestedDate, 1);
        if (isCancelled) return;

        if (res.availability?.dates && res.availability.dates.length > 0) {
          const dateObj = res.availability.dates[0];
          const slots: string[] = dateObj.available_slots || [];
          setAvailableSlots(slots);
          setSlotsDateStatus(dateObj.status || null);

          // If current requestedTime is not in slots, auto-select first slot or clear
          if (slots.length > 0) {
            if (!slots.includes(requestedTime)) {
              setRequestedTime(slots[0]);
            }
          } else {
            setRequestedTime('');
          }
        } else {
          setAvailableSlots([]);
          setSlotsDateStatus(res.availability?.status || 'not_available');
          setRequestedTime('');
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching available slots:', err);
          setAvailableSlots([]);
          setSlotsDateStatus('error');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSlots(false);
        }
      }
    }

    fetchSlots();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedDate, selectedPointId, isCetys, isOtherLocation]);


  // Real-time schedule validation for CETYS
  const cetysValidation = isCetys
    ? validateCetysSchedule(requestedDate, requestedTime, storeSettings.cetysPickupSchedule)
    : { valid: true };

  // Real-time 24h anticipation check
  const is24hValid = isDateTimeAtLeast24Hours(
    requestedDate,
    requestedTime,
    storeSettings.minAnticipationHours || 24,
    storeSettings.timezone || 'America/Tijuana'
  );

  // ---------------------------------------------------------------------------
  // Validation on Submit
  // ---------------------------------------------------------------------------
  const handleValidateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);

    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Por favor escribe tu nombre completo.';
    }
    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Por favor ingresa un número de teléfono de contacto.';
    } else if (customerPhone.trim().length < 8) {
      newErrors.customerPhone = 'Por favor ingresa un número de teléfono válido.';
    }
    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Por favor ingresa tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      newErrors.customerEmail = 'Por favor ingresa un correo electrónico válido.';
    }

    if (!requestedDate) {
      newErrors.requestedDate = 'Selecciona una fecha para tu pedido.';
    }
    if (!requestedTime) {
      newErrors.requestedTime = 'Selecciona una hora para tu pedido.';
    }

    if (requestedDate && requestedTime && !is24hValid) {
      newErrors.requestedDateTime = `Tu pedido requiere al menos ${storeSettings.minAnticipationHours || 24} horas de anticipación (horario de Tijuana).`;
    }

    if (!selectedPointId) {
      newErrors.deliveryPoint = 'Por favor selecciona un punto de entrega.';
    }

    if (isOtherLocation && !deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Por favor escribe tu dirección de entrega y referencias.';
    }

    if (isCetys && !cetysValidation.valid && cetysValidation.error) {
      newErrors.cetysSchedule = cetysValidation.error;
    }

    if (notes.length > 500) {
      newErrors.notes = 'Las notas no pueden exceder 500 caracteres.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      const el = document.getElementById(`field-${firstErrorField}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Get or create hardened idempotency key bound to current cart configuration
      const key = getOrCreateIdempotencyKey(items);

      // 2. Build canonical payload for submit_order RPC
      const payload = buildOrderPayload({
        idempotencyKey: key,
        customerName,
        customerPhone,
        customerEmail,
        requestedDate,
        requestedTime,
        deliveryPointId: selectedPointId,
        deliveryAddress: isOtherLocation ? deliveryAddress : null,
        notes,
        cartItems: items,
      });

      // 3. Call Server Action
      const result = await submitCheckoutOrder(payload);

      if (!result.success || !result.orderNumber) {
        setSubmitError(
          result.error ||
            'No pudimos procesar tu pedido. Tu carrito sigue guardado. Intenta nuevamente.'
        );
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 4. On SUCCESS: Clear cart, clear session idempotency key, redirect to persistent order page
      clearCart();
      clearIdempotencyKey();
      router.push(`/pedidos/${result.orderNumber}`);
    } catch {
      setSubmitError(
        'Ocurrió un error inesperado al procesar tu pedido. Tu carrito sigue guardado. Intenta nuevamente.'
      );
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ---------------------------------------------------------------------------
  // Empty Cart State
  // ---------------------------------------------------------------------------
  if (!isHydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-[#6E564F] text-sm font-medium">Cargando checkout...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-[#FFF9F2] rounded-full flex items-center justify-center border border-[#E4D5C1]">
          <ShoppingBag className="w-8 h-8 text-[#A73832]" />
        </div>
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#261C19]">Tu carrito está vacío</h1>
        <p className="text-sm md:text-base text-[#6E564F] max-w-md mx-auto">
          Agrega tus manzanitas o charolas favoritas para poder finalizar tu pedido.
        </p>
        <div className="pt-2">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-[#A73832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#8e2e28] transition-colors shadow-2xs"
          >
            <span>Ver productos</span>
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main Checkout Form Layout
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      {/* Header and Back Link */}
      <div className="space-y-3">
        <Link
          href="/carrito"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6E564F] hover:text-[#A73832] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Volver al carrito</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#261C19]">
            Finaliza tu pedido
          </h1>
          <span className="text-xs font-bold text-[#A73832] bg-[#FFF9F2] px-3 py-1 rounded-full border border-[#E4D5C1] self-start sm:self-auto">
            {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
          </span>
        </div>
        <p className="text-sm text-[#6E564F]">
          Completa los datos de entrega y envía tu pedido para revisión.
        </p>
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-[#FFF0F0] border border-[#A73832]/30 text-[#A73832] text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">No se pudo enviar el pedido</p>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Form (Left) & Order Summary (Right) */}
      <form onSubmit={handleValidateAndSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Sections 1 to 4 */}
          <div className="lg:col-span-7 space-y-6">

            {/* SECTION 1: Tus Datos */}
            <div id="field-customerName" className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4D5C1]/60 pb-3">
                <User className="w-4 h-4 text-[#A73832]" />
                <h2 className="font-serif font-bold text-lg text-[#261C19]">1. Tus datos</h2>
              </div>

              <p className="text-xs text-[#6E564F]">
                Usaremos estos datos para comunicarnos contigo sobre tu pedido.
              </p>

              <div className="space-y-4 pt-1">
                <div>
                  <label htmlFor="customerName" className="block text-xs font-bold text-[#261C19] mb-1">
                    Nombre completo <span className="text-[#A73832]">*</span>
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.customerName) setErrors({ ...errors, customerName: '' });
                    }}
                    placeholder="Tu nombre y apellido"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#261C19] bg-white transition-colors focus:outline-none ${
                      errors.customerName
                        ? 'border-[#A73832] focus:border-[#A73832] bg-[#FFF9F9]'
                        : 'border-[#E4D5C1] focus:border-[#A73832]'
                    }`}
                  />
                  {errors.customerName && (
                    <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.customerName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div id="field-customerPhone">
                    <label htmlFor="customerPhone" className="block text-xs font-bold text-[#261C19] mb-1">
                      Teléfono de WhatsApp <span className="text-[#A73832]">*</span>
                    </label>
                    <input
                      id="customerPhone"
                      type="tel"
                      name="tel"
                      autoComplete="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (errors.customerPhone) setErrors({ ...errors, customerPhone: '' });
                      }}
                      placeholder="664 123 4567"
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#261C19] bg-white transition-colors focus:outline-none ${
                        errors.customerPhone
                          ? 'border-[#A73832] focus:border-[#A73832] bg-[#FFF9F9]'
                          : 'border-[#E4D5C1] focus:border-[#A73832]'
                      }`}
                    />
                    {errors.customerPhone && (
                      <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.customerPhone}
                      </p>
                    )}
                  </div>

                  <div id="field-customerEmail">
                    <label htmlFor="customerEmail" className="block text-xs font-bold text-[#261C19] mb-1">
                      Correo electrónico <span className="text-[#A73832]">*</span>
                    </label>
                    <input
                      id="customerEmail"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (errors.customerEmail) setErrors({ ...errors, customerEmail: '' });
                      }}
                      placeholder="tu@correo.com"
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#261C19] bg-white transition-colors focus:outline-none ${
                        errors.customerEmail
                          ? 'border-[#A73832] focus:border-[#A73832] bg-[#FFF9F9]'
                          : 'border-[#E4D5C1] focus:border-[#A73832]'
                      }`}
                    />
                    {errors.customerEmail && (
                      <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.customerEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Fecha y Hora Solicitada */}
            <div id="field-requestedDate" className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4D5C1]/60 pb-3">
                <Clock className="w-4 h-4 text-[#A73832]" />
                <h2 className="font-serif font-bold text-lg text-[#261C19]">
                  2. Fecha y hora solicitada
                </h2>
              </div>

              <p className="text-xs text-[#6E564F]">
                Selecciona cuándo te gustaría recibir o recoger tu pedido. La fecha y hora quedan sujetas a confirmación.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label htmlFor="requestedDate" className="block text-xs font-bold text-[#261C19] mb-1">
                    Fecha de entrega <span className="text-[#A73832]">*</span>
                  </label>
                  <input
                    id="requestedDate"
                    type="date"
                    min={minDateStr}
                    required
                    value={requestedDate}
                    onChange={(e) => {
                      setRequestedDate(e.target.value);
                      if (errors.requestedDate || errors.requestedDateTime) {
                        setErrors({ ...errors, requestedDate: '', requestedDateTime: '' });
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#261C19] bg-white transition-colors focus:outline-none ${
                      errors.requestedDate || errors.requestedDateTime
                        ? 'border-[#A73832] bg-[#FFF9F9]'
                        : 'border-[#E4D5C1] focus:border-[#A73832]'
                    }`}
                  />
                  {errors.requestedDate && (
                    <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.requestedDate}
                    </p>
                  )}
                </div>

                <div id="field-requestedTime">
                  <label htmlFor="requestedTime" className="block text-xs font-bold text-[#261C19] mb-1">
                    Hora solicitada <span className="text-[#A73832]">*</span>
                  </label>
                  {isLoadingSlots ? (
                    <div className="py-2.5 px-3.5 text-xs text-[#6E564F] bg-[#FAF7F2] rounded-lg border border-[#E4D5C1] flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-[#A73832] border-t-transparent animate-spin" />
                      Consultando horarios disponibles...
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map((slot) => {
                          const isSelected = requestedTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setRequestedTime(slot);
                                if (errors.requestedTime || errors.requestedDateTime) {
                                  setErrors({ ...errors, requestedTime: '', requestedDateTime: '' });
                                }
                              }}
                              className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#A73832] text-white border-[#A73832] shadow-xs'
                                  : 'bg-white text-[#261C19] border-[#E4D5C1] hover:border-[#A73832]/60 hover:bg-[#FAF7F2]'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      <input type="hidden" name="requestedTime" value={requestedTime} />
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#E4D5C1] text-xs text-[#6E564F]">
                      <p className="font-semibold text-[#261C19]">
                        {slotsDateStatus === 'closed'
                          ? 'Tienda cerrada en la fecha seleccionada.'
                          : slotsDateStatus === 'cutoff_reached'
                          ? 'Horario límite alcanzado para hoy.'
                          : 'No quedan horarios disponibles para esta fecha.'}
                      </p>
                      <p className="text-[11px] mt-0.5">Prueba con otro día o modalidad de entrega.</p>
                    </div>
                  )}
                  {errors.requestedTime && (
                    <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.requestedTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Anticipation & Timezone Information / Error */}
              {errors.requestedDateTime ? (
                <div className="p-3 rounded-lg bg-[#FFF0F0] border border-[#A73832]/30 text-xs text-[#A73832] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.requestedDateTime}</span>
                </div>
              ) : (
                <p className="text-[11px] text-[#6E564F] flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A73832]" />
                  <span>
                    Mínimo 24 horas de anticipación en horario de Tijuana (America/Tijuana).
                  </span>
                </p>
              )}
            </div>

            {/* SECTION 3: ¿Dónde recibes tu pedido? */}
            <div id="field-deliveryPoint" className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4D5C1]/60 pb-3">
                <MapPin className="w-4 h-4 text-[#A73832]" />
                <h2 className="font-serif font-bold text-lg text-[#261C19]">
                  3. ¿Dónde recibes tu pedido?
                </h2>
              </div>

              <div className="space-y-2.5">
                {visibleDeliveryPoints.map((dp) => {
                  const isSelected = selectedPointId === dp.id;
                  const isSpecial = dp.requires_special_pickup_permission;
                  const isOther = dp.type === 'other';

                  return (
                    <label
                      key={dp.id}
                      className={`block p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#A73832] bg-[#FFF9F2] shadow-2xs'
                          : 'border-[#E4D5C1] hover:border-[#A73832]/50 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="delivery_point"
                          value={dp.id}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedPointId(dp.id);
                            if (errors.deliveryPoint) setErrors({ ...errors, deliveryPoint: '' });
                          }}
                          className="mt-1 h-4 w-4 text-[#A73832] accent-[#A73832] border-[#E4D5C1] focus:ring-[#A73832]"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="font-bold text-sm text-[#261C19]">{dp.name}</span>

                            {/* Badge according to point type */}
                            {isOther ? (
                              <span className="text-[11px] font-bold text-[#A73832] bg-[#FFF0F0] px-2.5 py-0.5 rounded-full border border-[#A73832]/20">
                                Envío por cotizar
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-[#2D6A4F] bg-[#E8F3EB] px-2.5 py-0.5 rounded-full border border-[#2D6A4F]/20">
                                Sin costo de entrega
                              </span>
                            )}
                          </div>

                          {/* Helper descriptions */}
                          {isSpecial ? (
                            <p className="text-xs text-[#6E564F] mt-1">
                              Lunes a viernes · 4:00 p.m. a 8:00 p.m.
                            </p>
                          ) : isOther ? (
                            <p className="text-xs text-[#6E564F] mt-1">
                              Entrega a domicilio fuera de puntos oficiales. El costo de entrega se definirá según tu ubicación.
                            </p>
                          ) : (
                            <p className="text-xs text-[#6E564F] mt-1">
                              Punto oficial de entrega. Sin costo de entrega.
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {errors.deliveryPoint && (
                <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.deliveryPoint}
                </p>
              )}

              {/* Conditional CETYS Schedule Error Warning */}
              {isCetys && (!cetysValidation.valid || errors.cetysSchedule) && (
                <div id="field-cetysSchedule" className="p-3.5 rounded-xl bg-[#FFF0F0] border border-[#A73832]/40 text-xs text-[#A73832] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Horario de CETYS no coincide:</p>
                    <p className="mt-0.5">{errors.cetysSchedule || cetysValidation.error}</p>
                  </div>
                </div>
              )}

              {/* Conditional Address Field for "Otra ubicación" */}
              {isOtherLocation && (
                <div id="field-deliveryAddress" className="pt-2 border-t border-[#E4D5C1]/60 space-y-2">
                  <label htmlFor="deliveryAddress" className="block text-xs font-bold text-[#261C19]">
                    Dirección o ubicación completa <span className="text-[#A73832]">*</span>
                  </label>
                  <input
                    id="deliveryAddress"
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      if (errors.deliveryAddress) setErrors({ ...errors, deliveryAddress: '' });
                    }}
                    placeholder="Escribe la dirección, colonia y alguna referencia"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#261C19] bg-white transition-colors focus:outline-none ${
                      errors.deliveryAddress
                        ? 'border-[#A73832] bg-[#FFF9F9]'
                        : 'border-[#E4D5C1] focus:border-[#A73832]'
                    }`}
                  />
                  {errors.deliveryAddress && (
                    <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.deliveryAddress}
                    </p>
                  )}
                  <p className="text-[11px] text-[#6E564F] italic">
                    El costo de entrega se determinará según tu ubicación y se confirmará dentro del proceso de tu pedido.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 4: ¿Algo que debamos saber? */}
            <div id="field-notes" className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E4D5C1]/60 pb-3">
                <MessageSquare className="w-4 h-4 text-[#A73832]" />
                <h2 className="font-serif font-bold text-lg text-[#261C19]">
                  4. ¿Algo que debamos saber?
                </h2>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-bold text-[#261C19] mb-1">
                  Notas para tu pedido <span className="text-[11px] font-normal text-[#6E564F]">(opcional)</span>
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (errors.notes) setErrors({ ...errors, notes: '' });
                  }}
                  placeholder="Ej. indicaciones de entrega o algún detalle importante"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4D5C1] focus:border-[#A73832] text-sm text-[#261C19] bg-white transition-colors focus:outline-none resize-none"
                />
                <div className="flex justify-between items-center mt-1 text-[11px] text-[#6E564F]">
                  <span>Máximo 500 caracteres</span>
                  <span>{notes.length} / 500</span>
                </div>
                {errors.notes && (
                  <p className="text-xs text-[#A73832] mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between border-b border-[#E4D5C1] pb-4">
                <h2 className="font-serif font-bold text-xl text-[#261C19]">Resumen de tu pedido</h2>
                <Link
                  href="/carrito"
                  className="text-xs font-bold text-[#A73832] hover:underline"
                >
                  Editar
                </Link>
              </div>

              {/* Items List */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.lineId} className="flex gap-3 py-2 border-b border-[#E4D5C1]/40 last:border-0">
                    {/* Thumbnail */}
                    <div className="relative w-14 h-14 rounded-lg bg-[#FFF9F2] border border-[#E4D5C1] shrink-0 overflow-hidden flex items-center justify-center">
                      {item.photoSrc ? (
                        <Image src={item.photoSrc} alt={item.name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <span className="text-[8px] font-bold text-[#6E564F]/50">FOTO</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-serif font-bold text-sm text-[#261C19] line-clamp-1">{item.name}</p>
                        <span className="text-xs font-bold text-[#261C19] shrink-0">
                          ${(item.unitPrice * item.quantity).toFixed(0)} <span className="text-[10px] text-[#6E564F]">MXN</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6E564F]">
                        {item.quantity} × ${item.unitPrice} MXN
                      </p>

                      <SelectedOptionsSummary options={item.selectedOptions} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-3 text-sm text-[#6E564F] border-t border-[#E4D5C1] pt-4">
                <div className="flex justify-between items-center">
                  <span>Productos</span>
                  <span className="font-bold text-[#261C19]">${subtotal.toFixed(0)} MXN</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Envío</span>
                  {isOtherLocation ? (
                    <span className="text-xs font-bold text-[#A73832] bg-[#FFF0F0] px-2 py-0.5 rounded-full">
                      Por confirmar
                    </span>
                  ) : (
                    <span className="font-bold text-[#2D6A4F]">$0 MXN</span>
                  )}
                </div>

                {/* Subtotal / Total display */}
                <div className="border-t border-[#E4D5C1]/60 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-[#261C19]">
                      {isOtherLocation ? 'Subtotal actual' : 'Total'}
                    </span>
                    <span className="font-serif font-bold text-2xl text-[#A73832]">
                      ${subtotal.toFixed(0)} <span className="text-xs font-sans text-[#6E564F]">MXN</span>
                    </span>
                  </div>

                  {isOtherLocation && (
                    <p className="text-[11px] text-[#6E564F] mt-1 text-right italic">
                      + costo de envío por confirmar
                    </p>
                  )}
                </div>
              </div>

              {/* Server authority notice */}
              <p className="text-[11px] text-[#6E564F] text-center italic bg-[#FFF9F2] p-2 rounded-lg border border-[#E4D5C1]/70">
                Los precios y disponibilidad se validarán al enviar el pedido.
              </p>

              {/* CTA Button */}
              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-md bg-[#A73832] hover:bg-[#8e2e28] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs md:text-sm font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando pedido...</span>
                    </span>
                  ) : (
                    <span>Enviar pedido a revisión</span>
                  )}
                </button>

                <p className="text-[11px] text-center text-[#6E564F]">
                  No se realizará ningún cobro al enviar tu pedido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
