'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildReportWhere, fetchReportData } from '@/lib/reports'

export interface ReportSummary {
  total: number
  presentes: number
  ausentes: number
  tardanzas: number
  permisos: number
  pasantesConRegistro: number
  totalPasantes: number
}export async function getReportSummary(
  searchParams: Record<string, string | undefined>
): Promise<{ ok: boolean; data?: ReportSummary; error?: string }> {
  try {
    const session = await getSession()
    if (!session) return { ok: false, error: 'No autorizado' }
    if (session.role !== 'ADMIN') return { ok: false, error: 'Acceso denegado' }

    const urlSearch = new URLSearchParams()
    if (searchParams.pasanteId) urlSearch.set('pasanteId', searchParams.pasanteId)
    if (searchParams.status) urlSearch.set('status', searchParams.status)
    if (searchParams.desde) urlSearch.set('desde', searchParams.desde)
    if (searchParams.hasta) urlSearch.set('hasta', searchParams.hasta)
    const filters = buildReportWhere(urlSearch)

    const records = await fetchReportData(filters)
    const [totalPasantes] = await Promise.all([
      prisma.pasante.count({ where: { activo: true } }),
    ])

    return {
      ok: true,
      data: {
        total: records.length,
        presentes: records.filter((r) => r.status === 'PRESENTE').length,
        ausentes: records.filter((r) => r.status === 'AUSENTE').length,
        tardanzas: records.filter((r) => r.status === 'TARDANZA').length,
        permisos: records.filter((r) => r.status === 'PERMISO').length,
        pasantesConRegistro: new Set(records.map((r) => r.pasanteId)).size,
        totalPasantes,
      },
    }
  } catch (error) {
    console.error('[getReportSummary]', error)
    return { ok: false, error: 'Error interno del servidor' }
  }
}
