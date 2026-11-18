import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { isWithinOfficeRadius } from '@/lib/location'
import { getAttendanceStatus } from '@/lib/hours'
import { getPasantePlaceCoords } from '@/lib/places'

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
    if (!pasante.activo) {
      return NextResponse.json({ error: 'Tu cuenta está inactiva' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat)
    const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng)
    const tipoMarcado = typeof body.tipoMarcado === 'string' ? body.tipoMarcado : 'PRESENTE'
    const notas = typeof body.notas === 'string' && body.notas.trim() ? body.notas.trim() : null

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const existing = await prisma.attendance.findFirst({
      where: {
        pasanteId: pasante.id,
        fecha: { gte: startOfDay, lt: endOfDay },
      },
    })
    if (existing?.status === 'AUSENTE') {
      return NextResponse.json(
        { error: 'Hoy registraste ausencia, no puedes marcar asistencia' },
        { status: 409 }
      )
    }
    if (existing?.horaEntrada) {
      return NextResponse.json(
        { error: 'Ya marcaste entrada hoy', attendance: existing },
        { status: 409 }
      )
    }

    if (tipoMarcado === 'AUSENTE') {
      if (!notas || notas.length < 10) {
        return NextResponse.json(
          { error: 'Escribe una justificación de al menos 10 caracteres' },
          { status: 400 }
        )
      }
      const attendance = await prisma.attendance.create({
        data: {
          pasanteId: pasante.id,
          fecha: startOfDay,
          status: 'AUSENTE',
          notas,
        },
      })
      return NextResponse.json({ attendance }, { status: 201 })
    }

    const place = await getPasantePlaceCoords(pasante.id)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Geolocalización inválida' }, { status: 400 })
    }
    if (!isWithinOfficeRadius(lat, lng, place.lat, place.lng, place.radio)) {
      return NextResponse.json(
        { error: `Estás fuera del radio permitido de ${place.name}` },
        { status: 403 }
      )
    }

    if (tipoMarcado === 'TARDANZA') {
      if (!notas || notas.length < 10) {
        return NextResponse.json(
          { error: 'Escribe la razón de la tardanza (mínimo 10 caracteres)' },
          { status: 400 }
        )
      }
      const attendance = await prisma.attendance.create({
        data: {
          pasanteId: pasante.id,
          fecha: startOfDay,
          horaEntrada: now,
          latitud: lat,
          longitud: lng,
          status: 'TARDANZA',
          notas,
        },
      })
      return NextResponse.json({ attendance }, { status: 201 })
    }

    const status = getAttendanceStatus(now, process.env.WORK_START_TIME || '08:00')

    const attendance = await prisma.attendance.create({
      data: {
        pasanteId: pasante.id,
        fecha: startOfDay,
        horaEntrada: now,
        latitud: lat,
        longitud: lng,
        status,
        ...(notas ? { notas } : {}),
      },
    })

    return NextResponse.json({ attendance }, { status: 201 })
  } catch (error) {
    console.error('[attendance/checkin]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
