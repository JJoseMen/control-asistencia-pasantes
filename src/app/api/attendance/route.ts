import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 25))
    const status = searchParams.get('status') || undefined
    const notas = searchParams.get('notas') || undefined
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const pasanteId = searchParams.get('pasanteId') || undefined

    const where: Record<string, unknown> = {}

    if (session.role === 'PASANTE') {
      const pasante = await prisma.pasante.findUnique({ where: { userId: session.sub } })
      if (!pasante) {
        return NextResponse.json({ items: [], total: 0, page, pageSize, totalPages: 0 })
      }
      where.pasanteId = pasante.id
    }

    if (status) {
      where.status = status
    }
    if (notas) {
      where.notas = { contains: notas, mode: 'insensitive' }
    }
    if (pasanteId && session.role === 'ADMIN') {
      where.pasanteId = pasanteId
    }
    if (desde) {
      const d = new Date(desde)
      where.fecha = { ...(where.fecha as object), gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
    }
    if (hasta) {
      const h = new Date(hasta)
      where.fecha = {
        ...(where.fecha as object),
        lte: new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1),
      }
    }

    const [items, total] = await prisma.$transaction([
      prisma.attendance.findMany({
        where,
        include: {
          pasante: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.attendance.count({ where }),
    ])

    const records = items.map((a) => ({
      id: a.id,
      pasanteId: a.pasanteId,
      nombre: a.pasante.user.name,
      email: a.pasante.user.email,
      cedula: a.pasante.cedula,
      fecha: a.fecha,
      horaEntrada: a.horaEntrada,
      horaSalida: a.horaSalida,
      latitud: a.latitud,
      longitud: a.longitud,
      status: a.status,
      notas: a.notas,
    }))

    return NextResponse.json({
      items: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('[attendance GET]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
