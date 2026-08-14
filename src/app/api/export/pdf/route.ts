import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { buildReportWhere, fetchReportData, isAdminRequest, STATUS_LABELS } from '@/lib/reports'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const filters = buildReportWhere(request.nextUrl.searchParams)
  const records = await fetchReportData(filters)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte de Asistencias', 14, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`, 14, 24)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 30,
    head: [['Fecha', 'Pasante', 'Cédula', 'Entrada', 'Salida', 'Estado', 'Notas']],
    body: records.map((r) => [
      format(new Date(r.fecha), 'dd/MM/yyyy'),
      r.nombre,
      r.cedula,
      r.horaEntrada ? format(new Date(r.horaEntrada), 'HH:mm') : '—',
      r.horaSalida ? format(new Date(r.horaSalida), 'HH:mm') : '—',
      STATUS_LABELS[r.status] || r.status,
      r.notas || '—',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  })

  const filename = `reporte-asistencias-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  const buffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
