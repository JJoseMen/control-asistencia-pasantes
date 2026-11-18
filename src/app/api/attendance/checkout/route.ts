import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'PASANTE') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const pasante = await prisma.pasante.findUnique({ where: { userId: session.sub } })
    if (!pasante) {
      return NextResponse.json({ error: 'No tienes un perfil de pasante' }, { status: 404 })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const body = await request.json().catch(() => ({}))
    const notas = typeof body.notas === 'string' && body.notas.trim() ? body.notas.trim() : undefined

    const today = await prisma.attendance.findFirst({
      where: {
        pasanteId: pasante.id,
        fecha: { gte: startOfDay, lt: endOfDay },
      },
    })
    if (!today || !today.horaEntrada) {
      return NextResponse.json(
        { error: 'Debes marcar entrada antes de marcar salida' },
        { status: 400 }
      )
    }
    if (today.horaSalida) {
      return NextResponse.json(
        { error: 'Ya marcaste salida hoy', attendance: today },
        { status: 409 }
      )
    }

    const attendance = await prisma.attendance.update({
      where: { id: today.id },
      data: {
        horaSalida: now,
        ...(notas !== undefined ? { notas } : {}),
      },
    })

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('[attendance/checkout]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
