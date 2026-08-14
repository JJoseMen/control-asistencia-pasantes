'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, CheckCircle2, Clock, CalendarX2, UserCheck } from 'lucide-react'
import StatsCards from '@/components/admin/StatsCards'
import ReportsPanel, { type ActivityItem } from '@/components/admin/ReportsPanel'

interface WeekDay {
  fecha: string
  presentes: number
  tardanzas: number
  ausentes: number
  permisos: number
}

interface DashboardData {
  totalPasantes: number
  presentes: number
  tardanzas: number
  ausentes: number
  permisos: number
  semana: WeekDay[]
  activity: ActivityItem[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard')
      const d = (await res.json()) as DashboardData & { error?: string }
      if (!res.ok) throw new Error(d.error || 'Error al cargar el dashboard')
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const maxBar = Math.max(1, ...(data?.semana.map((d) => d.presentes + d.tardanzas + d.ausentes) || [1]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Resumen general de asistencia</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refrescar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading || !data ? (
        <p className="py-12 text-center text-sm text-slate-500">Cargando dashboard...</p>
      ) : (
        <>
          <StatsCards
            cards={[
              { label: 'Pasantes activos', value: data.totalPasantes, icon: Users, color: 'text-indigo-700 bg-indigo-100' },
              { label: 'Presentes hoy', value: data.presentes, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-100' },
              { label: 'Tardanzas hoy', value: data.tardanzas, icon: Clock, color: 'text-amber-700 bg-amber-100' },
              { label: 'Ausentes hoy', value: data.ausentes, icon: CalendarX2, color: 'text-rose-700 bg-rose-100' },
            ]}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Asistencia últimos 7 días
              </h2>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <UserCheck className="h-3.5 w-3.5" />
                Presentes / Tardanzas / Ausentes
              </span>
            </div>
            <div className="flex h-52 items-end justify-between gap-2">
              {data.semana.map((day) => (
                <div key={day.fecha} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <div
                      className="w-2 rounded-t bg-emerald-500"
                      style={{ height: `${(day.presentes / maxBar) * 100}%` }}
                      title={`Presentes: ${day.presentes}`}
                    />
                    <div
                      className="w-2 rounded-t bg-amber-500"
                      style={{ height: `${(day.tardanzas / maxBar) * 100}%` }}
                      title={`Tardanzas: ${day.tardanzas}`}
                    />
                    <div
                      className="w-2 rounded-t bg-rose-500"
                      style={{ height: `${(day.ausentes / maxBar) * 100}%` }}
                      title={`Ausentes: ${day.ausentes}`}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{format(new Date(day.fecha), 'EEE', { locale: es })}</span>
                </div>
              ))}
            </div>
          </div>

          <ReportsPanel activity={data.activity} />
        </>
      )}
    </div>
  )
}
