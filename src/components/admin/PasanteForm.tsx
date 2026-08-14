'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Pasante } from '@/types'

export interface PasanteFormData {
  name: string
  email: string
  cedula: string
  telefono: string
  institucion: string
  carrera: string
  lugarId: string
  horaEntrada: string
  horaSalida: string
  fechaInicio: string
  fechaFin: string
}

const emptyForm: PasanteFormData = {
  name: '',
  email: '',
  cedula: '',
  telefono: '',
  institucion: '',
  carrera: '',
  lugarId: '',
  horaEntrada: '08:00',
  horaSalida: '16:00',
  fechaInicio: '',
  fechaFin: '',
}

function toForm(pasante: Pasante | null): PasanteFormData {
  if (!pasante) return emptyForm
  const toDateInput = (d: Date) => {
    const date = new Date(d)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return {
    name: pasante.name,
    email: pasante.email,
    cedula: pasante.cedula,
    telefono: pasante.telefono ?? '',
    institucion: pasante.institucion ?? '',
    carrera: pasante.carrera ?? '',
    lugarId: pasante.lugarId ?? '',
    horaEntrada: pasante.horaEntrada || '08:00',
    horaSalida: pasante.horaSalida || '16:00',
    fechaInicio: toDateInput(pasante.fechaInicio),
    fechaFin: toDateInput(pasante.fechaFin),
  }
}

export interface PasanteFormProps {
  pasante: Pasante | null
  onSuccess: (message: string) => void
  onCancel: () => void
}

export interface CreatedCredentials {
  email: string
  temporaryPassword: string
}

export function PasanteForm({ pasante, onSuccess, onCancel }: PasanteFormProps) {
  const [form, setForm] = useState<PasanteFormData>(() => toForm(pasante))
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [created, setCreated] = useState<CreatedCredentials | null>(null)
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([])

  const isEdit = Boolean(pasante)

  useEffect(() => {
    fetch('/api/places')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setPlaces(data.items.filter((p: { activo: boolean }) => p.activo))
      })
      .catch(() => {})
  }, [])

  function update<K extends keyof PasanteFormData>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (form.horaSalida <= form.horaEntrada) {
      setError('La hora de salida debe ser posterior a la hora de entrada')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(
        isEdit ? `/api/pasantes/${pasante!.id}` : '/api/pasantes',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al guardar el pasante')
        return
      }
      if (isEdit) {
        onSuccess('Pasante actualizado correctamente')
      } else {
        const credentials: CreatedCredentials = {
          email: form.email,
          temporaryPassword: data.temporaryPassword ?? 'pasante123',
        }
        setCreated(credentials)
        onSuccess(`Pasante creado correctamente`)
      }
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setIsLoading(false)
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Pasante creado correctamente</p>
          <p className="mt-1 text-sm text-emerald-700">
            Entrega estas credenciales al pasante para que pueda ingresar:
          </p>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Email</p>
              <p className="font-medium text-slate-900">{created.email}</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(created.email)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Copiar
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Contraseña temporal</p>
              <p className="font-mono font-semibold text-slate-900">{created.temporaryPassword}</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(created.temporaryPassword)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Copiar
            </button>
          </div>
          <p className="text-xs text-slate-500">
            El pasante debe cambiarla en su primer ingreso.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onCancel}>
            Listo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Nombre completo"
          name="name"
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
        <Input
          label="Cédula"
          name="cedula"
          required
          value={form.cedula}
          onChange={(e) => update('cedula', e.target.value)}
        />
        <Input
          label="Teléfono"
          name="telefono"
          value={form.telefono}
          onChange={(e) => update('telefono', e.target.value)}
        />
        <Input
          label="Institución"
          name="institucion"
          value={form.institucion}
          onChange={(e) => update('institucion', e.target.value)}
        />
        <Input
          label="Carrera"
          name="carrera"
          value={form.carrera}
          onChange={(e) => update('carrera', e.target.value)}
        />
        <div>
          <Select
            label="Lugar de pasantía"
            name="lugarId"
            value={form.lugarId}
            onChange={(e) => update('lugarId', e.target.value)}
          >
            <option value="">— Sin lugar asignado —</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Lugar desde el cual debe marcar su asistencia.
          </p>
        </div>
        <Input
          label="Hora de entrada"
          name="horaEntrada"
          type="time"
          required
          value={form.horaEntrada}
          onChange={(e) => update('horaEntrada', e.target.value)}
        />
        <Input
          label="Hora de salida"
          name="horaSalida"
          type="time"
          required
          value={form.horaSalida}
          onChange={(e) => update('horaSalida', e.target.value)}
        />
        <Input
          label="Fecha de inicio"
          name="fechaInicio"
          type="date"
          required
          value={form.fechaInicio}
          onChange={(e) => update('fechaInicio', e.target.value)}
        />
        <Input
          label="Fecha de fin"
          name="fechaFin"
          type="date"
          required
          value={form.fechaFin}
          onChange={(e) => update('fechaFin', e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {isLoading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear pasante'}
        </Button>
      </div>
    </form>
  )
}
