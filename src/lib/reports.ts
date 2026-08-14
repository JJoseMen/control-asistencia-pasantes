import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import type { NextRequest } from 'next/server'

export interface ReportFilters {
  pasanteId?: string
  status?: string
  notas?: string
  desde?: Date
  hasta?: Date
}

export function buildReportWhere(searchParams: URLSearchParams): ReportFilters {
  const filters: ReportFilters = {}
  const pasanteId = searchParams.get('pasanteId')
  const status = searchParams.get('status')
  const notas = searchParams.get('notas')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  if (pasanteId) filters.pasanteId = pasanteId
  if (status) filters.status = status
  if (notas) filters.notas = notas
  if (desde) {
    const d = new Date(desde)
    filters.desde = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  if (hasta) {
    const h = new Date(hasta)
    filters.hasta = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1)
  }
  return filters
}

export function whereFromFilters(filters: ReportFilters) {
  const where: Record<string, unknown> = {}
  if (filters.pasanteId) where.pasanteId = filters.pasanteId
  if (filters.status) where.status = filters.status
  if (filters.notas) where.notas = { contains: filters.notas, mode: 'insensitive' }
  if (filters.desde || filters.hasta) {
    const range: Record<string, Date> = {}
    if (filters.desde) range.gte = filters.desde
    if (filters.hasta) range.lte = filters.hasta
    where.fecha = range
  }
  return where
}

export async function fetchReportData(filters: ReportFilters) {
  const where = whereFromFilters(filters)
  const records = await prisma.attendance.findMany({
    where,
    include: {
      pasante: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: [{ fecha: 'asc' }, { horaEntrada: 'asc' }],
  })

  return records.map((a) => ({
    id: a.id,
    pasanteId: a.pasanteId,
    nombre: a.pasante.user.name,
    email: a.pasante.user.email,
    cedula: a.pasante.cedula,
    telefono: a.pasante.telefono,
    institucion: a.pasante.institucion,
    carrera: a.pasante.carrera,
    fecha: a.fecha,
    horaEntrada: a.horaEntrada,
    horaSalida: a.horaSalida,
    latitud: a.latitud,
    longitud: a.longitud,
    status: a.status,
    notas: a.notas,
  }))
}

export const STATUS_LABELS: Record<string, string> = {
  PRESENTE: 'Presente',
  AUSENTE: 'Ausente',
  TARDANZA: 'Tardanza',
  PERMISO: 'Permiso',
}

export function isAdminRequest(request: NextRequest): boolean {
  const session = getSessionFromRequest(request)
  return session?.role === 'ADMIN'
}
