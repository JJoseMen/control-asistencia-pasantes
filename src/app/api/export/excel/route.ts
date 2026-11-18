import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { buildReportWhere, fetchReportData, isAdminRequest, STATUS_LABELS } from '@/lib/reports'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const filters = buildReportWhere(request.nextUrl.searchParams)
  const records = await fetchReportData(filters)

  const rows = records.map((r) => ({
    Fecha: format(new Date(r.fecha), 'dd/MM/yyyy'),
    Pasante: r.nombre,
    Cédula: r.cedula,
    Email: r.email,
    Institución: r.institucion || '',
    Carrera: r.carrera || '',
    'Hora Entrada': r.horaEntrada ? format(new Date(r.horaEntrada), 'HH:mm') : '',
    'Hora Salida': r.horaSalida ? format(new Date(r.horaSalida), 'HH:mm') : '',
    Estado: STATUS_LABELS[r.status] || r.status,
    Notas: r.notas || '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 12 },
    { wch: 28 },
    { wch: 24 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencias')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `registros-asistencia-${format(new Date(), 'yyyy-MM-dd')}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
