'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Shared security helper: verifies the caller has an active session and is an admin.
 */
async function verifyAdminCaller() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, error: 'No autorizado: inicia sesión' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { supabase, user: null, error: 'Permisos insuficientes: se requiere rol de administrador' }
  }

  return { supabase, user, error: null }
}

// ============================================================================
// 1. READINESS / RESUMEN
// ============================================================================

export type ReadinessSummary = {
  officialPoints: {
    isReady: boolean
    statusText: string
    detail: string
    activePointsCount: number
    hasRules: boolean
    hasInterval: boolean
  }
  homeDelivery: {
    isReady: boolean
    statusText: string
    detail: string
    hasRules: boolean
    hasInterval: boolean
  }
  pricing: {
    isConfigured: boolean
    statusText: string
    detail: string
    hasKitchenLocation: boolean
    kitchenLabel: string
    activeTiersCount: number
  }
  cetys: {
    isReady: boolean
    statusText: string
    detail: string
    hasRules: boolean
    hasInterval: boolean
  }
}

export async function getAdminReadinessSummary(): Promise<{ summary?: ReadinessSummary; error?: string }> {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }
  const supabase = auth.supabase

  try {
    // 1. Official delivery points (canonical points excluding legacy "Otra ubicación" and "Pickup CETYS")
    const { data: points } = await supabase
      .from('zanita_delivery_points')
      .select('id, name, is_active, requires_special_pickup_permission')
      .neq('id', 'dddd0008-0000-0000-0000-000000000000')
      .neq('id', 'dddd0007-0000-0000-0000-000000000000')

    const activeOfficialPoints = (points || []).filter((p) => p.is_active)

    // 2. Active availability rules
    const { data: rules } = await supabase
      .from('zanita_availability_rules')
      .select('delivery_mode, delivery_point_id, slot_interval_minutes, is_active')
      .eq('is_active', true)

    const activeRules = rules || []
    const officialRules = activeRules.filter((r) => r.delivery_mode === 'official_point')
    const officialHasInterval = officialRules.some((r) => r.slot_interval_minutes && r.slot_interval_minutes > 0)
    const officialIsReady = activeOfficialPoints.length > 0 && officialRules.length > 0 && officialHasInterval

    // 3. Home delivery rules
    const homeRules = activeRules.filter((r) => r.delivery_mode === 'home_delivery')
    const homeHasInterval = homeRules.some((r) => r.slot_interval_minutes && r.slot_interval_minutes > 0)
    const homeIsReady = homeRules.length > 0 && homeHasInterval

    // 4. Kitchen base location & pricing tiers
    const { data: kitchenSetting } = await supabase
      .from('zanita_store_settings')
      .select('value')
      .eq('key', 'kitchen_base_location')
      .maybeSingle()

    const kitchenVal = kitchenSetting?.value as { label?: string; latitude?: number | null; longitude?: number | null } | null
    const hasKitchenLocation = !!(kitchenVal && kitchenVal.latitude !== null && kitchenVal.latitude !== undefined && kitchenVal.longitude !== null && kitchenVal.longitude !== undefined)

    const { data: pricingRules } = await supabase
      .from('zanita_delivery_pricing_rules')
      .select('id, is_active')
      .eq('is_active', true)

    const activeTiersCount = (pricingRules || []).length
    const pricingIsConfigured = hasKitchenLocation && activeTiersCount > 0

    // 5. CETYS pickup rules
    const cetysRules = activeRules.filter((r) => r.delivery_mode === 'cetys_pickup')
    const cetysHasInterval = cetysRules.some((r) => r.slot_interval_minutes && r.slot_interval_minutes > 0)
    const cetysIsReady = cetysRules.length > 0 && cetysHasInterval

    const summary: ReadinessSummary = {
      officialPoints: {
        isReady: officialIsReady,
        statusText: officialIsReady
          ? 'Configurado'
          : officialRules.length === 0
          ? 'Falta definir horarios'
          : !officialHasInterval
          ? 'Falta elegir intervalo'
          : activeOfficialPoints.length === 0
          ? 'Sin puntos activos'
          : 'Incompleto',
        detail: `${activeOfficialPoints.length} puntos activos, ${officialRules.length} reglas semanales`,
        activePointsCount: activeOfficialPoints.length,
        hasRules: officialRules.length > 0,
        hasInterval: officialHasInterval,
      },
      homeDelivery: {
        isReady: homeIsReady,
        statusText: homeIsReady
          ? 'Configurado'
          : homeRules.length === 0
          ? 'Falta definir horarios'
          : !homeHasInterval
          ? 'Falta elegir intervalo'
          : 'Incompleto',
        detail: homeRules.length > 0 ? `${homeRules.length} días configurados` : 'Sin horarios semanales definidos',
        hasRules: homeRules.length > 0,
        hasInterval: homeHasInterval,
      },
      pricing: {
        isConfigured: pricingIsConfigured,
        statusText: pricingIsConfigured ? 'Tarifa automática' : 'Por cotizar',
        detail: pricingIsConfigured
          ? `${activeTiersCount} rangos de distancia con base en ${kitchenVal?.label || 'Cocina'}`
          : !hasKitchenLocation
          ? 'Sin coordenadas de cocina base — los envíos se cotizarán manualmente'
          : 'Sin rangos de tarifas — los envíos se cotizarán manualmente',
        hasKitchenLocation,
        kitchenLabel: kitchenVal?.label || 'Taller Zanita',
        activeTiersCount,
      },
      cetys: {
        isReady: cetysIsReady,
        statusText: cetysIsReady
          ? 'Configurado'
          : cetysRules.length === 0
          ? 'Falta definir horarios'
          : !cetysHasInterval
          ? 'Falta elegir intervalo'
          : 'Incompleto',
        detail: cetysRules.length > 0 ? `${cetysRules.length} días activos (16:00–20:00)` : 'Sin reglas de pickup CETYS',
        hasRules: cetysRules.length > 0,
        hasInterval: cetysHasInterval,
      },
    }

    return { summary }
  } catch (err: unknown) {
    console.error('Error fetching admin readiness summary:', err)
    return { error: 'Error interno al consultar resumen operativo' }
  }
}

// ============================================================================
// 2. AVAILABILITY RULES (HORARIO HABITUAL)
// ============================================================================

export type WeeklyRuleRow = {
  id: string
  delivery_mode: 'official_point' | 'home_delivery' | 'cetys_pickup'
  delivery_point_id: string | null
  day_of_week: number
  open_time: string
  close_time: string
  slot_interval_minutes: number | null
  min_lead_minutes: number
  submission_cutoff_time: string | null
  is_active: boolean
}

export async function getWeeklyRules(deliveryMode?: string, deliveryPointId?: string | null) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  let query = auth.supabase
    .from('zanita_availability_rules')
    .select('*')

  if (deliveryMode) {
    query = query.eq('delivery_mode', deliveryMode)
  }

  if (deliveryPointId) {
    query = query.eq('delivery_point_id', deliveryPointId)
  } else {
    query = query.is('delivery_point_id', null)
  }

  const { data, error } = await query.order('day_of_week', { ascending: true })

  if (error) {
    console.error('Error fetching weekly rules:', error)
    return { error: 'Error al consultar horarios' }
  }

  return { rules: data as WeeklyRuleRow[] }
}

export async function saveWeeklyRule(rule: {
  id?: string
  delivery_mode: 'official_point' | 'home_delivery' | 'cetys_pickup'
  delivery_point_id?: string | null
  day_of_week: number
  open_time: string
  close_time: string
  slot_interval_minutes: number
  min_lead_minutes: number
  submission_cutoff_time?: string | null
  is_active: boolean
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  // Validation
  if (rule.day_of_week < 1 || rule.day_of_week > 7) {
    return { error: 'Día de la semana inválido (debe ser 1 a 7)' }
  }
  if (!rule.open_time || !rule.close_time || rule.open_time >= rule.close_time) {
    return { error: 'La hora de apertura debe ser anterior a la hora de cierre' }
  }
  if (!rule.slot_interval_minutes || rule.slot_interval_minutes <= 0) {
    return { error: 'Se debe especificar un intervalo de pedidos válido en minutos (ej. 15, 30, 45, 60)' }
  }
  if (rule.min_lead_minutes < 0) {
    return { error: 'La anticipación mínima no puede ser negativa' }
  }

  const payload = {
    delivery_mode: rule.delivery_mode,
    delivery_point_id: rule.delivery_point_id || null,
    day_of_week: rule.day_of_week,
    open_time: rule.open_time,
    close_time: rule.close_time,
    slot_interval_minutes: rule.slot_interval_minutes,
    min_lead_minutes: rule.min_lead_minutes,
    submission_cutoff_time: rule.submission_cutoff_time || null,
    is_active: rule.is_active,
  }

  let error
  if (rule.id) {
    const res = await auth.supabase
      .from('zanita_availability_rules')
      .update(payload)
      .eq('id', rule.id)
    error = res.error
  } else {
    // Check if active rule already exists for this (mode, point, dow)
    let dupCheck = auth.supabase
      .from('zanita_availability_rules')
      .select('id')
      .eq('delivery_mode', rule.delivery_mode)
      .eq('day_of_week', rule.day_of_week)
      .eq('is_active', true)

    if (rule.delivery_point_id) {
      dupCheck = dupCheck.eq('delivery_point_id', rule.delivery_point_id)
    } else {
      dupCheck = dupCheck.is('delivery_point_id', null)
    }

    const { data: existing } = await dupCheck.maybeSingle()

    if (existing) {
      const res = await auth.supabase
        .from('zanita_availability_rules')
        .update(payload)
        .eq('id', existing.id)
      error = res.error
    } else {
      const res = await auth.supabase
        .from('zanita_availability_rules')
        .insert(payload)
      error = res.error
    }
  }

  if (error) {
    console.error('Error saving weekly rule:', error)
    return { error: `No se pudo guardar el horario: ${error.message}` }
  }

  revalidatePath('/admin/disponibilidad')
  revalidatePath('/admin')
  return { success: true, message: 'Horario guardado correctamente' }
}

export async function deleteWeeklyRule(ruleId: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { error } = await auth.supabase
    .from('zanita_availability_rules')
    .delete()
    .eq('id', ruleId)

  if (error) {
    console.error('Error deleting weekly rule:', error)
    return { error: 'No se pudo eliminar el horario' }
  }

  revalidatePath('/admin/disponibilidad')
  revalidatePath('/admin')
  return { success: true, message: 'Horario eliminado' }
}

// ============================================================================
// 3. CALENDAR OVERRIDES & STAND MODE (EXCEPCIONES)
// ============================================================================

export type CalendarOverrideRow = {
  id: string
  override_date: string
  delivery_mode: string
  delivery_point_id: string | null
  status: 'open' | 'closed' | 'custom_schedule' | 'stand_mode'
  open_time: string | null
  close_time: string | null
  slot_interval_minutes: number | null
  min_lead_minutes: number | null
  submission_cutoff_time: string | null
  reason: string | null
  is_active: boolean
}

export async function getCalendarOverrides(startDate?: string, endDate?: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  let query = auth.supabase
    .from('zanita_calendar_overrides')
    .select('*')
    .eq('is_active', true)

  if (startDate) query = query.gte('override_date', startDate)
  if (endDate) query = query.lte('override_date', endDate)

  const { data, error } = await query.order('override_date', { ascending: true })

  if (error) {
    console.error('Error fetching calendar overrides:', error)
    return { error: 'Error al consultar excepciones de calendario' }
  }

  return { overrides: data as CalendarOverrideRow[] }
}

export async function saveCalendarOverride(override: {
  id?: string
  override_date: string
  delivery_mode: 'official_point' | 'home_delivery' | 'cetys_pickup' | 'all'
  delivery_point_id?: string | null
  status: 'open' | 'closed' | 'custom_schedule' | 'stand_mode'
  open_time?: string | null
  close_time?: string | null
  slot_interval_minutes?: number | null
  min_lead_minutes?: number | null
  submission_cutoff_time?: string | null
  reason?: string | null
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  if (!override.override_date) {
    return { error: 'Fecha requerida' }
  }

  if (override.status !== 'closed') {
    if (!override.open_time || !override.close_time || override.open_time >= override.close_time) {
      return { error: 'Horario especial inválido: la hora de inicio debe ser anterior a la hora de fin' }
    }
    if (!override.slot_interval_minutes || override.slot_interval_minutes <= 0) {
      return { error: 'Debes definir el intervalo de horarios para pedidos' }
    }
  }

  const payload = {
    override_date: override.override_date,
    delivery_mode: override.delivery_mode,
    delivery_point_id: override.delivery_point_id || null,
    status: override.status,
    open_time: override.status === 'closed' ? null : override.open_time,
    close_time: override.status === 'closed' ? null : override.close_time,
    slot_interval_minutes: override.status === 'closed' ? null : override.slot_interval_minutes,
    min_lead_minutes: override.status === 'closed' ? null : override.min_lead_minutes ?? 1440,
    submission_cutoff_time: override.status === 'closed' ? null : override.submission_cutoff_time || null,
    reason: override.reason || null,
    is_active: true,
  }

  let error
  if (override.id) {
    const res = await auth.supabase
      .from('zanita_calendar_overrides')
      .update(payload)
      .eq('id', override.id)
    error = res.error
  } else {
    // Check if override for date & mode exists
    let check = auth.supabase
      .from('zanita_calendar_overrides')
      .select('id')
      .eq('override_date', override.override_date)
      .eq('delivery_mode', override.delivery_mode)
      .eq('is_active', true)

    if (override.delivery_point_id) {
      check = check.eq('delivery_point_id', override.delivery_point_id)
    } else {
      check = check.is('delivery_point_id', null)
    }

    const { data: existing } = await check.maybeSingle()

    if (existing) {
      const res = await auth.supabase
        .from('zanita_calendar_overrides')
        .update(payload)
        .eq('id', existing.id)
      error = res.error
    } else {
      const res = await auth.supabase
        .from('zanita_calendar_overrides')
        .insert(payload)
      error = res.error
    }
  }

  if (error) {
    console.error('Error saving calendar override:', error)
    return { error: `No se pudo guardar la excepción: ${error.message}` }
  }

  revalidatePath('/admin/disponibilidad')
  revalidatePath('/admin')
  return { success: true, message: 'Excepción de calendario guardada' }
}

export async function deleteCalendarOverride(overrideId: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { error } = await auth.supabase
    .from('zanita_calendar_overrides')
    .delete()
    .eq('id', overrideId)

  if (error) {
    console.error('Error deleting calendar override:', error)
    return { error: 'No se pudo eliminar la excepción' }
  }

  revalidatePath('/admin/disponibilidad')
  revalidatePath('/admin')
  return { success: true, message: 'Excepción eliminada' }
}

// ============================================================================
// 4. AVAILABILITY BLOCKS (BLOQUEOS DE HORARIO)
// ============================================================================

export type AvailabilityBlockRow = {
  id: string
  block_date: string
  delivery_mode: string
  delivery_point_id: string | null
  start_time: string
  end_time: string
  reason: string | null
  is_active: boolean
}

export async function getAvailabilityBlocks(date?: string, deliveryMode?: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  let query = auth.supabase
    .from('zanita_availability_blocks')
    .select('*')
    .eq('is_active', true)

  if (date) query = query.eq('block_date', date)
  if (deliveryMode && deliveryMode !== 'all') query = query.eq('delivery_mode', deliveryMode)

  const { data, error } = await query.order('block_date', { ascending: true }).order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching availability blocks:', error)
    return { error: 'Error al consultar bloqueos' }
  }

  return { blocks: data as AvailabilityBlockRow[] }
}

export async function saveAvailabilityBlock(block: {
  id?: string
  block_date: string
  delivery_mode: 'official_point' | 'home_delivery' | 'cetys_pickup' | 'all'
  delivery_point_id?: string | null
  start_time: string
  end_time: string
  reason?: string | null
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  if (!block.block_date) return { error: 'Fecha requerida' }
  if (!block.start_time || !block.end_time || block.start_time >= block.end_time) {
    return { error: 'La hora de inicio del bloqueo debe ser anterior a la de fin' }
  }

  const payload = {
    block_date: block.block_date,
    delivery_mode: block.delivery_mode,
    delivery_point_id: block.delivery_point_id || null,
    start_time: block.start_time,
    end_time: block.end_time,
    reason: block.reason || null,
    is_active: true,
  }

  let error
  if (block.id) {
    const res = await auth.supabase
      .from('zanita_availability_blocks')
      .update(payload)
      .eq('id', block.id)
    error = res.error
  } else {
    const res = await auth.supabase
      .from('zanita_availability_blocks')
      .insert(payload)
    error = res.error
  }

  if (error) {
    console.error('Error saving availability block:', error)
    return { error: `No se pudo guardar el bloqueo: ${error.message}` }
  }

  revalidatePath('/admin/disponibilidad')
  revalidatePath('/admin')
  return { success: true, message: 'Bloqueo guardado exitosamente' }
}

export async function deleteAvailabilityBlock(blockId: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { error } = await auth.supabase
    .from('zanita_availability_blocks')
    .delete()
    .eq('id', blockId)

  if (error) {
    console.error('Error deleting availability block:', error)
    return { error: 'No se pudo eliminar el bloqueo' }
  }

  revalidatePath('/admin/disponibilidad')
  revalidatePath('/admin')
  return { success: true, message: 'Bloqueo eliminado' }
}

// ============================================================================
// 5. OFFICIAL DELIVERY POINTS
// ============================================================================

export type DeliveryPointRow = {
  id: string
  name: string
  address: string | null
  instructions: string | null
  public_reference: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  display_order: number
}

export async function getOfficialDeliveryPoints() {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  // Exclude legacy "Otra ubicación" (dddd0008) and "Pickup CETYS" (dddd0007) from physical points manager
  const { data, error } = await auth.supabase
    .from('zanita_delivery_points')
    .select('*')
    .neq('id', 'dddd0008-0000-0000-0000-000000000000')
    .neq('id', 'dddd0007-0000-0000-0000-000000000000')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching delivery points:', error)
    return { error: 'Error al consultar puntos de entrega' }
  }

  return { points: data as DeliveryPointRow[] }
}

export async function updateDeliveryPoint(pointId: string, updates: {
  is_active?: boolean
  public_reference?: string | null
  instructions?: string | null
  latitude?: number | null
  longitude?: number | null
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { error } = await auth.supabase
    .from('zanita_delivery_points')
    .update(updates)
    .eq('id', pointId)

  if (error) {
    console.error('Error updating delivery point:', error)
    return { error: `No se pudo actualizar el punto: ${error.message}` }
  }

  revalidatePath('/admin/entregas')
  revalidatePath('/admin')
  return { success: true, message: 'Punto de entrega actualizado' }
}

// ============================================================================
// 6. KITCHEN BASE LOCATION
// ============================================================================

export type KitchenBaseLocation = {
  label: string
  latitude: number | null
  longitude: number | null
}

export async function getKitchenBaseLocation() {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { data, error } = await auth.supabase
    .from('zanita_store_settings')
    .select('value')
    .eq('key', 'kitchen_base_location')
    .maybeSingle()

  if (error) {
    console.error('Error fetching kitchen base location:', error)
    return { error: 'Error al consultar ubicación de cocina' }
  }

  const loc = (data?.value as KitchenBaseLocation) || {
    label: 'Taller Zanita Tijuana',
    latitude: null,
    longitude: null,
  }

  return { location: loc }
}

export async function saveKitchenBaseLocation(base: {
  label: string
  latitude: number | null
  longitude: number | null
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  if (base.latitude !== null && (base.latitude < -90 || base.latitude > 90)) {
    return { error: 'Latitud inválida (debe estar entre -90 y 90)' }
  }
  if (base.longitude !== null && (base.longitude < -180 || base.longitude > 180)) {
    return { error: 'Longitud inválida (debe estar entre -180 y 180)' }
  }

  const { error } = await auth.supabase
    .from('zanita_store_settings')
    .upsert({
      key: 'kitchen_base_location',
      value: {
        label: base.label || 'Taller Zanita Tijuana',
        latitude: base.latitude,
        longitude: base.longitude,
      },
      is_public: false,
    })

  if (error) {
    console.error('Error saving kitchen base location:', error)
    return { error: `No se pudo guardar la ubicación base: ${error.message}` }
  }

  revalidatePath('/admin/entregas')
  revalidatePath('/admin')
  return { success: true, message: 'Ubicación base guardada' }
}

export async function removeKitchenBaseLocation() {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { error } = await auth.supabase
    .from('zanita_store_settings')
    .upsert({
      key: 'kitchen_base_location',
      value: {
        label: 'Taller Zanita Tijuana',
        latitude: null,
        longitude: null,
      },
      is_public: false,
    })

  if (error) {
    console.error('Error removing kitchen base coordinates:', error)
    return { error: 'No se pudo quitar la ubicación base' }
  }

  revalidatePath('/admin/entregas')
  revalidatePath('/admin')
  return { success: true, message: 'Ubicación quitada (los envíos serán por cotizar)' }
}

// ============================================================================
// 7. DELIVERY PRICING RULES (TARIFAS POR DISTANCIA)
// ============================================================================

export type DeliveryPricingRuleRow = {
  id: string
  min_distance_km: number
  max_distance_km: number | null
  fee_cents: number | null
  requires_manual_quote: boolean
  priority: number
  is_active: boolean
}

export async function getDeliveryPricingRules() {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { data, error } = await auth.supabase
    .from('zanita_delivery_pricing_rules')
    .select('*')
    .order('min_distance_km', { ascending: true })

  if (error) {
    console.error('Error fetching pricing rules:', error)
    return { error: 'Error al consultar tarifas' }
  }

  return { rules: data as DeliveryPricingRuleRow[] }
}

export async function saveDeliveryPricingRule(rule: {
  id?: string
  min_distance_km: number
  max_distance_km: number | null
  fee_cents: number | null
  requires_manual_quote: boolean
  is_active: boolean
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  // 1. Basic validation
  if (rule.min_distance_km < 0) {
    return { error: 'La distancia mínima debe ser mayor o igual a 0 km' }
  }
  if (rule.max_distance_km !== null && rule.max_distance_km <= rule.min_distance_km) {
    return { error: 'La distancia máxima debe ser estrictamente mayor a la mínima' }
  }
  if (!rule.requires_manual_quote && (rule.fee_cents === null || rule.fee_cents < 0)) {
    return { error: 'El costo de envío debe ser mayor o igual a $0 o marcarse como cotización manual' }
  }

  // 2. Overlap validation with active rules
  if (rule.is_active) {
    const { data: activeRules, error: fetchErr } = await auth.supabase
      .from('zanita_delivery_pricing_rules')
      .select('id, min_distance_km, max_distance_km')
      .eq('is_active', true)

    if (fetchErr) {
      return { error: 'Error al verificar solapamiento de rangos de distancia' }
    }

    const newMin = Number(rule.min_distance_km)
    const newMax = rule.max_distance_km !== null ? Number(rule.max_distance_km) : Infinity

    for (const other of activeRules || []) {
      if (rule.id && other.id === rule.id) continue

      const otherMin = Number(other.min_distance_km)
      const otherMax = other.max_distance_km !== null ? Number(other.max_distance_km) : Infinity

      // Interval overlap test: [newMin, newMax) intersects [otherMin, otherMax)
      if (Math.max(newMin, otherMin) < Math.min(newMax, otherMax)) {
        return {
          error: `El rango (${newMin} - ${newMax === Infinity ? '∞' : newMax} km) se empalma con un rango activo existente (${otherMin} - ${otherMax === Infinity ? '∞' : otherMax} km). Modifica o desactiva la regla anterior primero.`,
        }
      }
    }
  }

  const payload = {
    min_distance_km: rule.min_distance_km,
    max_distance_km: rule.max_distance_km,
    fee_cents: rule.requires_manual_quote ? null : rule.fee_cents,
    requires_manual_quote: rule.requires_manual_quote,
    is_active: rule.is_active,
  }

  let error
  if (rule.id) {
    const res = await auth.supabase
      .from('zanita_delivery_pricing_rules')
      .update(payload)
      .eq('id', rule.id)
    error = res.error
  } else {
    const res = await auth.supabase
      .from('zanita_delivery_pricing_rules')
      .insert(payload)
    error = res.error
  }

  if (error) {
    console.error('Error saving pricing rule:', error)
    return { error: `No se pudo guardar la tarifa: ${error.message}` }
  }

  revalidatePath('/admin/entregas')
  revalidatePath('/admin')
  return { success: true, message: 'Tarifa guardada correctamente' }
}

export async function deleteDeliveryPricingRule(ruleId: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { error } = await auth.supabase
    .from('zanita_delivery_pricing_rules')
    .delete()
    .eq('id', ruleId)

  if (error) {
    console.error('Error deleting pricing rule:', error)
    return { error: 'No se pudo eliminar la tarifa' }
  }

  revalidatePath('/admin/entregas')
  revalidatePath('/admin')
  return { success: true, message: 'Tarifa eliminada' }
}

// ============================================================================
// 8. DELIVERY SURCHARGES (RECARGOS)
// ============================================================================

export type DeliverySurchargeRow = {
  id: string
  name: string
  delivery_mode: string
  day_of_week: number | null
  start_time: string | null
  end_time: string | null
  surcharge_cents: number
  is_active: boolean
}

export async function getDeliverySurcharges() {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { data, error } = await auth.supabase
    .from('zanita_delivery_surcharges')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching surcharges:', error)
    return { error: 'Error al consultar recargos' }
  }

  return { surcharges: data as DeliverySurchargeRow[] }
}

export async function saveDeliverySurcharge(surcharge: {
  id?: string
  name: string
  delivery_mode?: 'home_delivery' | 'all'
  day_of_week?: number | null
  start_time?: string | null
  end_time?: string | null
  surcharge_cents: number
  is_active: boolean
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  if (!surcharge.name.trim()) return { error: 'El nombre del recargo es obligatorio' }
  if (surcharge.surcharge_cents < 0) return { error: 'El monto del recargo debe ser positivo' }

  const payload = {
    name: surcharge.name.trim(),
    delivery_mode: surcharge.delivery_mode || 'home_delivery',
    day_of_week: surcharge.day_of_week || null,
    start_time: surcharge.start_time || null,
    end_time: surcharge.end_time || null,
    surcharge_cents: surcharge.surcharge_cents,
    is_active: surcharge.is_active,
  }

  let error
  if (surcharge.id) {
    const res = await auth.supabase
      .from('zanita_delivery_surcharges')
      .update(payload)
      .eq('id', surcharge.id)
    error = res.error
  } else {
    const res = await auth.supabase
      .from('zanita_delivery_surcharges')
      .insert(payload)
    error = res.error
  }

  if (error) {
    console.error('Error saving surcharge:', error)
    return { error: `No se pudo guardar el recargo: ${error.message}` }
  }

  revalidatePath('/admin/entregas')
  revalidatePath('/admin')
  return { success: true, message: 'Recargo guardado' }
}

export async function deleteDeliverySurcharge(surchargeId: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  const { error } = await auth.supabase
    .from('zanita_delivery_surcharges')
    .delete()
    .eq('id', surchargeId)

  if (error) {
    console.error('Error deleting surcharge:', error)
    return { error: 'No se pudo eliminar el recargo' }
  }

  revalidatePath('/admin/entregas')
  revalidatePath('/admin')
  return { success: true, message: 'Recargo eliminado' }
}

// ============================================================================
// 9. USERS DIRECTORY & CETYS PICKUP TOGGLE
// ============================================================================

export type CustomerProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  cetys_pickup_enabled: boolean
  role: string
  created_at: string
}

export async function getCustomersList(searchQuery?: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  let query = auth.supabase
    .from('profiles')
    .select('id, full_name, email, phone, cetys_pickup_enabled, role, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = `%${searchQuery.trim()}%`
    query = query.or(`full_name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error loading customers:', error)
    return { error: 'Error al consultar clientes' }
  }

  return { customers: data as CustomerProfileRow[] }
}

export async function toggleCetysPickup(userId: string, enabled: boolean) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'Error de autenticación' }

  // Verify target is a customer (small privilege surface: no mutating admin roles)
  const { data: targetProfile } = await auth.supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!targetProfile || targetProfile.role !== 'customer') {
    return { error: 'Solo se pueden modificar permisos de clientes' }
  }

  const { error } = await auth.supabase
    .from('profiles')
    .update({ cetys_pickup_enabled: enabled })
    .eq('id', userId)

  if (error) {
    console.error('Error toggling pickup:', error)
    return { error: 'Error interno al actualizar el permiso' }
  }

  revalidatePath('/admin/usuarios')
  revalidatePath('/admin')
  return { success: true, message: enabled ? 'Acceso CETYS habilitado' : 'Acceso CETYS deshabilitado' }
}
