import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { getPasantePlaceCoords } from '@/lib/places'

export async function GET(request: NextRequest) {
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

    const today = await prisma.attendance.findFirst({
      where: {
        pasanteId: pasante.id,
        fecha: { gte: startOfDay, lt: endOfDay },
      },
    })

    const place = await getPasantePlaceCoords(pasante.id)

    return NextResponse.json({
      today,
      office: {
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        maxDistanceMeters: place.radio,
      },
      horario: {
        entrada: process.env.WORK_START_TIME || '08:00',
        salida: process.env.WORK_END_TIME || '17:00',
      },
    })
  } catch (error) {
    console.error('[attendance/status]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
