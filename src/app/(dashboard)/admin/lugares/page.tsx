'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapPin, Pencil, Plus, Power, RefreshCw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface Place {
  id: string
  name: string
  lat: number
  lng: number
  radio: number
  activo: boolean
}

const emptyForm = { name: '', lat: '', lng: '', radio: '500' }

export default function LugaresPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Place | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/places')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar lugares')
      setPlaces(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar lugares')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 4000)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(p: Place) {
    setEditing(p)
    setForm({ name: p.name, lat: String(p.lat), lng: String(p.lng), radio: String(p.radio) })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/places/${editing.id}` : '/api/places'
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al guardar el lugar')
        return
      }
      setModalOpen(false)
      showToast(editing ? 'Lugar actualizado' : 'Lugar creado')
      load()
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(p: Place) {
    const res = await fetch(`/api/places/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !p.activo }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al cambiar estado')
      return
    }
    showToast(p.activo ? 'Lugar desactivado' : 'Lugar activado')
    load()
  }

  async function handleDelete(p: Place) {
    const res = await fetch(`/api/places/${p.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al eliminar el lugar')
      return
    }
    showToast('Lugar eliminado')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lugares de Pasantía</h1>
          <p className="text-sm text-slate-500">
            Lugares donde los pasantes marcan asistencia (nombre, coordenadas y radio)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} size="sm">
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo lugar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Cargando...</p>
        ) : places.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            Aún no hay lugares configurados. Crea el primero.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Latitud</th>
                  <th className="px-4 py-3 font-medium">Longitud</th>
                  <th className="px-4 py-3 font-medium">Radio (m)</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {places.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-indigo-500" />
                        {p.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.lat.toFixed(6)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.lng.toFixed(6)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.radio}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.activo ? 'success' : 'neutral'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(p)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-amber-600"
                          title={p.activo ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar lugar' : 'Nuevo lugar'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del lugar"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Oficina Principal, Sede Norte"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitud"
              name="lat"
              type="number"
              step="any"
              required
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              placeholder="Ej: -16.50129"
            />
            <Input
              label="Longitud"
              name="lng"
              type="number"
              step="any"
              required
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              placeholder="Ej: -68.134955"
            />
          </div>
          <div>
            <Input
              label="Radio permitido (metros)"
              name="radio"
              type="number"
              min="1"
              required
              value={form.radio}
              onChange={(e) => setForm((f) => ({ ...f, radio: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Distancia máxima desde las coordenadas para permitir marcar asistencia.
            </p>
          </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear lugar'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
