'use client'

import { useCallback, useEffect, useState } from 'react'
import AttendanceCalendar from '@/components/admin/AttendanceCalendar'
import { Select } from '@/components/ui/Select'

interface PasanteOption {
  id: string
  name: string
}

export default function CalendarioPage() {
  const [pasantes, setPasantes] = useState<PasanteOption[]>([])
  const [selected, setSelected] = useState('')

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendario de Asistencias</h1>
          <p className="text-sm text-slate-500">Vista mensual de la asistencia registrada</p>
        </div>
        <Select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="sm:w-64"
        >
          <option value="">Todos los pasantes</option>
          {pasantes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <AttendanceCalendar pasanteId={selected || undefined} />
      </div>
    </div>
  )
}
