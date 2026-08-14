'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

type Status = 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'PERMISO'

interface CalendarRecord {
  id: string
  pasanteId: string
  nombre: string
  fecha: string
  status: Status
}

interface ListResponse {
  items: CalendarRecord[]
  totalPages: number
}

const statusVariant: Record<Status, 'success' | 'warning' | 'danger' | 'info'> = {
  PRESENTE: 'success',
  TARDANZA: 'warning',
  AUSENTE: 'danger',
  PERMISO: 'info',
}

const statusLabel: Record<Status, string> = {
  PRESENTE: 'P',
  TARDANZA: 'T',
  AUSENTE: 'A',
  PERMISO: 'PE',
}

const statusTitle: Record<Status, string> = {
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  AUSENTE: 'Ausente',
  PERMISO: 'Permiso',
}

interface Props {
  pasanteId?: string
}

export default function AttendanceCalendar({ pasanteId }: Props) {
  const [month, setMonth] = useState(new Date())
  const [records, setRecords] = useState<CalendarRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const desde = format(startOfMonth(month), 'yyyy-MM-dd')
      const hasta = format(endOfMonth(month), 'yyyy-MM-dd')
      const params = new URLSearchParams({ desde, hasta, pageSize: '100' })
      if (pasanteId) params.set('pasanteId', pasanteId)
      const res = await fetch(`/api/attendance?${params}`)
      const data = (await res.json()) as ListResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al cargar asistencias')
      setRecords(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar asistencias')
    } finally {
      setLoading(false)
    }
  }, [month, pasanteId])

  useEffect(() => {
    load()
  }, [load])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const recordsByDay = useMemo(() => {
    const map = new Map<string, CalendarRecord[]>()
    for (const r of records) {
      const key = format(new Date(r.fecha), 'yyyy-MM-dd')
      const list = map.get(key) || []
      list.push(r)
      map.set(key, list)
    }
    return map
  }, [records])

  const today = new Date()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize text-slate-900">
          {format(month, 'MMMM yyyy', { locale: es })}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-7 gap-2 text-center">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="text-xs font-semibold uppercase text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayRecords = recordsByDay.get(key) || []
            const inMonth = isSameMonth(day, month)
            const isToday = isSameDay(day, today)
            return (
              <div
                key={key}
                className={`min-h-[72px] rounded-lg border p-2 ${
                  inMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
                } ${isToday ? 'ring-2 ring-indigo-500/40' : ''}`}
              >
                <p className={`text-xs font-semibold ${inMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                  {format(day, 'd')}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dayRecords.length === 0 && inMonth && (
                    <span className="text-[10px] text-slate-300">Sin registros</span>
                  )}
                  {dayRecords.slice(0, 4).map((r) => (
                    <Badge
                      key={r.id}
                      variant={statusVariant[r.status]}
                      title={`${r.nombre}: ${statusTitle[r.status]}`}
                      className="px-1 py-0 text-[10px]"
                    >
                      {statusLabel[r.status]}
                    </Badge>
                  ))}
                  {dayRecords.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{dayRecords.length - 4}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Badge variant="success" className="px-1.5 py-0">
            P
          </Badge>
          Presente
        </span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="warning" className="px-1.5 py-0">
            T
          </Badge>
          Tardanza
        </span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="danger" className="px-1.5 py-0">
            A
          </Badge>
          Ausente
        </span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="info" className="px-1.5 py-0">
            PE
          </Badge>
          Permiso
        </span>
      </div>
    </div>
  )
}
