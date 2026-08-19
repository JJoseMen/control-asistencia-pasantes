'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { isWithinOfficeRadius } from '@/lib/location'
import { getAttendanceStatus } from '@/lib/hours'
import { getPasantePlaceCoords } from '@/lib/places'

export interface AttendanceActionResult {
  ok: boolean
  error?: string
  attendance?: unknown
}

export async function checkInAction(lat: number, lng: number): Promise<AttendanceActionResult> {
  try {
    const session = await getSession()
    if (!session) return { ok: false, error: 'No autorizado' }
    if (session.role !== 'PASANTE') return { ok: false, error: 'Acceso denegado' }

    const pasante = await prisma.pasante.findUnique({ where: { userId: session.sub } })
    if (!pasante) return { ok: false, error: 'No tienes un perfil de pasante' }
    if (!pasante.activo) return { ok: false, error: 'Tu cuenta está inactiva' }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: 'Geolocalización inválida' }
    }

    const place = await getPasantePlaceCoords(pasante.id)

    if (!isWithinOfficeRadius(lat, lng, place.lat, place.lng, place.radio)) {
      return { ok: false, error: `Estás fuera del radio permitido de ${place.name}` }
    }
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const existing = await prisma.attendance.findFirst({
      where: {
        pasanteId: pasante.id,
        fecha: { gte: startOfDay, lt: endOfDay },
      },
    })
    if (existing?.horaEntrada) {
      return { ok: false, error: 'Ya marcaste entrada hoy' }
    }

    const attendance = await prisma.attendance.create({
      data: {
        pasanteId: pasante.id,
        fecha: startOfDay,
        horaEntrada: now,
        latitud: lat,
        longitud: lng,
        status: getAttendanceStatus(now, pasante.horaEntrada),
      },
    })

    return { ok: true, attendance }
  } catch (error) {
    console.error('[checkInAction]', error)
    return { ok: false, error: 'Error interno del servidor' }
  }
}

export async function checkOutAction(): Promise<AttendanceActionResult> {
  try {
    const session = await getSession()
    if (!session) return { ok: false, error: 'No autorizado' }
    if (session.role !== 'PASANTE') return { ok: false, error: 'Acceso denegado' }

    const pasante = await prisma.pasante.findUnique({ where: { userId: session.sub } })
    if (!pasante) return { ok: false, error: 'No tienes un perfil de pasante' }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const today = await prisma.attendance.findFirst({
      where: {
        pasanteId: pasante.id,
        fecha: { gte: startOfDay, lt: endOfDay },
      },
    })
    if (!today || !today.horaEntrada) {
      return { ok: false, error: 'Debes marcar entrada antes de marcar salida' }
    }
    if (today.horaSalida) {
      return { ok: false, error: 'Ya marcaste salida hoy' }
    }

    const attendance = await prisma.attendance.update({
      where: { id: today.id },
      data: { horaSalida: now },
    })

    return { ok: true, attendance }
  } catch (error) {
    console.error('[checkOutAction]', error)
    return { ok: false, error: 'Error interno del servidor' }
  }
}
