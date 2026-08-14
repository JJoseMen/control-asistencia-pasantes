'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  BarChart3,
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  UserX,
} from 'lucide-react'
import { getReportSummary } from '@/lib/actions/reports'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface PasanteOption {
  id: string
  name: string
}

interface Summary {
  total: number
  presentes: number
  ausentes: number
  tardanzas: number
  permisos: number
  pasantesConRegistro: number
  totalPasantes: number
}

export default function ReportesPage() {
  const [pasantes, setPasantes] = useState<PasanteOption[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    pasanteId: '',
    status: '',
    desde: '',
    hasta: '',
  })

  const loadPasantes = useCallback(async () => {
    try {
      const res = await fetch('/api/pasantes?pageSize=50')
      const data = await res.json()
      if (res.ok) setPasantes(data.items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
    } catch {
      // noop
    }
  }, [])

  useEffect(() => {
    loadPasantes()
  }, [loadPasantes])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await getReportSummary(filters)
    if (!res.ok) {
      setError(res.error || 'Error al generar el reporte')
      setLoading(false)
      return
    }
    setSummary(res.data ?? null)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  async function handleExport(kind: 'excel' | 'pdf') {
    try {
      const params = new URLSearchParams({
        ...(filters.pasanteId ? { pasanteId: filters.pasanteId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.desde ? { desde: filters.desde } : {}),
        ...(filters.hasta ? { hasta: filters.hasta } : {}),
      })
      const res = await fetch(`/api/export/${kind}?${params}`)
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ext = kind === 'excel' ? 'xlsx' : 'pdf'
      a.href = url
      a.download = `reporte-asistencias-${format(new Date(), 'yyyy-MM-dd')}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar')
    }
  }

  function updateFilter<K extends keyof typeof filters>(key: K, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const cards = [
    {
      label: 'Total registros',
      value: summary?.total ?? 0,
      icon: BarChart3,
      color: 'text-slate-700 bg-slate-100',
    },
    {
      label: 'Presentes',
      value: summary?.presentes ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-100',
    },
    {
      label: 'Tardanzas',
      value: summary?.tardanzas ?? 0,
      icon: Clock,
      color: 'text-amber-700 bg-amber-100',
    },
    {
      label: 'Ausentes',
      value: summary?.ausentes ?? 0,
      icon: CalendarX2,
      color: 'text-rose-700 bg-rose-100',
    },
    {
      label: 'Permisos',
      value: summary?.permisos ?? 0,
      icon: CalendarCheck2,
      color: 'text-indigo-700 bg-indigo-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes y Exportación</h1>
          <p className="text-sm text-slate-500">Resumen estadístico y descarga de datos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-800">
        <Select
          label="Pasante"
          value={filters.pasanteId}
          onChange={(e) => updateFilter('pasanteId', e.target.value)}
        >
          <option value="">Todos</option>
          {pasantes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          label="Estado"
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
        >
          <option value="">Todos</option>
          <option value="PRESENTE">Presente</option>
          <option value="AUSENTE">Ausente</option>
          <option value="TARDANZA">Tardanza</option>
          <option value="PERMISO">Permiso</option>
        </Select>
        <Input
          label="Desde"
          type="date"
          value={filters.desde}
          onChange={(e) => updateFilter('desde', e.target.value)}
        />
        <Input
          label="Hasta"
          type="date"
          value={filters.hasta}
          onChange={(e) => updateFilter('hasta', e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Generando resumen...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              <UserX className="mr-1 inline h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-900">{summary?.pasantesConRegistro ?? 0}</span> de{' '}
              <span className="font-medium text-slate-900">{summary?.totalPasantes ?? 0}</span> pasantes activos
              con registro en el periodo
            </p>
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Descargar Excel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
