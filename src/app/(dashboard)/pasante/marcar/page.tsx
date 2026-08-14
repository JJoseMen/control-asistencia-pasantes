'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Building2,
  CalendarX,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  XCircle,
} from 'lucide-react'
import { ClockInButton } from '@/components/pasante/ClockInButton'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

interface AttendanceToday {
  id: string
  horaEntrada?: string | null
  horaSalida?: string | null
  status: string
  latitud?: number | null
  longitud?: number | null
}

interface StatusResponse {
  today: AttendanceToday | null
  office: {
    name?: string
    lat: number
    lng: number
    maxDistanceMeters: number
  }
  horario?: {
    entrada: string
    salida: string
  }
}

type Stage = 'loading' | 'none' | 'open' | 'closed'
type MarcadoOption = 'oficina' | 'tardanza' | 'ausente'

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const options: {
  id: MarcadoOption
  title: string
  description: string
  icon: React.ReactNode
  needsLocation: boolean
  needsReason: boolean
}[] = [
  {
    id: 'oficina',
    title: 'Estoy en la oficina',
    description: 'Registra tu entrada con tu ubicación actual.',
    icon: <Building2 className="h-6 w-6" />,
    needsLocation: true,
    needsReason: false,
  },
  {
    id: 'tardanza',
    title: 'Llegué tarde',
    description: 'Se registra una tardanza. Necesitas geolocalización y una razón.',
    icon: <Clock3 className="h-6 w-6" />,
    needsLocation: true,
    needsReason: true,
  },
  {
    id: 'ausente',
    title: 'No pude asistir hoy',
    description: 'Se registra una ausencia. Escribe tu justificación.',
    icon: <CalendarX className="h-6 w-6" />,
    needsLocation: false,
    needsReason: true,
  },
]

export default function MarcarPage() {
  const [now, setNow] = useState(() => new Date())
  const [stage, setStage] = useState<Stage>('loading')
  const [attendance, setAttendance] = useState<AttendanceToday | null>(null)
  const [office, setOffice] = useState<{ name?: string; lat: number; lng: number; maxDistanceMeters: number } | null>(null)
  const [horario, setHorario] = useState<{ entrada: string; salida: string } | null>(null)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [positionError, setPositionError] = useState('')
  const [positionLoading, setPositionLoading] = useState(false)
  const [isInRadius, setIsInRadius] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<MarcadoOption | null>(null)
  const [nota, setNota] = useState('')
  const [notaError, setNotaError] = useState('')

  const loadingRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/status')
      const data = (await res.json()) as StatusResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al cargar el estado')
      setAttendance(data.today)
      setOffice(data.office)
      if (data.horario) setHorario(data.horario)
      if (data.today?.horaSalida) setStage('closed')
      else if (data.today?.horaEntrada) setStage('open')
      else setStage('none')
    } catch {
      setStage('none')
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setPositionError('Tu navegador no soporta geolocalización')
      return
    }
    setPositionLoading(true)
    setPositionError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserPos({ lat, lng })
        setPositionLoading(false)
        if (office) {
          const dist = haversine(lat, lng, office.lat, office.lng)
          setIsInRadius(dist <= office.maxDistanceMeters)
        }
      },
      (err) => {
        setUserPos(null)
        setPositionLoading(false)
        setPositionError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívalo para marcar con ubicación.'
            : 'No se pudo obtener tu ubicación. Intenta de nuevo.'
        )
        setIsInRadius(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [office])

  useEffect(() => {
    if (office && !userPos && !positionLoading && (stage === 'none' || stage === 'open')) {
      requestPosition()
    }
  }, [office, userPos, positionLoading, stage, requestPosition])

  function openModal() {
    setSelected(null)
    setNota('')
    setNotaError('')
    setModalOpen(true)
    if (!userPos) requestPosition()
  }

  const selectedOption = options.find((o) => o.id === selected) ?? null
  const needsLocation = selectedOption?.needsLocation ?? false
  const needsReason = selectedOption?.needsReason ?? false

  const canConfirm =
    selected !== null &&
    !needsReason &&
    (!needsLocation || (userPos && isInRadius))

  async function confirmMarcado() {
    if (!selected || loadingRef.current) return
    if (needsReason && nota.trim().length < 10) {
      setNotaError('Escribe al menos 10 caracteres')
      return
    }
    if (needsLocation && !userPos) {
      setNotaError('')
      setPositionError('Obteniendo tu ubicación, inténtalo de nuevo en unos segundos')
      requestPosition()
      return
    }
    if (needsLocation && !isInRadius) {
      setPositionError('Estás fuera del radio de la oficina, no puedes marcar con ubicación')
      return
    }

    loadingRef.current = true
    setIsChecking(true)
    setMessage(null)
    setNotaError('')
    try {
      const tipoMarcado =
        selected === 'tardanza' ? 'TARDANZA' : selected === 'ausente' ? 'AUSENTE' : 'PRESENTE'
      const body: Record<string, unknown> = { tipoMarcado }
      if (nota.trim()) body.notas = nota.trim()
      if (needsLocation && userPos) {
        body.lat = userPos.lat
        body.lng = userPos.lng
      }

      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setNotaError(data.error || 'No se pudo marcar asistencia')
        return
      }
      setAttendance(data.attendance)
      setStage(data.attendance.horaSalida ? 'closed' : 'open')
      setModalOpen(false)
      setMessage({ type: 'success', text: 'Asistencia registrada correctamente' })
      loadStatus()
    } catch {
      setNotaError('Error de conexión con el servidor')
    } finally {
      loadingRef.current = false
      setIsChecking(false)
    }
  }

  async function handleCheckOut() {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsChecking(true)
    setMessage(null)
    try {
      const res = await fetch('/api/attendance/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'No se pudo marcar salida' })
        return
      }
      setAttendance(data.attendance)
      setStage('closed')
      setMessage({ type: 'success', text: 'Salida marcada correctamente' })
      loadStatus()
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' })
    } finally {
      loadingRef.current = false
      setIsChecking(false)
    }
  }

  if (stage === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500">Cargando estado del día...</p>
      </div>
    )
  }

  const canMarkOut = stage === 'open' && isInRadius

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Marcar Asistencia</h1>
        <p className="mt-1 text-sm text-slate-500">
          {format(now, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <p className="font-mono text-6xl font-bold tabular-nums text-slate-900">
          {format(now, 'HH:mm:ss')}
        </p>

        {stage === 'none' && (
          <>
            <ClockInButton
              disabled={false}
              isCheckingIn={isChecking}
              onClick={openModal}
            />
            <p className="max-w-sm text-center text-sm text-slate-500">
              Pulsa el botón para marcar tu entrada, registrar una tardanza o justificar tu ausencia
            </p>
          </>
        )}

        {stage === 'open' && (
          <>
            <button
              onClick={handleCheckOut}
              disabled={!canMarkOut || isChecking}
              className="relative flex h-52 w-52 items-center justify-center rounded-full border-8 border-amber-200 bg-amber-500 text-white shadow-xl transition hover:scale-105 hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-center">
                {isChecking ? (
                  <Clock3 className="mx-auto h-10 w-10 animate-spin" />
                ) : (
                  <MapPin className="mx-auto h-10 w-10" />
                )}
                <span className="mt-2 block text-lg font-bold">
                  {isChecking ? 'Marcando...' : 'MARCAR SALIDA'}
                </span>
              </span>
            </button>
            <p className="text-sm text-slate-500">Marca tu salida al terminar la jornada</p>
          </>
        )}

        {stage === 'closed' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-14 w-14 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Jornada completada. ¡Hasta mañana!
            </p>
          </div>
        )}

        {attendance && (
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Estado de hoy</h3>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Entrada:</span>
                <span className="font-medium text-slate-800">
                  {attendance.horaEntrada ? format(new Date(attendance.horaEntrada), 'HH:mm:ss') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Salida:</span>
                <span className="font-medium text-slate-800">
                  {attendance.horaSalida ? format(new Date(attendance.horaSalida), 'HH:mm:ss') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estado:</span>
                <Badge variant={attendance.status === 'PRESENTE' ? 'success' : 'warning'}>
                  {attendance.status === 'PRESENTE'
                    ? 'Presente'
                    : attendance.status === 'TARDANZA'
                      ? 'Tardanza'
                      : attendance.status === 'AUSENTE'
                        ? 'Ausente'
                        : attendance.status}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {horario && stage !== 'closed' && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            <span>
              Tu horario: {horario.entrada} – {horario.salida}
            </span>
          </div>
        )}

        {positionError && (
          <div className="flex w-full max-w-sm items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{positionError}</p>
              <button onClick={requestPosition} className="mt-1 font-semibold underline">
                Reintentar
              </button>
            </div>
          </div>
        )}

        {userPos && office && (
          <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <MapPin className={cn('h-4 w-4', isInRadius ? 'text-emerald-500' : 'text-rose-500')} />
            <span className={isInRadius ? 'text-emerald-700' : 'text-rose-700'}>
              {isInRadius
                ? 'Estás dentro del radio de la oficina'
                : `Estás a ${Math.round(haversine(userPos.lat, userPos.lng, office.lat, office.lng))}m de la oficina`}
            </span>
          </div>
        )}

        {message && (
          <div
            className={cn(
              'w-full max-w-sm rounded-lg px-4 py-3 text-sm font-medium',
              message.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-rose-200 bg-rose-50 text-rose-700'
            )}
          >
            {message.text}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar asistencia"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Selecciona una opción para registrar tu estado de hoy
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {options.map((opt) => {
              const isSelected = selected === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelected(opt.id)
                    setNota('')
                    setNotaError('')
                    if (opt.needsLocation && !userPos) requestPosition()
                  }}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {opt.icon}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{opt.title}</span>
                  <span className="text-xs leading-relaxed text-slate-500">{opt.description}</span>
                </button>
              )
            })}
          </div>

          {selectedOption && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {needsLocation && (
                <div className="flex items-center gap-2 text-sm">
                  {positionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <span className="text-slate-500">Obteniendo tu ubicación...</span>
                    </>
                  ) : userPos ? (
                    isInRadius ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-700">Estás dentro del radio de la oficina</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                        <span className="text-rose-700">
                          Estás a{' '}
                          {office
                            ? `${Math.round(haversine(userPos.lat, userPos.lng, office.lat, office.lng))}m`
                            : '—'}{' '}
                          de la oficina. No puedes marcar con ubicación.
                        </span>
                      </>
                    )
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-rose-500" />
                      <span className="text-rose-700">{positionError || 'Sin ubicación disponible'}</span>
                      <button onClick={requestPosition} className="font-semibold text-indigo-600 underline">
                        Reintentar
                      </button>
                    </>
                  )}
                </div>
              )}

              {selectedOption.needsReason ? (
                <Textarea
                  label={selectedOption.id === 'tardanza' ? 'Razón de la tardanza *' : 'Justificación *'}
                  placeholder={
                    selectedOption.id === 'tardanza'
                      ? 'Ej: el transporte tardó más de lo esperado'
                      : 'Ej: cita médica, trámite personal, enfermedad'
                  }
                  rows={3}
                  value={nota}
                  onChange={(e) => {
                    setNota(e.target.value)
                    if (notaError) setNotaError('')
                  }}
                  error={notaError}
                />
              ) : (
                <Textarea
                  label="Nota (opcional)"
                  placeholder="Comentario adicional"
                  rows={2}
                  value={nota}
                  onChange={(e) => {
                    setNota(e.target.value)
                    if (notaError) setNotaError('')
                  }}
                  error={notaError}
                />
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmMarcado}
                  disabled={!canConfirm || isChecking}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isChecking ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
