'use client'

import React, { useState, useTransition, useId } from 'react'
import {
  saveWeeklyRule,
  deleteWeeklyRule,
  saveCalendarOverride,
  deleteCalendarOverride,
  saveAvailabilityBlock,
  deleteAvailabilityBlock,
  saveCrossZoneTransitionBuffer,
  type WeeklyRuleRow,
  type CalendarOverrideRow,
  type AvailabilityBlockRow,
  type DeliveryPointRow,
} from '@/app/actions/admin'
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Store,
  Truck,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react'

const DAYS_OF_WEEK = [
  { day: 1, name: 'Lunes' },
  { day: 2, name: 'Martes' },
  { day: 3, name: 'Miércoles' },
  { day: 4, name: 'Jueves' },
  { day: 5, name: 'Viernes' },
  { day: 6, name: 'Sábado' },
  { day: 7, name: 'Domingo' },
]

const QUICK_INTERVALS = [15, 30, 60]

interface Props {
  initialRules: WeeklyRuleRow[]
  initialOverrides: CalendarOverrideRow[]
  initialBlocks: AvailabilityBlockRow[]
  officialPoints: DeliveryPointRow[]
  initialBufferMinutes?: number
  defaultMode?: string
  defaultAction?: string
}

interface DayScheduleRowProps {
  day: number
  name: string
  rule?: WeeklyRuleRow
  isPending: boolean
  onSave: (day: number, formData: FormData) => void
  onDelete?: (ruleId: string) => void
}

function DayScheduleRow({ day, name, rule, isPending, onSave, onDelete }: DayScheduleRowProps) {
  const [isActive, setIsActive] = useState<boolean>(rule?.is_active ?? false)
  const [scheduleType, setScheduleType] = useState<'interval' | 'fixed_times'>(
    rule?.schedule_type || 'interval'
  )

  // Times
  const [openTime, setOpenTime] = useState<string>(rule?.open_time ? rule.open_time.slice(0, 5) : '')
  const [closeTime, setCloseTime] = useState<string>(rule?.close_time ? rule.close_time.slice(0, 5) : '')

  // Intervals
  const extInterval = rule?.slot_interval_minutes ?? null
  const isStandardInterval = extInterval !== null && [15, 30, 60].includes(extInterval)
  const isLegacyInterval = extInterval !== null && !isStandardInterval
  const [intervalSelect, setIntervalSelect] = useState<string>(
    extInterval === null ? '' : String(extInterval)
  )

  // Fixed times
  const initialFixedSlots = rule?.fixed_slots?.map((s) => s.slot_time.slice(0, 5)) || []
  const [fixedSlots, setFixedSlots] = useState<string[]>(initialFixedSlots)
  const [newSlotInput, setNewSlotInput] = useState<string>('')

  // Lead
  const extLeadMinutes = rule?.min_lead_minutes ?? null
  const extLeadHours = extLeadMinutes !== null ? Math.floor(extLeadMinutes / 60) : null
  const isExtHours = extLeadMinutes !== null && extLeadHours! >= 1 && extLeadMinutes % 60 === 0
  const [leadVal, setLeadVal] = useState<string>(
    extLeadMinutes !== null ? (isExtHours ? String(extLeadHours) : String(extLeadMinutes)) : ''
  )
  const [leadUnit, setLeadUnit] = useState<string>(isExtHours ? 'hours' : 'minutes')

  // Cutoff
  const [useCutoff, setUseCutoff] = useState<boolean>(!!rule?.submission_cutoff_time)
  const [cutoffTime, setCutoffTime] = useState<string>(
    rule?.submission_cutoff_time ? rule.submission_cutoff_time.slice(0, 5) : ''
  )

  const handleAddFixedSlot = () => {
    if (!newSlotInput) return
    if (!fixedSlots.includes(newSlotInput)) {
      setFixedSlots([...fixedSlots, newSlotInput].sort())
    }
    setNewSlotInput('')
  }

  const handleRemoveFixedSlot = (slotToRemove: string) => {
    setFixedSlots(fixedSlots.filter((s) => s !== slotToRemove))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    formData.set('schedule_type', scheduleType)

    if (scheduleType === 'interval') {
      formData.set('slot_interval_minutes', intervalSelect)
    } else {
      formData.set('fixed_slots_json', JSON.stringify(fixedSlots))
    }

    onSave(day, formData)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-5 rounded-2xl border transition-all ${
        isActive
          ? 'bg-white border-[#E8DCC4] shadow-xs'
          : 'bg-[#FAF7F2]/60 border-[#F2ECE1] opacity-75'
      }`}
    >
      <div className="flex flex-col gap-4">
        {/* Row Header: Active Toggle & Schedule Strategy Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2ECE1] pb-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id={`day-${day}-active`}
              name="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#A73832] border-[#E8DCC4] focus:ring-[#A73832] cursor-pointer"
            />
            <label htmlFor={`day-${day}-active`} className="font-semibold text-base text-[#261C19] cursor-pointer">
              {name}
            </label>
          </div>

          {/* Strategy Toggle */}
          <div className="flex items-center space-x-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8DCC4]/60 text-xs">
            <button
              type="button"
              onClick={() => setScheduleType('interval')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                scheduleType === 'interval'
                  ? 'bg-white text-[#261C19] shadow-2xs font-semibold'
                  : 'text-[#6E564F] hover:text-[#261C19]'
              }`}
            >
              Cada cierto tiempo
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('fixed_times')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                scheduleType === 'fixed_times'
                  ? 'bg-white text-[#261C19] shadow-2xs font-semibold'
                  : 'text-[#6E564F] hover:text-[#261C19]'
              }`}
            >
              Horas específicas
            </button>
          </div>
        </div>

        {/* Operational Settings Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Time Window */}
          <div>
            <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
              Rango horario
            </span>
            <div className="flex items-center space-x-1">
              <input
                type="time"
                name="open_time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                placeholder="--:--"
                aria-label={`Hora de apertura para ${name}`}
                className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
              />
              <span className="text-xs text-[#6E564F]">a</span>
              <input
                type="time"
                name="close_time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                placeholder="--:--"
                aria-label={`Hora de cierre para ${name}`}
                className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
              />
            </div>
          </div>

          {/* Strategy Specific Field: Interval OR Fixed Times */}
          {scheduleType === 'interval' ? (
            <div>
              <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                Intervalo de pedidos
              </span>
              <div className="space-y-1">
                <select
                  name="slot_interval_minutes"
                  value={intervalSelect}
                  onChange={(e) => setIntervalSelect(e.target.value)}
                  aria-label={`Intervalo de pedidos para ${name}`}
                  className={`w-full text-xs border rounded-lg px-2 py-1.5 bg-[#FAF7F2] text-[#261C19] ${
                    isActive && !intervalSelect ? 'border-amber-400 bg-amber-50/50' : 'border-[#E8DCC4]'
                  }`}
                >
                  <option value="">⚠️ Elegir intervalo...</option>
                  {QUICK_INTERVALS.map((mins) => (
                    <option key={mins} value={mins}>
                      Cada {mins} minutos
                    </option>
                  ))}
                  {isLegacyInterval && (
                    <option value={String(extInterval)}>
                      Cada {extInterval} min (anterior)
                    </option>
                  )}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                Horas fijas de entrega
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1">
                  <input
                    type="time"
                    value={newSlotInput}
                    onChange={(e) => setNewSlotInput(e.target.value)}
                    placeholder="--:--"
                    aria-label={`Agregar hora fija para ${name}`}
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1 text-[#261C19]"
                  />
                  <button
                    type="button"
                    onClick={handleAddFixedSlot}
                    className="px-2 py-1 bg-[#261C19] text-white rounded-lg text-xs hover:bg-[#A73832] transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {fixedSlots.length === 0 ? (
                  <p className="text-[10px] text-amber-700 italic">Sin horarios fijos agregados</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {fixedSlots.map((slot) => (
                      <span
                        key={slot}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-[#FAF7F2] border border-[#E8DCC4] text-[#261C19] font-medium"
                      >
                        {slot}
                        <button
                          type="button"
                          onClick={() => handleRemoveFixedSlot(slot)}
                          className="ml-1 text-[#6E564F] hover:text-red-700 cursor-pointer"
                          aria-label={`Eliminar hora fija ${slot}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Minimum Lead Time */}
          <div>
            <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
              Anticipación mínima
            </span>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                name="lead_value"
                value={leadVal}
                onChange={(e) => setLeadVal(e.target.value)}
                placeholder="Ej. 24"
                min="0"
                aria-label={`Valor de anticipación mínima para ${name}`}
                className="w-20 text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
              />
              <select
                name="lead_unit"
                value={leadUnit}
                onChange={(e) => setLeadUnit(e.target.value)}
                aria-label={`Unidad de anticipación mínima para ${name}`}
                className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
              >
                <option value="hours">Horas</option>
                <option value="minutes">Minutos</option>
              </select>
            </div>
          </div>

          {/* Cutoff Time */}
          <div>
            <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
              Hora límite (Cutoff)
            </span>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`cutoff-${day}`}
                name="use_cutoff"
                checked={useCutoff}
                onChange={(e) => setUseCutoff(e.target.checked)}
                className="w-4 h-4 rounded text-[#A73832] border-[#E8DCC4] cursor-pointer"
              />
              <input
                type="time"
                name="submission_cutoff_time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                disabled={!useCutoff}
                placeholder="--:--"
                aria-label={`Hora límite de recepción para ${name}`}
                className={`w-full text-xs border rounded-lg px-2 py-1.5 text-[#261C19] ${
                  useCutoff ? 'bg-[#FAF7F2] border-[#E8DCC4]' : 'bg-gray-100/50 border-gray-200 text-gray-400'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 justify-end pt-2 border-t border-[#F2ECE1]">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#261C19] text-white hover:bg-[#A73832] transition-colors shadow-xs cursor-pointer"
          >
            Guardar {name}
          </button>
          {rule && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(rule.id)}
              disabled={isPending}
              className="p-2 text-[#6E564F] hover:text-red-700 transition-colors cursor-pointer"
              title="Eliminar regla"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

export default function AvailabilityClient({
  initialRules,
  initialOverrides,
  initialBlocks,
  officialPoints,
  initialBufferMinutes = 30,
  defaultMode = 'official_point',
  defaultAction,
}: Props) {
  const [selectedMode, setSelectedMode] = useState<'official_point' | 'home_delivery' | 'cetys_pickup'>(
    defaultMode as 'official_point' | 'home_delivery' | 'cetys_pickup'
  )
  const [selectedPointId, setSelectedPointId] = useState<string>('all')

  const [rules, setRules] = useState<WeeklyRuleRow[]>(initialRules)
  const [overrides, setOverrides] = useState<CalendarOverrideRow[]>(initialOverrides)
  const [blocks, setBlocks] = useState<AvailabilityBlockRow[]>(initialBlocks)
  const [bufferMinutes, setBufferMinutes] = useState<number>(initialBufferMinutes)
  const [savingBuffer, setSavingBuffer] = useState<boolean>(false)

  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().slice(0, 10))

  // Modals & Panels
  const [showStandModal, setShowStandModal] = useState<boolean>(defaultAction === 'stand')
  const [showBlockModal, setShowBlockModal] = useState<boolean>(defaultAction === 'block')

  // Stand CETYS Modal form state (NO invented defaults)
  const [standDate, setStandDate] = useState<string>('')
  const [standOpen, setStandOpen] = useState<string>('')
  const [standClose, setStandClose] = useState<string>('')
  const [standLead, setStandLead] = useState<string>('')
  const [standInterval, setStandInterval] = useState<string>('')
  const [standIntervalCustom, setStandIntervalCustom] = useState<string>('')
  const [standReason, setStandReason] = useState<string>('')

  // Date override form state (Section B)
  const [overrideStatus, setOverrideStatus] = useState<'closed' | 'custom_schedule'>('closed')
  const [overrideMode, setOverrideMode] = useState<'all' | 'official_point' | 'home_delivery' | 'cetys_pickup'>('all')
  const [overrideOpen, setOverrideOpen] = useState<string>('')
  const [overrideClose, setOverrideClose] = useState<string>('')
  const [overrideInterval, setOverrideInterval] = useState<string>('')
  const [overrideIntervalCustom, setOverrideIntervalCustom] = useState<string>('')
  const [overrideLead, setOverrideLead] = useState<string>('')
  const [overrideReason, setOverrideReason] = useState<string>('')

  // Block Modal form state
  const [blockStartTime, setBlockStartTime] = useState<string>('')
  const [blockEndTime, setBlockEndTime] = useState<string>('')
  const [blockReason, setBlockReason] = useState<string>('')
  const [blockDate, setBlockDate] = useState<string>(selectedDateStr)
  const [blockMode, setBlockMode] = useState<'all' | 'official_point' | 'home_delivery' | 'cetys_pickup'>('all')

  // Accessible IDs for labels
  const baseId = useId()

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4500)
  }

  // Filter rules for current tab and point
  const currentRules = rules.filter((r) => {
    if (r.delivery_mode !== selectedMode) return false
    if (selectedMode === 'official_point') {
      return selectedPointId === 'all' ? r.delivery_point_id === null : r.delivery_point_id === selectedPointId
    }
    return true
  })

  // Open Stand Modal with clean state
  const openStandModal = (dateStr?: string) => {
    setStandDate(dateStr || '')
    setStandOpen('')
    setStandClose('')
    setStandLead('')
    setStandInterval('')
    setStandIntervalCustom('')
    setStandReason('')
    setShowStandModal(true)
  }

  // Open Block Modal with clean state
  const openBlockModal = (dateStr?: string) => {
    setBlockDate(dateStr || selectedDateStr)
    setBlockStartTime('')
    setBlockEndTime('')
    setBlockReason('')
    setBlockMode('all')
    setShowBlockModal(true)
  }

  // Validation for Stand CETYS
  const effectiveStandInterval =
    standInterval === 'custom' ? parseInt(standIntervalCustom, 10) : parseInt(standInterval, 10)
  const leadNum = parseInt(standLead, 10)
  const isStandValid =
    standDate.trim() !== '' &&
    standOpen.trim() !== '' &&
    standClose.trim() !== '' &&
    standOpen < standClose &&
    !isNaN(leadNum) &&
    leadNum > 0 &&
    !isNaN(effectiveStandInterval) &&
    effectiveStandInterval > 0

  // ==========================================================================
  // HANDLERS: WEEKLY RULES
  // ==========================================================================
  const handleSaveDaySchedule = (dayOfWeek: number, formData: FormData) => {
    const isActive = formData.get('is_active') === 'on'
    const scheduleType = (formData.get('schedule_type') as 'interval' | 'fixed_times') || 'interval'
    const openTime = (formData.get('open_time') as string)?.trim() || ''
    const closeTime = (formData.get('close_time') as string)?.trim() || ''
    const intervalStr = (formData.get('slot_interval_minutes') as string)?.trim() || ''
    const fixedSlotsJson = (formData.get('fixed_slots_json') as string)?.trim() || '[]'
    const leadValStr = (formData.get('lead_value') as string)?.trim() || ''
    const leadUnit = formData.get('lead_unit') as string
    const useCutoff = formData.get('use_cutoff') === 'on'
    const cutoffTime = useCutoff ? ((formData.get('submission_cutoff_time') as string)?.trim() || null) : null

    let parsedFixedSlots: string[] = []
    try {
      parsedFixedSlots = JSON.parse(fixedSlotsJson)
    } catch {
      parsedFixedSlots = []
    }

    const slotInterval = intervalStr ? parseInt(intervalStr, 10) : null
    const leadVal = leadValStr !== '' ? Number(leadValStr) : null

    if (isActive) {
      if (!openTime || !closeTime) {
        showNotification('error', 'Debes ingresar el horario completo (apertura y cierre) para un día activo')
        return
      }
      if (openTime >= closeTime) {
        showNotification('error', 'La hora de inicio debe ser anterior a la hora de cierre')
        return
      }
      if (scheduleType === 'interval') {
        if (!slotInterval || isNaN(slotInterval) || slotInterval <= 0) {
          showNotification('error', 'Debes definir un intervalo de pedidos válido (ej. 15, 30, 60 min)')
          return
        }
      } else {
        if (parsedFixedSlots.length === 0) {
          showNotification('error', 'Debes agregar al menos un horario fijo (ej. 15:40) para este día')
          return
        }
      }
      if (leadVal === null || isNaN(leadVal) || leadVal < 0) {
        showNotification('error', 'Debes definir una anticipación mínima válida en horas o minutos')
        return
      }
      if (useCutoff && !cutoffTime) {
        showNotification('error', 'Debes especificar la hora límite (cutoff) o desmarcar la casilla')
        return
      }
    }

    const existingRule = currentRules.find((r) => r.day_of_week === dayOfWeek)
    const finalSlotInterval = scheduleType === 'interval' ? (slotInterval || existingRule?.slot_interval_minutes || 30) : null
    const finalOpenTime = openTime || existingRule?.open_time || '00:00:00'
    const finalCloseTime = closeTime || existingRule?.close_time || '00:00:00'
    const minLeadMinutes = leadVal !== null ? (leadUnit === 'hours' ? leadVal * 60 : leadVal) : (existingRule?.min_lead_minutes ?? 1440)

    const targetDeliveryPointId =
      selectedMode === 'official_point'
        ? (selectedPointId !== 'all' ? selectedPointId : null)
        : (existingRule?.delivery_point_id ?? null)

    startTransition(async () => {
      const res = await saveWeeklyRule({
        id: existingRule?.id,
        delivery_mode: selectedMode,
        delivery_point_id: targetDeliveryPointId,
        day_of_week: dayOfWeek,
        schedule_type: scheduleType,
        open_time: finalOpenTime,
        close_time: finalCloseTime,
        slot_interval_minutes: finalSlotInterval,
        min_lead_minutes: minLeadMinutes,
        submission_cutoff_time: cutoffTime,
        is_active: isActive,
        fixed_slots: scheduleType === 'fixed_times' ? parsedFixedSlots : undefined,
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', res.message || 'Horario guardado')
        // Optimistic update
        setRules((prev) => {
          const next = prev.filter(
            (r) => !(r.delivery_mode === selectedMode && r.day_of_week === dayOfWeek && r.delivery_point_id === targetDeliveryPointId)
          )
          next.push({
            id: existingRule?.id || `opt-${Date.now()}`,
            delivery_mode: selectedMode,
            delivery_point_id: targetDeliveryPointId,
            day_of_week: dayOfWeek,
            schedule_type: scheduleType,
            open_time: finalOpenTime,
            close_time: finalCloseTime,
            slot_interval_minutes: finalSlotInterval,
            min_lead_minutes: minLeadMinutes,
            submission_cutoff_time: cutoffTime,
            is_active: isActive,
            fixed_slots: scheduleType === 'fixed_times' ? parsedFixedSlots.map((t) => ({
              id: `slot-${Date.now()}-${t}`,
              slot_time: t,
              is_active: true,
              display_order: 1,
            })) : [],
          })
          return next
        })
      }
    })
  }

  const handleDeleteRule = (ruleId: string) => {
    if (!confirm('¿Seguro que deseas desactivar este horario?')) return

    startTransition(async () => {
      const res = await deleteWeeklyRule(ruleId)
      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Horario eliminado')
        setRules((prev) => prev.filter((r) => r.id !== ruleId))
      }
    })
  }

  // ==========================================================================
  // HANDLERS: CALENDAR OVERRIDES
  // ==========================================================================
  const handleSaveDateOverride = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const effectiveInterval =
      overrideInterval === 'custom' ? parseInt(overrideIntervalCustom, 10) : parseInt(overrideInterval, 10)
    const leadHours = parseInt(overrideLead, 10)

    if (overrideStatus === 'custom_schedule') {
      if (!overrideOpen || !overrideClose) {
        showNotification('error', 'Debes ingresar el horario completo de inicio y término para el horario especial')
        return
      }
      if (overrideOpen >= overrideClose) {
        showNotification('error', 'La hora de inicio debe ser menor a la hora de fin')
        return
      }
      if (isNaN(effectiveInterval) || effectiveInterval <= 0) {
        showNotification('error', 'Debes seleccionar o ingresar un intervalo de pedidos válido mayor a 0')
        return
      }
      if (isNaN(leadHours) || leadHours <= 0) {
        showNotification('error', 'Debes seleccionar las horas de anticipación mínima')
        return
      }
    }

    startTransition(async () => {
      const res = await saveCalendarOverride({
        override_date: selectedDateStr,
        delivery_mode: overrideMode,
        status: overrideStatus,
        open_time: overrideStatus === 'closed' ? null : overrideOpen,
        close_time: overrideStatus === 'closed' ? null : overrideClose,
        slot_interval_minutes: overrideStatus === 'closed' ? null : effectiveInterval,
        min_lead_minutes: overrideStatus === 'closed' ? null : leadHours * 60,
        submission_cutoff_time: null,
        reason: overrideReason.trim() || null,
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', res.message || 'Excepción guardada')
        // Optimistic refresh
        setOverrides((prev) => {
          const next = prev.filter((o) => !(o.override_date === selectedDateStr && o.delivery_mode === overrideMode))
          next.push({
            id: `opt-${Date.now()}`,
            override_date: selectedDateStr,
            delivery_mode: overrideMode,
            delivery_point_id: null,
            status: overrideStatus,
            open_time: overrideStatus === 'closed' ? null : overrideOpen,
            close_time: overrideStatus === 'closed' ? null : overrideClose,
            slot_interval_minutes: overrideStatus === 'closed' ? null : effectiveInterval,
            min_lead_minutes: overrideStatus === 'closed' ? null : leadHours * 60,
            submission_cutoff_time: null,
            reason: overrideReason.trim() || null,
            is_active: true,
          })
          return next
        })
      }
    })
  }

  const handleDeleteOverride = (overrideId: string) => {
    if (!confirm('¿Restablecer esta fecha al horario habitual?')) return

    startTransition(async () => {
      const res = await deleteCalendarOverride(overrideId)
      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Fecha restablecida al horario habitual')
        setOverrides((prev) => prev.filter((o) => o.id !== overrideId))
      }
    })
  }

  // ==========================================================================
  // HANDLERS: CETYS STAND SHORTCUT
  // ==========================================================================
  const handleSaveStandMode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isStandValid) return

    startTransition(async () => {
      const res = await saveCalendarOverride({
        override_date: standDate,
        delivery_mode: 'cetys_pickup',
        status: 'stand_mode',
        open_time: standOpen,
        close_time: standClose,
        min_lead_minutes: leadNum,
        slot_interval_minutes: effectiveStandInterval,
        reason: standReason.trim() || 'Stand CETYS Universidad',
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Stand CETYS activado exitosamente')
        setShowStandModal(false)
        setOverrides((prev) => [
          ...prev.filter((o) => !(o.override_date === standDate && o.delivery_mode === 'cetys_pickup')),
          {
            id: `opt-${Date.now()}`,
            override_date: standDate,
            delivery_mode: 'cetys_pickup',
            delivery_point_id: null,
            status: 'stand_mode',
            open_time: standOpen,
            close_time: standClose,
            slot_interval_minutes: effectiveStandInterval,
            min_lead_minutes: leadNum,
            submission_cutoff_time: null,
            reason: standReason.trim() || 'Stand CETYS Universidad',
            is_active: true,
          },
        ])
      }
    })
  }

  // ==========================================================================
  // HANDLERS: BLOCKS
  // ==========================================================================
  const handleSaveBlock = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!blockStartTime || !blockEndTime) {
      showNotification('error', 'Debes ingresar el horario completo de inicio y término del bloqueo')
      return
    }
    if (blockStartTime >= blockEndTime) {
      showNotification('error', 'La hora de inicio del bloqueo debe ser menor a la hora de término')
      return
    }

    startTransition(async () => {
      const res = await saveAvailabilityBlock({
        block_date: blockDate,
        delivery_mode: blockMode,
        start_time: blockStartTime,
        end_time: blockEndTime,
        reason: blockReason.trim() || 'Bloqueo operativo',
      })

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Bloqueo agregado correctamente')
        setShowBlockModal(false)
        setBlocks((prev) => [
          ...prev,
          {
            id: `opt-${Date.now()}`,
            block_date: blockDate,
            delivery_mode: blockMode,
            delivery_point_id: null,
            start_time: blockStartTime,
            end_time: blockEndTime,
            reason: blockReason.trim() || 'Bloqueo operativo',
            is_active: true,
          },
        ])
      }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    if (!confirm('¿Deseas desbloquear este horario?')) return

    startTransition(async () => {
      const res = await deleteAvailabilityBlock(blockId)
      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', 'Horario desbloqueado')
        setBlocks((prev) => prev.filter((b) => b.id !== blockId))
      }
    })
  }

  // Monthly calendar calculation
  const currentYear = calendarDate.getFullYear()
  const currentMonth = calendarDate.getMonth()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sun, 1 = Mon
  // Convert Sunday (0) to 7 for Monday-first calendar
  const mondayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

  // Find overrides & blocks for selected date
  const selectedDateOverrides = overrides.filter((o) => o.override_date === selectedDateStr)
  const selectedDateBlocks = blocks.filter((b) => b.block_date === selectedDateStr)

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

      {/* Top Header & Quick Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#261C19]">
            Gestión de Disponibilidad
          </h1>
          <p className="text-sm text-[#6E564F] mt-1">
            Configura los días, horas, intervalos de entrega y excepciones para el checkout de Zanita.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => openStandModal(selectedDateStr)}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#A73832] text-white hover:bg-[#87201D] shadow-xs transition-colors cursor-pointer"
          >
            Activar Stand CETYS
          </button>
          <button
            onClick={() => openBlockModal(selectedDateStr)}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white text-[#6E564F] border border-[#E8DCC4] hover:bg-[#F5EBDC] transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-[#D46240]" />
            Bloquear Horario
          </button>
        </div>
      </div>

      {/* OPERATIONAL SETTING: TRANSITION BUFFER BETWEEN OFFICIAL ZONES */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-serif font-bold text-[#261C19] flex items-center">
            <Clock className="w-4 h-4 mr-2 text-[#A73832]" />
            Tiempo mínimo entre entregas en zonas distintas (Buffer de Transición)
          </h2>
          <p className="text-xs text-[#6E564F] mt-0.5">
            Margen de traslado requerido entre pedidos de zonas oficiales diferentes (ej. Ermita vs Hipódromo).
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="number"
            min="0"
            max="180"
            step="5"
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-20 text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-1.5 text-[#261C19] font-semibold text-center"
            aria-label="Minutos de buffer entre zonas distintas"
          />
          <span className="text-xs text-[#6E564F]">minutos</span>
          <button
            type="button"
            disabled={savingBuffer}
            onClick={async () => {
              setSavingBuffer(true)
              const res = await saveCrossZoneTransitionBuffer(bufferMinutes)
              setSavingBuffer(false)
              if (res.error) {
                showNotification('error', res.error)
              } else {
                showNotification('success', res.message || 'Configuración guardada')
              }
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#261C19] text-white hover:bg-[#A73832] transition-colors shadow-xs cursor-pointer"
          >
            {savingBuffer ? 'Guardando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* SECTION A: HORARIO HABITUAL (WEEKLY SCHEDULE) */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#261C19] flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#A73832]" />
            Horario Habitual de Operación
          </h2>
          <p className="text-xs text-[#6E564F] mt-1">
            Configura los días y horarios en los que puedes recibir pedidos y realizar entregas.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#F2ECE1] pb-4">
          <button
            onClick={() => {
              setSelectedMode('official_point')
              setSelectedPointId('all')
            }}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              selectedMode === 'official_point'
                ? 'bg-[#A73832] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-[#6E564F] hover:bg-[#F5EBDC]'
            }`}
          >
            <Store className="w-4 h-4 mr-2" />
            Puntos Oficiales
          </button>
          <button
            onClick={() => setSelectedMode('home_delivery')}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              selectedMode === 'home_delivery'
                ? 'bg-[#A73832] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-[#6E564F] hover:bg-[#F5EBDC]'
            }`}
          >
            <Truck className="w-4 h-4 mr-2" />
            Entrega a Domicilio
          </button>
          <button
            onClick={() => setSelectedMode('cetys_pickup')}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              selectedMode === 'cetys_pickup'
                ? 'bg-[#A73832] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-[#6E564F] hover:bg-[#F5EBDC]'
            }`}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Pickup CETYS
          </button>
        </div>

        {/* Point Customizer (Only for official_point) */}
        {selectedMode === 'official_point' && (
          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DCC4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label htmlFor={`${baseId}-point-select`} className="text-xs font-semibold text-[#261C19] uppercase tracking-wider block">
                Alcance del horario:
              </label>
              <p className="text-xs text-[#6E564F]">
                {selectedPointId === 'all'
                  ? 'Aplica a todos los puntos oficiales salvo que alguno tenga horario personalizado.'
                  : 'Horario específico con precedencia sobre la regla general de puntos.'}
              </p>
            </div>
            <select
              id={`${baseId}-point-select`}
              value={selectedPointId}
              onChange={(e) => setSelectedPointId(e.target.value)}
              className="text-xs font-medium bg-white border border-[#E8DCC4] rounded-lg px-3 py-2 text-[#261C19] focus:ring-1 focus:ring-[#A73832] focus:outline-none"
            >
              <option value="all">Horario para todos los puntos</option>
              {officialPoints.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  Personalizar: {pt.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CETYS Normal Config Note */}
        {selectedMode === 'cetys_pickup' && (
          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DCC4] text-xs text-[#6E564F] space-y-1">
            <p className="font-semibold text-[#261C19] flex items-center">
              <Info className="w-4 h-4 mr-1 text-[#A73832]" />
              Configuración de Pickup CETYS:
            </p>
            <p>
              Define los días activos, el tipo de horario (horas fijas o intervalos) y el tiempo mínimo de anticipación para las entregas a la comunidad CETYS.
            </p>
          </div>
        )}

        {/* 7 Days List with subcomponent DayScheduleRow */}
        <div className="space-y-4">
          {DAYS_OF_WEEK.map(({ day, name }) => {
            const rule = currentRules.find((r) => r.day_of_week === day)
            const fixedSlotsStr = (rule?.fixed_slots || []).map((s) => s.slot_time).join(',')

            return (
              <DayScheduleRow
                key={`${day}-${selectedMode}-${selectedPointId}-${rule?.id || 'none'}-${rule?.schedule_type || 'interval'}-${rule?.open_time || ''}-${rule?.close_time || ''}-${rule?.slot_interval_minutes || ''}-${rule?.min_lead_minutes ?? ''}-${fixedSlotsStr}-${rule?.is_active ?? false}`}
                day={day}
                name={name}
                rule={rule}
                isPending={isPending}
                onSave={handleSaveDaySchedule}
                onDelete={handleDeleteRule}
              />
            )
          })}
        </div>
      </div>

      {/* SECTION B: CALENDARIO Y EXCEPCIONES */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#261C19] flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-[#A73832]" />
            Excepciones y Fechas Especiales
          </h2>
          <p className="text-xs text-[#6E564F] mt-1">
            Cierra días completos, define horarios especiales o activa Stand CETYS para una fecha en particular.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Monthly Calendar View */}
          <div className="lg:col-span-7 bg-[#FAF7F2] p-5 rounded-2xl border border-[#E8DCC4] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-[#261C19]">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <div className="flex space-x-1">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                  className="p-1.5 rounded-lg border border-[#E8DCC4] bg-white text-[#6E564F] hover:bg-[#F5EBDC] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                  className="p-1.5 rounded-lg border border-[#E8DCC4] bg-white text-[#6E564F] hover:bg-[#F5EBDC] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="text-[10px] font-semibold text-[#6E564F] uppercase py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: mondayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-lg bg-transparent" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const isSelected = selectedDateStr === dateStr
                const dayOverrides = overrides.filter((o) => o.override_date === dateStr)
                const hasClosed = dayOverrides.some((o) => o.status === 'closed')
                const hasStand = dayOverrides.some((o) => o.status === 'stand_mode')
                const hasCustom = dayOverrides.some((o) => o.status === 'custom_schedule')

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      setSelectedDateStr(dateStr)
                      setOverrideOpen('')
                      setOverrideClose('')
                      setOverrideInterval('')
                      setOverrideIntervalCustom('')
                      setOverrideLead('')
                      setOverrideReason('')
                      setOverrideStatus('closed')
                    }}
                    className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center p-1 text-xs font-semibold transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-[#A73832] text-white shadow-xs'
                        : 'bg-white text-[#261C19] border border-[#E8DCC4]/60 hover:bg-[#F5EBDC]'
                    }`}
                  >
                    <span>{dayNum}</span>
                    <div className="flex space-x-0.5 mt-0.5">
                      {hasClosed && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Cerrado" />}
                      {hasStand && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Stand CETYS" />}
                      {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Horario especial" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-[#6E564F]">
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5" /> Cerrado
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" /> Stand CETYS
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" /> Horario Especial
              </span>
            </div>
          </div>

          {/* Date Overrides Editor */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border-b border-[#F2ECE1] pb-3">
              <h3 className="font-semibold text-sm text-[#261C19]">
                Configurar fecha: <span className="text-[#A73832]">{selectedDateStr}</span>
              </h3>
              <p className="text-xs text-[#6E564F]">
                Aplica excepciones para esta fecha específica.
              </p>
            </div>

            {/* Existing Overrides for Selected Date */}
            {selectedDateOverrides.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block">
                  Excepciones activas para este día:
                </span>
                {selectedDateOverrides.map((ov) => (
                  <div
                    key={ov.id}
                    className="p-3 rounded-xl border border-[#E8DCC4] bg-[#FAF7F2] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#261C19]">
                        {ov.status === 'closed'
                          ? 'Cerrado todo el día'
                          : ov.status === 'stand_mode'
                          ? 'Stand CETYS Universidad'
                          : 'Horario especial'}
                      </p>
                      <p className="text-[#6E564F]">
                        Modalidad: {ov.delivery_mode}
                        {ov.open_time && ` (${ov.open_time.slice(0, 5)} - ${ov.close_time?.slice(0, 5)})`}
                      </p>
                      {ov.reason && <p className="text-[10px] text-[#6E564F]/80">Motivo: {ov.reason}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteOverride(ov.id)}
                      disabled={isPending}
                      className="p-1 text-[#6E564F] hover:text-red-700 cursor-pointer"
                      title="Eliminar excepción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Existing Blocks for Selected Date */}
            {selectedDateBlocks.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block">
                  Bloqueos intra-día para esta fecha:
                </span>
                {selectedDateBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#261C19]">
                        Franja bloqueada: {b.start_time.slice(0, 5)} a {b.end_time.slice(0, 5)}
                      </p>
                      <p className="text-[#6E564F]">
                        Modalidad: {b.delivery_mode === 'all' ? 'Todas' : b.delivery_mode}
                        {b.reason ? ` — ${b.reason}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(b.id)}
                      disabled={isPending}
                      className="p-1 text-[#6E564F] hover:text-red-700 cursor-pointer"
                      title="Eliminar bloqueo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form to Add New Override */}
            <form onSubmit={handleSaveDateOverride} className="p-4 rounded-xl border border-[#E8DCC4] bg-white space-y-3">
              <div>
                <label htmlFor={`${baseId}-override-status`} className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Acción para la fecha
                </label>
                <select
                  id={`${baseId}-override-status`}
                  name="status"
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as 'closed' | 'custom_schedule')}
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                >
                  <option value="closed">Cerrar todo el día</option>
                  <option value="custom_schedule">Definir horario especial</option>
                </select>
              </div>

              <div>
                <label htmlFor={`${baseId}-override-mode`} className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Modalidad afectada
                </label>
                <select
                  id={`${baseId}-override-mode`}
                  name="delivery_mode"
                  value={overrideMode}
                  onChange={(e) => setOverrideMode(e.target.value as 'all' | 'official_point' | 'home_delivery' | 'cetys_pickup')}
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                >
                  <option value="all">Todas las modalidades</option>
                  <option value="official_point">Puntos oficiales</option>
                  <option value="home_delivery">Entrega a domicilio</option>
                  <option value="cetys_pickup">Pickup CETYS</option>
                </select>
              </div>

              {overrideStatus === 'custom_schedule' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                        Inicio
                      </span>
                      <input
                        type="time"
                        name="open_time"
                        value={overrideOpen}
                        onChange={(e) => setOverrideOpen(e.target.value)}
                        placeholder="--:--"
                        aria-label="Hora de inicio de excepción"
                        className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                        Fin
                      </span>
                      <input
                        type="time"
                        name="close_time"
                        value={overrideClose}
                        onChange={(e) => setOverrideClose(e.target.value)}
                        placeholder="--:--"
                        aria-label="Hora de fin de excepción"
                        className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                        Intervalo
                      </span>
                      <select
                        name="slot_interval_minutes"
                        value={overrideInterval}
                        onChange={(e) => setOverrideInterval(e.target.value)}
                        aria-label="Intervalo de pedidos para excepción"
                        className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="15">Cada 15 min</option>
                        <option value="30">Cada 30 min</option>
                        <option value="60">Cada 60 min</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                        Anticipación
                      </span>
                      <select
                        name="lead_hours"
                        value={overrideLead}
                        onChange={(e) => setOverrideLead(e.target.value)}
                        aria-label="Horas de anticipación mínima para excepción"
                        className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="1">1 hora</option>
                        <option value="2">2 horas</option>
                        <option value="4">4 horas</option>
                        <option value="12">12 horas</option>
                        <option value="24">24 horas</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Motivo interno (opcional)
                </span>
                <input
                  type="text"
                  name="reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Ej. Día festivo, evento privado"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-1.5 text-[#261C19]"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-[#A73832] text-white hover:bg-[#87201D] transition-colors cursor-pointer"
              >
                Guardar Excepción
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SECTION C: HORARIOS BLOQUEADOS (SUBTRACTIVE BLOCKS) */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#261C19] flex items-center">
              <Clock className="w-5 h-5 mr-2 text-[#D46240]" />
              Horarios Bloqueados (Franjas Intra-Día)
            </h2>
            <p className="text-xs text-[#6E564F] mt-1">
              Bloquea franjas horarias específicas (ej. 13:00–14:00) para descanso o abastecimiento sin cerrar el día completo.
            </p>
          </div>

          <button
            onClick={() => openBlockModal(selectedDateStr)}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] text-[#261C19] border border-[#E8DCC4] hover:bg-[#F5EBDC] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + Bloquear Franja Horaria
          </button>
        </div>

        {/* Blocks List */}
        {blocks.length === 0 ? (
          <p className="text-xs text-[#6E564F] italic bg-[#FAF7F2] p-4 rounded-xl text-center">
            No hay franjas horarias bloqueadas actualmente.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-[#E8DCC4] bg-[#FAF7F2] flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm text-[#261C19]">
                    {b.block_date} — {b.start_time.slice(0, 5)} a {b.end_time.slice(0, 5)}
                  </p>
                  <p className="text-xs text-[#6E564F]">
                    Modalidad: {b.delivery_mode === 'all' ? 'Todas' : b.delivery_mode}
                  </p>
                  {b.reason && <p className="text-[11px] text-[#A73832] mt-0.5">Motivo: {b.reason}</p>}
                </div>
                <button
                  onClick={() => handleDeleteBlock(b.id)}
                  disabled={isPending}
                  className="p-1.5 text-[#6E564F] hover:text-red-700 transition-colors cursor-pointer"
                  title="Eliminar bloqueo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: STAND CETYS SHORTCUT */}
      {showStandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8DCC4] p-6 max-w-md w-full shadow-xl space-y-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#A73832]">
                Activar Stand CETYS
              </h3>
              <p className="text-xs text-[#6E564F] mt-1">
                Habilita una fecha de venta presencial en el campus con anticipación reducida.
              </p>
            </div>

            <form onSubmit={handleSaveStandMode} className="space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Fecha del evento
                </span>
                <input
                  type="date"
                  name="stand_date"
                  value={standDate}
                  onChange={(e) => setStandDate(e.target.value)}
                  required
                  aria-label="Fecha del stand CETYS"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Hora inicio
                  </span>
                  <input
                    type="time"
                    name="open_time"
                    value={standOpen}
                    onChange={(e) => setStandOpen(e.target.value)}
                    placeholder="--:--"
                    required
                    aria-label="Hora de inicio del stand"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Hora fin
                  </span>
                  <input
                    type="time"
                    name="close_time"
                    value={standClose}
                    onChange={(e) => setStandClose(e.target.value)}
                    placeholder="--:--"
                    required
                    aria-label="Hora de fin del stand"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Anticipación mínima
                  </span>
                  <select
                    name="min_lead_minutes"
                    value={standLead}
                    onChange={(e) => setStandLead(e.target.value)}
                    aria-label="Anticipación mínima para stand"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="60">60 minutos (1h)</option>
                    <option value="120">120 minutos (2h)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    Intervalo de horarios
                  </span>
                  <select
                    name="slot_interval_minutes"
                    value={standInterval}
                    onChange={(e) => setStandInterval(e.target.value)}
                    aria-label="Intervalo de horarios para stand"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="15">Cada 15 min</option>
                    <option value="30">Cada 30 min</option>
                    <option value="60">Cada 60 min</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Nota interna (opcional)
                </span>
                <input
                  type="text"
                  name="reason"
                  value={standReason}
                  onChange={(e) => setStandReason(e.target.value)}
                  placeholder="Ej. Stand CETYS Expo Emprende"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-1.5 text-[#261C19]"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStandModal(false)}
                  className="w-1/2 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] text-[#6E564F] hover:bg-[#F5EBDC] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !isStandValid}
                  className={`w-1/2 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${
                    isStandValid && !isPending
                      ? 'bg-[#A73832] hover:bg-[#87201D] cursor-pointer'
                      : 'bg-[#A73832]/50 cursor-not-allowed'
                  }`}
                >
                  Guardar Stand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BLOCK WINDOW */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8DCC4] p-6 max-w-md w-full shadow-xl space-y-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#D46240] flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Bloquear Franja Horaria
              </h3>
              <p className="text-xs text-[#6E564F] mt-1">
                Impide que se agenden pedidos durante una franja específica del día.
              </p>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Fecha
                </span>
                <input
                  type="date"
                  name="block_date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  required
                  aria-label="Fecha del bloqueo de horario"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                />
              </div>

              <div>
                <label htmlFor={`${baseId}-block-modal-mode`} className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Modalidad afectada
                </label>
                <select
                  id={`${baseId}-block-modal-mode`}
                  name="delivery_mode"
                  value={blockMode}
                  onChange={(e) => setBlockMode(e.target.value as 'all' | 'official_point' | 'home_delivery' | 'cetys_pickup')}
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-2 text-[#261C19]"
                >
                  <option value="all">Todas las modalidades</option>
                  <option value="official_point">Puntos oficiales</option>
                  <option value="home_delivery">Entrega a domicilio</option>
                  <option value="cetys_pickup">Pickup CETYS</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    No disponible de:
                  </span>
                  <input
                    type="time"
                    name="start_time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    placeholder="--:--"
                    required
                    aria-label="Hora de inicio del bloqueo"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                    A:
                  </span>
                  <input
                    type="time"
                    name="end_time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    placeholder="--:--"
                    required
                    aria-label="Hora de fin del bloqueo"
                    className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2 py-1.5 text-[#261C19]"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-[#6E564F] uppercase tracking-wider block mb-1">
                  Motivo interno (solo para ti)
                </span>
                <input
                  type="text"
                  name="reason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej. Descanso, abastecimiento"
                  className="w-full text-xs bg-[#FAF7F2] border border-[#E8DCC4] rounded-lg px-2.5 py-1.5 text-[#261C19]"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="w-1/2 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] text-[#6E564F] hover:bg-[#F5EBDC] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2 rounded-xl text-xs font-semibold bg-[#D46240] text-white hover:bg-[#b84e30] cursor-pointer"
                >
                  Guardar Bloqueo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
