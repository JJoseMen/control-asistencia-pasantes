'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Download, RefreshCw, Pencil, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

interface PasanteOption {
  id: string
  name: string
}

interface AttendanceRow {
  id: string
  nombre: string
  cedula: string
  fecha: string
  horaEntrada?: string | null
  horaSalida?: string | null
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

export default function RegistrosPage() {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [pasantes, setPasantes] = useState<PasanteOption[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<AttendanceRow | null>(null)
  const [editStatus, setEditStatus] = useState<AttendanceRow['status']>('PRESENTE')
  const [editNotas, setEditNotas] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [filters, setFilters] = useState({
    pasanteId: '',
    status: '',
    notas: '',
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
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        ...(filters.pasanteId ? { pasanteId: filters.pasanteId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.notas ? { notas: filters.notas } : {}),
        ...(filters.desde ? { desde: filters.desde } : {}),
        ...(filters.hasta ? { hasta: filters.hasta } : {}),
      })
      const res = await fetch(`/api/attendance?${params}`)
      const data = (await res.json()) as ListResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al cargar registros')
      setRows(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar registros')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    load()
  }, [load])

  async function handleExport() {
    try {
      const params = new URLSearchParams({
        ...(filters.pasanteId ? { pasanteId: filters.pasanteId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.notas ? { notas: filters.notas } : {}),
        ...(filters.desde ? { desde: filters.desde } : {}),
        ...(filters.hasta ? { hasta: filters.hasta } : {}),
      })
      const res = await fetch(`/api/export/excel?${params}`)
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registros-asistencia-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar')
    }
  }

  function updateFilter<K extends keyof typeof filters>(key: K, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function openEdit(row: AttendanceRow) {
    setEditRecord(row)
    setEditStatus(row.status)
    setEditNotas(row.notas ?? '')
    setEditError('')
    setEditModalOpen(true)
  }

  async function saveEdit() {
    if (!editRecord || editSaving) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/attendance/${editRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, notas: editNotas }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Error al guardar')
        return
      }
      setEditModalOpen(false)
      load()
    } catch {
      setEditError('Error de conexión con el servidor')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registros de Asistencia</h1>
          <p className="text-sm text-slate-500">{total} registro(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-700 dark:bg-slate-800">
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
          label="Justificación / Notas"
          placeholder="Buscar por texto"
          value={filters.notas}
          onChange={(e) => updateFilter('notas', e.target.value)}
        />
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Cargando...</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No hay registros con los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Pasante</th>
                  <th className="px-4 py-3 font-medium">Cédula</th>
                  <th className="px-4 py-3 font-medium">Entrada</th>
                  <th className="px-4 py-3 font-medium">Salida</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Justificación / Notas</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">
                      {format(new Date(r.fecha), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{r.cedula}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.horaEntrada ? format(new Date(r.horaEntrada), 'HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.horaSalida ? format(new Date(r.horaSalida), 'HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">
                      {r.notas ? (
                        <span className="line-clamp-2" title={r.notas}>
                          {r.notas}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                        title="Editar registro"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
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

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar registro de asistencia"
        size="md"
      >
        {editRecord && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {editRecord.nombre} — {format(new Date(editRecord.fecha), 'dd/MM/yyyy')}
            </p>

            <Select
              label="Estado"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as AttendanceRow['status'])}
            >
              <option value="PRESENTE">Presente</option>
              <option value="TARDANZA">Tardanza</option>
              <option value="AUSENTE">Ausente</option>
              <option value="PERMISO">Permiso</option>
            </Select>

            <Textarea
              label="Justificación / Notas"
              rows={3}
              value={editNotas}
              onChange={(e) => setEditNotas(e.target.value)}
              placeholder="Observaciones del registro..."
            />

            {editError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={editSaving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
