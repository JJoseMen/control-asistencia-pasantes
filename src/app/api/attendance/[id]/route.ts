import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const VALID_STATUSES = ['PRESENTE', 'TARDANZA', 'AUSENTE', 'PERMISO'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden editar registros' }, { status: 403 })
    }

    const { id } = await params
    const attendance = await prisma.attendance.findUnique({ where: { id } })
    if (!attendance) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))

    const data: Record<string, unknown> = {}

    if (typeof body.status === 'string') {
      if (!VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json(
          { error: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      data.status = body.status
    }

    if ('notas' in body) {
      data.notas = typeof body.notas === 'string' && body.notas.trim() ? body.notas.trim() : null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Sin cambios para aplicar' }, { status: 400 })
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data,
    })

    return NextResponse.json({ attendance: updated })
  } catch (error) {
    console.error('[attendance PATCH]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
