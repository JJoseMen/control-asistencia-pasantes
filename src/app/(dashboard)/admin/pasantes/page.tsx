'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Plus, RefreshCw, Search, Trash2, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { PasantesTable } from '@/components/admin/PasantesTable'
import { PasanteForm } from '@/components/admin/PasanteForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import type { Pasante } from '@/types'

interface ListResponse {
  items: Pasante[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; pasante: Pasante }
  | { type: 'view'; pasante: Pasante }
  | { type: 'delete'; pasante: Pasante }
  | { type: null }

export default function PasantesPage() {
  const [pasantes, setPasantes] = useState<Pasante[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<ModalState>({ type: null })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        ...(query ? { q: query } : {}),
        ...(includeInactive ? { activo: 'false' } : {}),
      })
      const res = await fetch(`/api/pasantes?${params}`)
      const data = (await res.json()) as ListResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al cargar pasantes')
      setPasantes(data.items)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pasantes')
    } finally {
      setLoading(false)
    }
  }, [page, query, includeInactive])

  useEffect(() => {
    load()
  }, [load])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 4000)
  }

  async function handleToggleActive(p: Pasante) {
    const res = await fetch(`/api/pasantes/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !p.activo }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al cambiar estado')
      return
    }
    showToast(p.activo ? 'Pasante desactivado' : 'Pasante activado')
    load()
  }

  async function handleDelete() {
    if (modal.type !== 'delete') return
    const p = modal.pasante
    const res = await fetch(`/api/pasantes/${p.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al eliminar el pasante')
      setModal({ type: null })
      return
    }
    setModal({ type: null })
    showToast('Pasante eliminado definitivamente')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Pasantes</h1>
          <p className="text-sm text-slate-500">{total} pasante(s)</p>
        </div>
        <Button onClick={() => setModal({ type: 'create' })}>
          <UserPlus className="h-4 w-4" />
          Nuevo pasante
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="text"
            icon={Search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nombre, cédula o email..."
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => {
              setIncludeInactive(e.target.checked)
              setPage(1)
            }}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Incluir inactivos
        </label>
        <Button variant="outline" onClick={load} size="sm">
          <RefreshCw className="h-4 w-4" />
          Refrescar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Cargando...</p>
        ) : (
          <PasantesTable
            pasantes={pasantes}
            onEdit={(p) => setModal({ type: 'edit', pasante: p })}
            onView={(p) => setModal({ type: 'view', pasante: p })}
            onToggleActive={handleToggleActive}
            onDelete={(p) => setModal({ type: 'delete', pasante: p })}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={modal.type === 'create'}
        onClose={() => setModal({ type: null })}
        title="Nuevo pasante"
      >
        <PasanteForm
          pasante={null}
          onCancel={() => setModal({ type: null })}
          onSuccess={(msg) => {
            showToast(msg)
            load()
          }}
        />
      </Modal>

      <Modal
        open={modal.type === 'edit'}
        onClose={() => setModal({ type: null })}
        title="Editar pasante"
      >
        {modal.type === 'edit' && (
          <PasanteForm
            pasante={modal.pasante}
            onCancel={() => setModal({ type: null })}
            onSuccess={(msg) => {
              setModal({ type: null })
              showToast(msg)
              load()
            }}
          />
        )}
      </Modal>

      <Modal
        open={modal.type === 'view'}
        onClose={() => setModal({ type: null })}
        title="Detalle del pasante"
      >
        {modal.type === 'view' && <PasanteDetail pasante={modal.pasante} />}
      </Modal>

      <Modal
        open={modal.type === 'delete'}
        onClose={() => setModal({ type: null })}
        title="Eliminar pasante"
      >
        {modal.type === 'delete' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="text-sm text-rose-700">
                <p className="font-semibold">¿Estás seguro?</p>
                <p className="mt-1">
                  Se eliminará <span className="font-semibold">{modal.pasante.name}</span> y todos sus
                  registros de asistencia. Esta acción es definitiva y no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal({ type: null })}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Eliminar definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

function PasanteDetail({ pasante }: { pasante: Pasante }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">{pasante.name}</p>
          <p className="text-slate-500">{pasante.email}</p>
        </div>
        <Badge variant={pasante.activo ? 'success' : 'neutral'}>
          {pasante.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Cédula</dt>
          <dd className="mt-0.5 text-slate-800">{pasante.cedula}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Teléfono</dt>
          <dd className="mt-0.5 text-slate-800">{pasante.telefono || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Institución</dt>
          <dd className="mt-0.5 text-slate-800">{pasante.institucion || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Carrera</dt>
          <dd className="mt-0.5 text-slate-800">{pasante.carrera || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Hora de entrada</dt>
          <dd className="mt-0.5 text-slate-800">{pasante.horaEntrada || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Hora de salida</dt>
          <dd className="mt-0.5 text-slate-800">{pasante.horaSalida || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Fecha inicio</dt>
          <dd className="mt-0.5 text-slate-800">{format(new Date(pasante.fechaInicio), 'dd/MM/yyyy')}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Fecha fin</dt>
          <dd className="mt-0.5 text-slate-800">{format(new Date(pasante.fechaFin), 'dd/MM/yyyy')}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
        <Trash2 className="h-4 w-4" />
        <span className="text-xs">Para desactivar/activar, usa el botón en la tabla.</span>
      </div>
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-slate-300" />
      </div>
    </div>
  )
}
