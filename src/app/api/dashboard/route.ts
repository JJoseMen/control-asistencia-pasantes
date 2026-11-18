import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const [totalPasantes, registrosHoy, pasantesConRegistroHoy] = await Promise.all([
      prisma.pasante.count({ where: { activo: true } }),
      prisma.attendance.findMany({
        where: { fecha: { gte: startOfDay, lt: endOfDay } },
        select: { status: true, pasanteId: true },
      }),
      prisma.attendance.groupBy({
        by: ['pasanteId'],
        where: { fecha: { gte: startOfDay, lt: endOfDay } },
        _count: { pasanteId: true },
      }),
    ])

    const presentes = registrosHoy.filter((r) => r.status === 'PRESENTE').length
    const tardanzas = registrosHoy.filter((r) => r.status === 'TARDANZA').length
    const permisos = registrosHoy.filter((r) => r.status === 'PERMISO').length
    const ausentes = Math.max(0, totalPasantes - pasantesConRegistroHoy.length)

    const weekDays: { fecha: string; presentes: number; tardanzas: number; ausentes: number; permisos: number }[] =
      []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
      const dayRecords = await prisma.attendance.findMany({
        where: { fecha: { gte: dayStart, lt: dayEnd } },
        select: { status: true, pasanteId: true },
      })
      weekDays.push({
        fecha: dayStart.toISOString().slice(0, 10),
        presentes: dayRecords.filter((r) => r.status === 'PRESENTE').length,
        tardanzas: dayRecords.filter((r) => r.status === 'TARDANZA').length,
        ausentes: Math.max(0, totalPasantes - new Set(dayRecords.map((r) => r.pasanteId)).size),
        permisos: dayRecords.filter((r) => r.status === 'PERMISO').length,
      })
    }

    const ultimosRegistros = await prisma.attendance.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        pasante: { include: { user: { select: { name: true } } } },
      },
    })

    const activity = ultimosRegistros.map((a) => ({
      id: a.id,
      nombre: a.pasante.user.name,
      fecha: a.fecha,
      horaEntrada: a.horaEntrada,
      horaSalida: a.horaSalida,
      status: a.status,
    }))

    return NextResponse.json({
      totalPasantes,
      presentes,
      tardanzas,
      ausentes,
      permisos,
      semana: weekDays,
      activity,
    })
  } catch (error) {
    console.error('[dashboard GET]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
