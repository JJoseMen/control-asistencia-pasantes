'use client'

import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Eye, EyeOff, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Pasante } from '@/types'

export type SortKey = 'name' | 'cedula' | 'institucion' | 'carrera' | 'horaEntrada' | 'horaSalida' | 'activo'

export interface PasantesTableProps {
  pasantes: Pasante[]
  onEdit: (pasante: Pasante) => void
  onView: (pasante: Pasante) => void
  onToggleActive: (pasante: Pasante) => void
  onDelete: (pasante: Pasante) => void
}

const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'cedula', label: 'Cédula' },
  { key: 'institucion', label: 'Institución' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'horaEntrada', label: 'Entrada' },
  { key: 'horaSalida', label: 'Salida' },
  { key: 'activo', label: 'Estado' },
]

export function PasantesTable({
  pasantes,
  onEdit,
  onView,
  onToggleActive,
  onDelete,
}: PasantesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...pasantes].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    const cmp =
      typeof av === 'boolean' && typeof bv === 'boolean'
        ? (av === bv ? 0 : av ? 1 : -1)
        : String(av ?? '').localeCompare(String(bv ?? ''), 'es')
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map(({ key, label }) => (
              <th key={key} className="px-4 py-3 font-medium">
                <button
                  onClick={() => handleSort(key)}
                  className="inline-flex items-center gap-1 hover:text-slate-800"
                >
                  {label}
                  {sortKey === key ? (
                    sortDir === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                  )}
                </button>
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {sorted.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
              <td className="px-4 py-3 text-slate-600">{p.cedula}</td>
              <td className="px-4 py-3 text-slate-600">{p.institucion || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{p.carrera || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{p.horaEntrada || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{p.horaSalida || '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={p.activo ? 'success' : 'neutral'}>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => {
                      setExpandedId(expandedId === p.id ? null : p.id)
                      onView(p)
                    }}
                    className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    title="Ver detalle"
                  >
                    {expandedId === p.id ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => onEdit(p)}
                    className="rounded-md p-1.5 text-indigo-600 transition hover:bg-indigo-50"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggleActive(p)}
                    className={cn(
                      'rounded-md p-1.5 text-xs font-semibold transition',
                      p.activo
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    )}
                  >
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="rounded-md p-1.5 text-rose-600 transition hover:bg-rose-50"
                    title="Eliminar definitivamente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-500">No hay pasantes para mostrar.</p>
      )}
      <p className="sr-only">Inicio: {format(new Date(), 'dd/MM/yyyy')}</p>
    </div>
  )
}
