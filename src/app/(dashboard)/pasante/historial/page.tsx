'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { MapPin, MapPinOff } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface AttendanceRow {
  id: string
  nombre: string
  fecha: string
  horaEntrada?: string | null
  horaSalida?: string | null
  latitud?: number | null
  longitud?: number | null
  status: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'PERMISO'
  notas?: string | null
}

interface ListResponse {
  items: AttendanceRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const statusVariant: Record<AttendanceRow['status'], 'success' | 'warning' | 'danger' | 'info'> = {
  PRESENTE: 'success',
  TARDANZA: 'warning',
  AUSENTE: 'danger',
  PERMISO: 'info',
}

const statusLabel: Record<AttendanceRow['status'], string> = {
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  AUSENTE: 'Ausente',
  PERMISO: 'Permiso',
}

export default function HistorialPage() {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/attendance?page=${page}&pageSize=25`)
      const data = (await res.json()) as ListResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al cargar historial')
      setRows(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi Historial</h1>
        <p className="text-sm text-slate-500">{total} registro(s) de asistencia</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Cargando...</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            Aún no tienes registros de asistencia.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Hora Entrada</th>
                  <th className="px-4 py-3 font-medium">Hora Salida</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">
                      {format(new Date(r.fecha), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.horaEntrada ? format(new Date(r.horaEntrada), 'HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.horaSalida ? format(new Date(r.horaSalida), 'HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.latitud != null ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <MapPin className="h-3.5 w-3.5" />
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <MapPinOff className="h-3.5 w-3.5" />
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
