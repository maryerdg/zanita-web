'use client'

import React, { useState, useTransition, useId } from 'react'
import {
  updateDeliveryPoint,
  saveKitchenBaseLocation,
  removeKitchenBaseLocation,
  saveDeliveryPricingRule,
  deleteDeliveryPricingRule,
  saveDeliverySurcharge,
  deleteDeliverySurcharge,
  type DeliveryPointRow,
  type KitchenBaseLocation,
  type DeliveryPricingRuleRow,
  type DeliverySurchargeRow,
} from '@/app/actions/admin'
import {
  MapPin,
  Truck,
  DollarSign,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Info,
  ShieldAlert,
} from 'lucide-react'

interface Props {
  initialPoints: DeliveryPointRow[]
  initialKitchen: KitchenBaseLocation
  initialPricingRules: DeliveryPricingRuleRow[]
  initialSurcharges: DeliverySurchargeRow[]
}

export default function DeliveryClient({
  initialPoints,
  initialKitchen,
  initialPricingRules,
  initialSurcharges,
}: Props) {
  const [points, setPoints] = useState<DeliveryPointRow[]>(initialPoints)
  const [kitchen, setKitchen] = useState<KitchenBaseLocation>(initialKitchen)
  const [pricingRules, setPricingRules] = useState<DeliveryPricingRuleRow[]>(initialPricingRules)
  const [surcharges, setSurcharges] = useState<DeliverySurchargeRow[]>(initialSurcharges)

  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Forms state
  const [kitchenLabel, setKitchenLabel] = useState(initialKitchen.label || 'Taller Zanita Tijuana')
  const [kitchenLat, setKitchenLat] = useState<string>(
    initialKitchen.latitude !== null && initialKitchen.latitude !== undefined ? String(initialKitchen.latitude) : ''
  )
  const [kitchenLng, setKitchenLng] = useState<string>(
    initialKitchen.longitude !== null && initialKitchen.longitude !== undefined ? String(initialKitchen.longitude) : ''
  )

  // New Pricing Range Modal / Form
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [manualQuoteCheck, setManualQuoteCheck] = useState(false)

  // Surcharges Modal
  const [showSurchargeModal, setShowSurchargeModal] = useState(false)

  // Accessible IDs for inputs
  const baseId = useId()

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4500)
  }

  // ==========================================================================
  // HANDLERS: DELIVERY POINTS
  // ==========================================================================
  const handleTogglePointActive = (point: DeliveryPointRow) => {
    const nextActive = !point.is_active
    startTransition(async () => {
      const res = await updateDeliveryPoint(point.id, { is_active: nextActive })
      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', `Punto ${point.name} ${nextActive ? 'activado' : 'desactivado'}`)
        setPoints((prev) => prev.map((p) => (p.id === point.id ? { ...p, is_active: nextActive } : p)))
      }
    })
  }

  const handleSavePointDetails = (pointId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const publicRef = formData.get('public_reference') as string
    const instructions = formData.get('instructions') as string
    const latStr = formData.get('latitude') as string
    const lngStr = formData.get('longitude') as string

    startTransition(async () => {
      const res = await updateDeliveryPoint(pointId, {
        public_reference: publicRef || null,
        instructions: instructions || null,
        latitude: latStr ? parseFloat(latStr) : null,
        longitude: lngStr ? parseFloat(lngStr) : null,
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Detalles del punto actualizados')
        setPoints((prev) =>
          prev.map((p) =>
            p.id === pointId
              ? {
                  ...p,
                  public_reference: publicRef || null,
                  instructions: instructions || null,
                  latitude: latStr ? parseFloat(latStr) : null,
                  longitude: lngStr ? parseFloat(lngStr) : null,
                }
              : p
          )
        )
      }
    })
  }

  // ==========================================================================
  // HANDLERS: KITCHEN BASE LOCATION
  // ==========================================================================
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotification('error', 'Tu navegador no soporta geolocalización')
      return
    }

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        setKitchenLat(lat)
        setKitchenLng(lng)
        showNotification('success', 'Coordenadas obtenidas de tu dispositivo')
      },
      (err) => {
        setGeoLoading(false)
        showNotification('error', `Permiso de ubicación denegado o no disponible: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSaveKitchen = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = kitchenLat ? parseFloat(kitchenLat) : null
    const lng = kitchenLng ? parseFloat(kitchenLng) : null

    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
      showNotification('error', 'Latitud inválida')
      return
    }
    if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
      showNotification('error', 'Longitud inválida')
      return
    }

    startTransition(async () => {
      const res = await saveKitchenBaseLocation({
        label: kitchenLabel.trim() || 'Taller Zanita Tijuana',
        latitude: lat,
        longitude: lng,
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', res.message || 'Ubicación base guardada')
        setKitchen({
          label: kitchenLabel.trim() || 'Taller Zanita Tijuana',
          latitude: lat,
          longitude: lng,
        })
      }
    })
  }

  const handleRemoveKitchen = () => {
    if (!confirm('¿Deseas quitar la ubicación base? Los envíos a domicilio pasarán a ser cotizados manualmente.')) return

    startTransition(async () => {
      const res = await removeKitchenBaseLocation()
      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Ubicación base removida')
        setKitchenLat('')
        setKitchenLng('')
        setKitchen((prev) => ({ ...prev, latitude: null, longitude: null }))
      }
    })
  }

  // ==========================================================================
  // HANDLERS: PRICING RULES
  // ==========================================================================
  const handleSavePricingTier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const minKm = parseFloat(formData.get('min_distance_km') as string)
    const maxKmStr = formData.get('max_distance_km') as string
    const maxKm = maxKmStr ? parseFloat(maxKmStr) : null
    const feePesosStr = formData.get('fee_pesos') as string
    const feePesos = feePesosStr ? parseFloat(feePesosStr) : 0
    const isManual = formData.get('requires_manual_quote') === 'on'

    const feeCents = isManual ? null : Math.round(feePesos * 100)

    startTransition(async () => {
      const res = await saveDeliveryPricingRule({
        min_distance_km: minKm,
        max_distance_km: maxKm,
        fee_cents: feeCents,
        requires_manual_quote: isManual,
        is_active: true,
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', res.message || 'Tarifa guardada')
        setShowPricingModal(false)
        // Refresh list
        setPricingRules((prev) => [
          ...prev,
          {
            id: `opt-${Date.now()}`,
            min_distance_km: minKm,
            max_distance_km: maxKm,
            fee_cents: feeCents,
            requires_manual_quote: isManual,
            priority: 0,
            is_active: true,
          },
        ].sort((a, b) => a.min_distance_km - b.min_distance_km))
      }
    })
  }

  const handleDeletePricingRule = (ruleId: string) => {
    if (!confirm('¿Deseas eliminar este rango de tarifas?')) return

    startTransition(async () => {
      const res = await deleteDeliveryPricingRule(ruleId)
      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Tarifa eliminada')
        setPricingRules((prev) => prev.filter((r) => r.id !== ruleId))
      }
    })
  }

  // ==========================================================================
  // HANDLERS: SURCHARGES
  // ==========================================================================
  const handleSaveSurcharge = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const name = formData.get('name') as string
    const pesos = parseFloat(formData.get('surcharge_pesos') as string || '0')
    const dowStr = formData.get('day_of_week') as string
    const dow = dowStr ? parseInt(dowStr, 10) : null
    const startTime = formData.get('start_time') as string || null
    const endTime = formData.get('end_time') as string || null

    startTransition(async () => {
      const res = await saveDeliverySurcharge({
        name,
        surcharge_cents: Math.round(pesos * 100),
        day_of_week: dow,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Recargo guardado')
        setShowSurchargeModal(false)
        setSurcharges((prev) => [
          ...prev,
          {
            id: `opt-${Date.now()}`,
            name,
            delivery_mode: 'home_delivery',
            day_of_week: dow,
            start_time: startTime,
            end_time: endTime,
            surcharge_cents: Math.round(pesos * 100),
            is_active: true,
          },
        ])
      }
    })
  }

  const handleDeleteSurcharge = (surchargeId: string) => {
    if (!confirm('¿Deseas eliminar este recargo?')) return

    startTransition(async () => {
      const res = await deleteDeliverySurcharge(surchargeId)
      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Recargo eliminado')
        setSurcharges((prev) => prev.filter((s) => s.id !== surchargeId))
      }
    })
  }

  const isKitchenConfigured =
    kitchen.latitude !== null &&
    kitchen.latitude !== undefined &&
    kitchen.longitude !== null &&
    kitchen.longitude !== undefined

  return (
    <div className="space-y-10">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl shadow-lg border text-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#261C19]">
          Logística y Entregas
        </h1>
        <p className="text-sm text-[#6E564F] mt-1">
          Administra los 6 puntos físicos oficiales, la ubicación base de cocina y las tarifas por distancia.
        </p>
      </div>

      {/* SECTION 1: PUNTOS OFICIALES */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#261C19] flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-[#A73832]" />
            Puntos Físicos Oficiales
          </h2>
          <p className="text-xs text-[#6E564F] mt-1">
            Los 6 puntos canónicos donde los clientes pueden recoger sus pedidos sin costo de envío.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {points.map((pt) => (
            <div
              key={pt.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                pt.is_active
                  ? 'bg-white border-[#E8DCC4] shadow-xs'
                  : 'bg-[#FAF7F2]/60 border-[#F2ECE1] opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif font-bold text-base text-[#261C19]">
                    {pt.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleTogglePointActive(pt)}
                    disabled={isPending}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                      pt.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {pt.is_active ? 'Activo' : 'Desactivado'}
                  </button>
                </div>

                <form
                  onSubmit={(e) => handleSavePointDetails(pt.id, e)}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                      Referencia pública
                    </span>
                    <input
                      type="text"
                      name="public_reference"
                      defaultValue={pt.public_reference || ''}
                      placeholder="Ej. Frente a Calimax, estacionamiento"
                      aria-label={`Referencia pública para ${pt.name}`}
                      className="w-full bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-1.5 text-[#261C19]"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                      Instrucciones visibles
                    </span>
                    <textarea
                      name="instructions"
                      rows={2}
                      defaultValue={pt.instructions || ''}
                      placeholder="Instrucciones al llegar"
                      aria-label={`Instrucciones visibles para ${pt.name}`}
                      className="w-full bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-1.5 text-[#261C19]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#261C19] text-white hover:bg-[#A73832] transition-colors shadow-xs"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ))}
        </div>

        {/* Note on CETYS & Legacy Other Location */}
        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DCC4] text-xs text-[#6E564F] space-y-1">
          <p className="font-semibold text-[#261C19] flex items-center">
            <Info className="w-4 h-4 mr-1 text-[#A73832]" />
            Puntos especiales y compatibilidad:
          </p>
          <p>
            • <strong>Pickup CETYS</strong> se administra desde la pestaña de Disponibilidad y sólo es visible para usuarios con permiso especial.
          </p>
          <p>
            • <strong>Otra ubicación</strong> permanece reservada en la base de datos para dar soporte al checkout histórico hasta la fase 8D.4.
          </p>
        </div>
      </div>

      {/* SECTION 2: UBICACIÓN BASE (DESDE DÓNDE SALEN LAS ENTREGAS) */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#261C19] flex items-center">
            <Truck className="w-5 h-5 mr-2 text-[#A73832]" />
            Desde Dónde Salen las Entregas (Cocina Base)
          </h2>
          <p className="text-xs text-[#6E564F] mt-1">
            Coordenadas del taller o cocina de Zanita utilizadas para calcular la distancia de entrega al domicilio del cliente.
          </p>
        </div>

        <form onSubmit={handleSaveKitchen} className="space-y-4 max-w-xl">
          <div>
            <span className="text-xs font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
              Nombre de la ubicación
            </span>
            <input
              type="text"
              value={kitchenLabel}
              onChange={(e) => setKitchenLabel(e.target.value)}
              placeholder="Ej. Taller Zanita Tijuana"
              aria-label="Nombre de la ubicación base"
              className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-3 py-2 text-[#261C19]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                Latitud
              </span>
              <input
                type="text"
                value={kitchenLat}
                onChange={(e) => setKitchenLat(e.target.value)}
                placeholder="Ej. 32.514946"
                aria-label="Latitud de la ubicación base"
                className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-3 py-2 text-[#261C19]"
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                Longitud
              </span>
              <input
                type="text"
                value={kitchenLng}
                onChange={(e) => setKitchenLng(e.target.value)}
                placeholder="Ej. -117.038247"
                aria-label="Longitud de la ubicación base"
                className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-3 py-2 text-[#261C19]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLoading}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#F5EBDC] text-[#261C19] border border-[#E8DCC4] hover:bg-[#E8DCC4] transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 mr-1.5 text-[#D46240]" />
              {geoLoading ? 'Obteniendo GPS...' : 'Usar mi ubicación actual'}
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#A73832] text-white hover:bg-[#87201D] transition-colors shadow-xs"
            >
              Guardar Ubicación
            </button>

            {isKitchenConfigured && (
              <button
                type="button"
                onClick={handleRemoveKitchen}
                disabled={isPending}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
              >
                Quitar Ubicación
              </button>
            )}
          </div>

          {!isKitchenConfigured && (
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
              ⚠️ Al no tener coordenadas base, todos los envíos a domicilio se mostrarán como «Por cotizar» en el checkout.
            </p>
          )}
        </form>
      </div>

      {/* SECTION 3: TARIFAS A DOMICILIO (DISTANCE TIERS) */}
      <div id="tarifas" className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#261C19] flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-[#A73832]" />
              Tarifas por Distancia de Envío
            </h2>
            <p className="text-xs text-[#6E564F] mt-1">
              Define los costos según la distancia recorrida en kilómetros desde la cocina base.
            </p>
          </div>

          <button
            onClick={() => setShowPricingModal(true)}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#261C19] text-white hover:bg-[#A73832] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + Agregar Rango de Tarifa
          </button>
        </div>

        {/* Pricing Tiers Table */}
        {pricingRules.length === 0 ? (
          <div className="p-6 bg-[#FAF7F2] rounded-xl text-center border border-[#E8DCC4] space-y-2">
            <p className="text-xs text-[#6E564F] italic">
              No hay rangos de tarifas activos. Los envíos a domicilio se procesarán como «Por cotizar».
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8DCC4] text-[#6E564F]">
                  <th className="py-2.5 px-4 font-semibold">Distancia</th>
                  <th className="py-2.5 px-4 font-semibold">Costo de Envío</th>
                  <th className="py-2.5 px-4 font-semibold">Tipo</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE1]">
                {pricingRules.map((rule) => {
                  const min = rule.min_distance_km
                  const max = rule.max_distance_km
                  const feePesos = rule.fee_cents !== null ? rule.fee_cents / 100 : null

                  return (
                    <tr key={rule.id} className="hover:bg-[#FAF7F2]/50">
                      <td className="py-3 px-4 font-medium text-[#261C19]">
                        {min} km {max !== null ? `a ${max} km` : 'en adelante'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#A73832]">
                        {rule.requires_manual_quote
                          ? 'Por cotizar'
                          : `$${feePesos?.toFixed(2)} MXN`}
                      </td>
                      <td className="py-3 px-4 text-[#6E564F]">
                        {rule.requires_manual_quote ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                            Cotización manual
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                            Automática
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeletePricingRule(rule.id)}
                          disabled={isPending}
                          className="p-1 text-[#6E564F] hover:text-red-700 transition-colors"
                          title="Eliminar tarifa"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 4: RECARGOS (SURCHARGES) */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#261C19] flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-[#D46240]" />
              Recargos de Entrega (Opcional)
            </h2>
            <p className="text-xs text-[#6E564F] mt-1">
              Recargos fijos aplicados al cliente por horarios punta, domingos o condiciones especiales.
            </p>
          </div>

          <button
            onClick={() => setShowSurchargeModal(true)}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] text-[#261C19] border border-[#E8DCC4] hover:bg-[#F5EBDC] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + Agregar Recargo
          </button>
        </div>

        {surcharges.length === 0 ? (
          <p className="text-xs text-[#6E564F] italic bg-[#FAF7F2] p-4 rounded-xl text-center">
            No hay recargos configurados actualmente.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {surcharges.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-[#E8DCC4] bg-[#FAF7F2] flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-sm text-[#261C19]">{s.name}</p>
                  <p className="text-[#A73832] font-semibold mt-0.5">
                    +${(s.surcharge_cents / 100).toFixed(2)} MXN
                  </p>
                  {(s.start_time || s.day_of_week) && (
                    <p className="text-[11px] text-[#6E564F] mt-1">
                      {s.day_of_week ? `Día ${s.day_of_week}` : ''}{' '}
                      {s.start_time ? `(${s.start_time.slice(0, 5)} - ${s.end_time?.slice(0, 5)})` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteSurcharge(s.id)}
                  disabled={isPending}
                  className="p-1 text-[#6E564F] hover:text-red-700 transition-colors"
                  title="Eliminar recargo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD PRICING TIER */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8DCC4] p-6 max-w-md w-full shadow-xl space-y-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#A73832]">
                Agregar Rango de Tarifa
              </h3>
              <p className="text-xs text-[#6E564F] mt-1">
                El sistema valida automáticamente que no se empalme con rangos existentes.
              </p>
            </div>

            <form onSubmit={handleSavePricingTier} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Desde (km)
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    name="min_distance_km"
                    min="0"
                    required
                    placeholder="0"
                    aria-label="Distancia mínima en kilómetros"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Hasta (km, opcional)
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    name="max_distance_km"
                    min="0"
                    placeholder="En adelante"
                    aria-label="Distancia máxima en kilómetros"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center space-x-2 text-xs text-[#261C19] cursor-pointer">
                  <input
                    type="checkbox"
                    name="requires_manual_quote"
                    checked={manualQuoteCheck}
                    onChange={(e) => setManualQuoteCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-[#A73832] border-[#E8DCC4]"
                  />
                  <span className="font-medium">Requiere cotización manual</span>
                </label>
              </div>

              {!manualQuoteCheck && (
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Costo de envío ($ MXN)
                  </span>
                  <input
                    type="number"
                    step="5"
                    name="fee_pesos"
                    min="0"
                    required={!manualQuoteCheck}
                    placeholder="50"
                    aria-label="Costo de envío en pesos"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                  />
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPricingModal(false)}
                  className="w-1/2 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] text-[#6E564F] hover:bg-[#F5EBDC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2 rounded-xl text-xs font-semibold bg-[#A73832] text-white hover:bg-[#87201D]"
                >
                  Guardar Tarifa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SURCHARGE */}
      {showSurchargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8DCC4] p-6 max-w-md w-full shadow-xl space-y-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#D46240]">
                Agregar Recargo
              </h3>
              <p className="text-xs text-[#6E564F] mt-1">
                Recargo aplicable al costo del envío.
              </p>
            </div>

            <form onSubmit={handleSaveSurcharge} className="space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Nombre del recargo
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ej. Domingo o Turno Vespertino"
                  aria-label="Nombre del recargo"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Monto ($ MXN)
                </span>
                <input
                  type="number"
                  step="5"
                  name="surcharge_pesos"
                  min="0"
                  required
                  placeholder="25"
                  aria-label="Monto del recargo en pesos"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                />
              </div>

              <div>
                <label htmlFor={`${baseId}-surcharge-dow`} className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Día de la semana (opcional)
                </label>
                <select
                  id={`${baseId}-surcharge-dow`}
                  name="day_of_week"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                >
                  <option value="">Cualquier día</option>
                  <option value="1">Lunes</option>
                  <option value="2">Martes</option>
                  <option value="3">Miércoles</option>
                  <option value="4">Jueves</option>
                  <option value="5">Viernes</option>
                  <option value="6">Sábado</option>
                  <option value="7">Domingo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Hora inicio (opcional)
                  </span>
                  <input
                    type="time"
                    name="start_time"
                    aria-label="Hora de inicio del recargo"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Hora fin (opcional)
                  </span>
                  <input
                    type="time"
                    name="end_time"
                    aria-label="Hora de fin del recargo"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSurchargeModal(false)}
                  className="w-1/2 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] text-[#6E564F] hover:bg-[#F5EBDC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2 rounded-xl text-xs font-semibold bg-[#D46240] text-white hover:bg-[#b84e30]"
                >
                  Guardar Recargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
