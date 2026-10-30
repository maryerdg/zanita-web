'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  GraduationCap,
  MapPin,
  Plus,
  Store,
  Truck,
  X,
} from 'lucide-react'
import {
  saveWeeklyScheduleBatch,
  type DeliveryPointRow,
  type WeeklyRuleRow,
} from '@/app/actions/admin'

const DAYS = [
  { value: 1, short: 'Lun', long: 'Lunes' },
  { value: 2, short: 'Mar', long: 'Martes' },
  { value: 3, short: 'Mié', long: 'Miércoles' },
  { value: 4, short: 'Jue', long: 'Jueves' },
  { value: 5, short: 'Vie', long: 'Viernes' },
  { value: 6, short: 'Sáb', long: 'Sábado' },
  { value: 7, short: 'Dom', long: 'Domingo' },
]

type DeliveryMode = 'official_point' | 'home_delivery' | 'cetys_pickup'
type ScheduleType = 'interval' | 'fixed_times'

function parseTime(value: string) {
  if (!value) return { hour: '', minute: '', period: '' as '' | 'AM' | 'PM' }
  const [rawHour, minute = '00'] = value.split(':')
  const h24 = Number(rawHour)
  if (!Number.isFinite(h24)) return { hour: '', minute: '', period: '' as '' | 'AM' | 'PM' }
  const period = h24 >= 12 ? 'PM' : 'AM'
  const hour = String(h24 % 12 || 12)
  return { hour, minute, period: period as 'AM' | 'PM' }
}

function to24Hour(hour: string, minute: string, period: string) {
  if (!hour || !minute || !period) return ''
  const h12 = Number(hour)
  if (!Number.isFinite(h12) || h12 < 1 || h12 > 12) return ''
  const h24 = period === 'PM' ? (h12 % 12) + 12 : h12 % 12
  return `${String(h24).padStart(2, '0')}:${minute}`
}

function formatTime12(value: string) {
  if (!value) return '—'
  const parsed = parseTime(value.slice(0, 5))
  if (!parsed.hour || !parsed.minute || !parsed.period) return value.slice(0, 5)
  return `${parsed.hour}:${parsed.minute} ${parsed.period}`
}

function TimePicker12h({
  value,
  onChange,
  allowForty = false,
  label,
}: {
  value: string
  onChange: (value: string) => void
  allowForty?: boolean
  label: string
}) {
  const initial = parseTime(value)
  const [hour, setHour] = useState(initial.hour)
  const [minute, setMinute] = useState(initial.minute)
  const [period, setPeriod] = useState<'' | 'AM' | 'PM'>(initial.period)

  useEffect(() => {
    const next = parseTime(value)
    setHour(next.hour)
    setMinute(next.minute)
    setPeriod(next.period)
  }, [value])

  const minutes = allowForty ? ['00', '15', '30', '40', '45'] : ['00', '15', '30', '45']

  const emit = (nextHour: string, nextMinute: string, nextPeriod: string) => {
    onChange(to24Hour(nextHour, nextMinute, nextPeriod))
  }

  return (
    <div>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E564F]">
        {label}
      </span>
      <div className="grid grid-cols-[1fr_1fr_1.05fr] gap-1.5">
        <select
          value={hour}
          onChange={(event) => {
            const next = event.target.value
            setHour(next)
            emit(next, minute, period)
          }}
          className="h-11 rounded-xl border border-[#E8DCC4] bg-white px-2 text-sm text-[#261C19]"
          aria-label={`${label}: hora`}
        >
          <option value="">Hora</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select
          value={minute}
          onChange={(event) => {
            const next = event.target.value
            setMinute(next)
            emit(hour, next, period)
          }}
          className="h-11 rounded-xl border border-[#E8DCC4] bg-white px-2 text-sm text-[#261C19]"
          aria-label={`${label}: minutos`}
        >
          <option value="">Min</option>
          {minutes.map((item) => (
            <option key={item} value={item}>:{item}</option>
          ))}
        </select>

        <select
          value={period}
          onChange={(event) => {
            const next = event.target.value as '' | 'AM' | 'PM'
            setPeriod(next)
            emit(hour, minute, next)
          }}
          className="h-11 rounded-xl border border-[#E8DCC4] bg-white px-2 text-sm text-[#261C19]"
          aria-label={`${label}: AM o PM`}
        >
          <option value="">AM/PM</option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}

function modeLabel(mode: DeliveryMode) {
  if (mode === 'official_point') return 'Puntos oficiales'
  if (mode === 'home_delivery') return 'Entrega a domicilio'
  return 'Pickup CETYS'
}

export default function WeeklyScheduleBatchComposer({
  rules,
  officialPoints,
  onSaved,
}: {
  rules: WeeklyRuleRow[]
  officialPoints: DeliveryPointRow[]
  onSaved?: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<DeliveryMode>('official_point')
  const [days, setDays] = useState<number[]>([])
  const [useAllPoints, setUseAllPoints] = useState(true)
  const [pointIds, setPointIds] = useState<string[]>([])
  const [scheduleType, setScheduleType] = useState<ScheduleType>('interval')
  const [openTime, setOpenTime] = useState('')
  const [closeTime, setCloseTime] = useState('')
  const [interval, setInterval] = useState<number | null>(null)
  const [fixedSlots, setFixedSlots] = useState<string[]>([])
  const [slotDraft, setSlotDraft] = useState('')
  const [leadHours, setLeadHours] = useState('24')
  const [useCutoff, setUseCutoff] = useState(false)
  const [cutoffTime, setCutoffTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const activePoints = useMemo(
    () => officialPoints.filter((point) => point.is_active),
    [officialPoints]
  )

  const rulesForMode = useMemo(
    () => rules.filter((rule) => rule.delivery_mode === mode && rule.is_active),
    [rules, mode]
  )

  const groupedCurrentRules = useMemo(() => {
    const map = new Map<string, WeeklyRuleRow[]>()
    for (const rule of rulesForMode) {
      const key = rule.delivery_point_id || 'global'
      const list = map.get(key) || []
      list.push(rule)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [rulesForMode])

  const selectedDayNames = DAYS.filter((day) => days.includes(day.value)).map((day) => day.short)

  const pointSummary =
    mode !== 'official_point'
      ? modeLabel(mode)
      : useAllPoints
        ? 'Todos los puntos oficiales'
        : pointIds.length === 0
          ? 'Sin puntos seleccionados'
          : activePoints
              .filter((point) => pointIds.includes(point.id))
              .map((point) => point.name)
              .join(', ')

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b)
    )
  }

  const togglePoint = (pointId: string) => {
    setUseAllPoints(false)
    setPointIds((current) =>
      current.includes(pointId)
        ? current.filter((item) => item !== pointId)
        : [...current, pointId]
    )
  }

  const addFixedSlot = () => {
    if (!slotDraft) return
    setFixedSlots((current) => Array.from(new Set([...current, slotDraft])).sort())
    setSlotDraft('')
  }

  const save = async () => {
    setMessage(null)

    if (days.length === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos un día.' })
      return
    }

    if (mode === 'official_point' && !useAllPoints && pointIds.length === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos un punto oficial.' })
      return
    }

    if (scheduleType === 'interval') {
      if (!openTime || !closeTime || openTime >= closeTime) {
        setMessage({ type: 'error', text: 'Selecciona una hora de inicio y fin válidas.' })
        return
      }
      if (!interval) {
        setMessage({ type: 'error', text: 'Selecciona cada cuánto habrá horarios disponibles.' })
        return
      }
    }

    if (scheduleType === 'fixed_times' && fixedSlots.length === 0) {
      setMessage({ type: 'error', text: 'Agrega al menos una hora específica.' })
      return
    }

    const lead = Number(leadHours)
    if (!Number.isFinite(lead) || lead < 0) {
      setMessage({ type: 'error', text: 'La anticipación mínima no es válida.' })
      return
    }

    setSaving(true)
    const result = await saveWeeklyScheduleBatch({
      delivery_mode: mode,
      delivery_point_ids:
        mode === 'official_point' && !useAllPoints ? pointIds : undefined,
      days,
      schedule_type: scheduleType,
      open_time: scheduleType === 'interval' ? openTime : null,
      close_time: scheduleType === 'interval' ? closeTime : null,
      slot_interval_minutes: scheduleType === 'interval' ? interval : null,
      min_lead_minutes: Math.round(lead * 60),
      submission_cutoff_time: useCutoff ? cutoffTime || null : null,
      fixed_slots: scheduleType === 'fixed_times' ? fixedSlots : undefined,
    })
    setSaving(false)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      return
    }

    setMessage({
      type: 'success',
      text: `Listo. Se guardó el horario en ${result.savedRules || days.length} configuración(es).`,
    })
    router.refresh()
    onSaved?.()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E8DCC4] bg-[#FFF9F2] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A73832] text-white">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#261C19]">Crear o actualizar horario</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-[#6E564F]">
              Elige varios días y puntos una sola vez. Al guardar, el mismo horario se aplica a todos.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E564F]">
          1. ¿Dónde aplica?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'official_point' as DeliveryMode, label: 'Puntos', icon: Store },
            { value: 'home_delivery' as DeliveryMode, label: 'Domicilio', icon: Truck },
            { value: 'cetys_pickup' as DeliveryMode, label: 'CETYS', icon: GraduationCap },
          ].map((item) => {
            const Icon = item.icon
            const active = mode === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value)
                  setPointIds([])
                  setUseAllPoints(true)
                }}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs font-bold transition-colors ${
                  active
                    ? 'border-[#A73832] bg-[#A73832] text-white'
                    : 'border-[#E8DCC4] bg-white text-[#6E564F] hover:bg-[#FAF7F2]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {mode === 'official_point' && (
        <div className="rounded-2xl border border-[#E8DCC4] bg-white p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#A73832]" />
            <p className="text-sm font-bold text-[#261C19]">Puntos de entrega</p>
          </div>
          <p className="mt-1 text-xs text-[#6E564F]">
            Puedes aplicar el horario a todos o elegir varios puntos específicos.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setUseAllPoints(true)
                setPointIds([])
              }}
              className={`min-h-10 rounded-full border px-3 text-xs font-bold ${
                useAllPoints
                  ? 'border-[#A73832] bg-[#A73832] text-white'
                  : 'border-[#E8DCC4] bg-[#FAF7F2] text-[#6E564F]'
              }`}
            >
              Todos los puntos
            </button>

            {activePoints.map((point) => {
              const active = !useAllPoints && pointIds.includes(point.id)
              return (
                <button
                  key={point.id}
                  type="button"
                  onClick={() => togglePoint(point.id)}
                  className={`min-h-10 rounded-full border px-3 text-xs font-bold ${
                    active
                      ? 'border-[#A73832] bg-[#FFF1EF] text-[#A73832]'
                      : 'border-[#E8DCC4] bg-white text-[#6E564F]'
                  }`}
                >
                  {active && <Check className="mr-1 inline h-3 w-3" />}
                  {point.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E564F]">
          2. ¿Qué días?
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAYS.map((day) => {
            const active = days.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`min-h-11 rounded-xl border text-xs font-bold transition-colors ${
                  active
                    ? 'border-[#A73832] bg-[#A73832] text-white'
                    : 'border-[#E8DCC4] bg-white text-[#6E564F]'
                }`}
                aria-label={day.long}
              >
                {day.short}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E564F]">
          3. ¿Cómo quieres mostrar los horarios?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScheduleType('interval')}
            className={`rounded-2xl border p-4 text-left ${
              scheduleType === 'interval'
                ? 'border-[#A73832] bg-[#FFF1EF]'
                : 'border-[#E8DCC4] bg-white'
            }`}
          >
            <Clock3 className="h-4 w-4 text-[#A73832]" />
            <p className="mt-2 text-sm font-bold text-[#261C19]">Cada cierto tiempo</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#6E564F]">
              Ej. de 9 AM a 1 PM, cada 30 minutos.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setScheduleType('fixed_times')}
            className={`rounded-2xl border p-4 text-left ${
              scheduleType === 'fixed_times'
                ? 'border-[#A73832] bg-[#FFF1EF]'
                : 'border-[#E8DCC4] bg-white'
            }`}
          >
            <MapPin className="h-4 w-4 text-[#A73832]" />
            <p className="mt-2 text-sm font-bold text-[#261C19]">Horas específicas</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#6E564F]">
              Ej. 3:40 PM, 5:40 PM y 7:40 PM.
            </p>
          </button>
        </div>
      </div>

      {scheduleType === 'interval' ? (
        <div className="space-y-4 rounded-2xl border border-[#E8DCC4] bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TimePicker12h value={openTime} onChange={setOpenTime} label="Desde" />
            <TimePicker12h value={closeTime} onChange={setCloseTime} label="Hasta" />
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E564F]">
              Crear un horario cada
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setInterval(minutes)}
                  className={`min-h-10 rounded-xl border text-xs font-bold ${
                    interval === minutes
                      ? 'border-[#A73832] bg-[#A73832] text-white'
                      : 'border-[#E8DCC4] bg-[#FAF7F2] text-[#6E564F]'
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-[#E8DCC4] bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <TimePicker12h
              value={slotDraft}
              onChange={setSlotDraft}
              label="Agregar hora"
              allowForty
            />
            <button
              type="button"
              onClick={addFixedSlot}
              disabled={!slotDraft}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#261C19] px-4 text-xs font-bold text-white disabled:opacity-35"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>

          {fixedSlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {fixedSlots.map((slot) => (
                <span
                  key={slot}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#E8DCC4] bg-[#FAF7F2] px-3 text-xs font-bold text-[#261C19]"
                >
                  {formatTime12(slot)}
                  <button
                    type="button"
                    onClick={() => setFixedSlots((current) => current.filter((item) => item !== slot))}
                    className="text-[#A73832]"
                    aria-label={`Quitar ${formatTime12(slot)}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-[#6E564F]">Todavía no agregas horas.</p>
          )}
        </div>
      )}

      <div className="grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E564F]">
            Anticipación mínima
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={leadHours}
              onChange={(event) => setLeadHours(event.target.value)}
              className="h-11 w-24 rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm text-[#261C19]"
            />
            <span className="text-sm text-[#6E564F]">horas</span>
          </div>
          <p className="mt-1 text-[11px] text-[#6E564F]">Actualmente el estándar es 24 h.</p>
        </label>

        <div>
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E564F]">
            Hora límite del día
          </span>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[#261C19]">
            <input
              type="checkbox"
              checked={useCutoff}
              onChange={(event) => {
                setUseCutoff(event.target.checked)
                if (!event.target.checked) setCutoffTime('')
              }}
            />
            Usar hora límite
          </label>
          {useCutoff && (
            <div className="mt-2">
              <TimePicker12h value={cutoffTime} onChange={setCutoffTime} label="Límite" />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8DCC4] bg-[#FAF7F2] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E564F]">Resumen</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-[#261C19]">
          {selectedDayNames.length > 0 ? selectedDayNames.join(' · ') : 'Selecciona días'}
          {' · '}
          {pointSummary}
          {' · '}
          {scheduleType === 'interval'
            ? openTime && closeTime && interval
              ? `${formatTime12(openTime)}–${formatTime12(closeTime)} · cada ${interval} min`
              : 'Completa el horario'
            : fixedSlots.length > 0
              ? fixedSlots.map(formatTime12).join(' · ')
              : 'Agrega horas específicas'}
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#A73832] px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#8E2E28] disabled:opacity-45 sm:w-auto"
      >
        {saving ? 'Guardando…' : 'Guardar horario'}
      </button>

      <div className="border-t border-[#F2ECE1] pt-5">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-[#FAF7F2] px-4 py-3 text-sm font-bold text-[#261C19]">
            <span>Ver horario actual de {modeLabel(mode)}</span>
            <ChevronDown className="h-4 w-4 text-[#6E564F]" />
          </summary>

          <div className="mt-3 space-y-2">
            {groupedCurrentRules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E8DCC4] p-4 text-xs text-[#6E564F]">
                No hay horarios activos configurados para esta modalidad.
              </div>
            ) : (
              groupedCurrentRules.map(([scopeKey, scopeRules]) => {
                const pointName =
                  scopeKey === 'global'
                    ? mode === 'official_point'
                      ? 'Todos los puntos'
                      : modeLabel(mode)
                    : activePoints.find((point) => point.id === scopeKey)?.name || 'Punto específico'

                return (
                  <div key={scopeKey} className="rounded-xl border border-[#E8DCC4] bg-white p-3">
                    <p className="text-xs font-bold text-[#A73832]">{pointName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scopeRules
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map((rule) => {
                          const day = DAYS.find((item) => item.value === rule.day_of_week)
                          const detail =
                            rule.schedule_type === 'fixed_times'
                              ? (rule.fixed_slots || []).map((slot) => formatTime12(slot.slot_time)).join(', ')
                              : `${formatTime12(rule.open_time)}–${formatTime12(rule.close_time)} · ${rule.slot_interval_minutes || '—'} min`

                          return (
                            <span
                              key={rule.id}
                              className="rounded-lg bg-[#FAF7F2] px-2.5 py-2 text-[11px] text-[#261C19]"
                            >
                              <strong>{day?.short || rule.day_of_week}:</strong> {detail}
                            </span>
                          )
                        })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </details>
      </div>
    </div>
  )
}
