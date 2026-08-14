'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, Users, FileSpreadsheet, CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export interface ActivityItem {
  id: string
  nombre: string
  fecha: string
  horaEntrada?: string | null
  horaSalida?: string | null
  status: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'PERMISO'
}

const statusVariant: Record<ActivityItem['status'], 'success' | 'warning' | 'danger' | 'info'> = {
  PRESENTE: 'success',
  TARDANZA: 'warning',
  AUSENTE: 'danger',
  PERMISO: 'info',
}

const statusLabel: Record<ActivityItem['status'], string> = {
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  AUSENTE: 'Ausente',
  PERMISO: 'Permiso',
}

interface Props {
  activity: ActivityItem[]
}

export default function ReportsPanel({ activity }: Props) {
  const quickLinks = [
    { href: '/admin/pasantes', label: 'Gestionar pasantes', icon: Users },
    { href: '/admin/registros', label: 'Ver registros', icon: FileSpreadsheet },
    { href: '/admin/calendario', label: 'Ver calendario', icon: CalendarDays },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Accesos rápidos
        </h2>
        <div className="space-y-2">
          {quickLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                {label}
              </span>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600" />
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Actividad reciente
        </h2>
        {activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Sin actividad registrada aún.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{a.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(a.fecha), "EEEE d 'de' MMMM", { locale: es })} · Entrada{' '}
                    {a.horaEntrada ? format(new Date(a.horaEntrada), 'HH:mm') : '—'} · Salida{' '}
                    {a.horaSalida ? format(new Date(a.horaSalida), 'HH:mm') : '—'}
                  </p>
                </div>
                <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
