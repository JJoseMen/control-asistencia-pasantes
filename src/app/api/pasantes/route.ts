import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { isValidTime } from '@/lib/hours'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const query = searchParams.get('q')?.trim() ?? ''
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10))
    const includeInactive = searchParams.get('activo') === 'false'

    const where = {
      ...(includeInactive ? {} : { activo: true }),
      ...(query
        ? {
            OR: [
              { user: { name: { contains: query, mode: 'insensitive' as const } } },
              { cedula: { contains: query, mode: 'insensitive' as const } },
              { user: { email: { contains: query, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [pasantes, total] = await prisma.$transaction([
      prisma.pasante.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { user: { name: 'asc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pasante.count({ where }),
    ])

    const items = pasantes.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      cedula: p.cedula,
      institucion: p.institucion,
      carrera: p.carrera,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      activo: p.activo,
    }))

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('[pasantes GET]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const cedula = typeof body.cedula === 'string' ? body.cedula.trim() : ''
    const institucion = typeof body.institucion === 'string' ? body.institucion.trim() : null
    const carrera = typeof body.carrera === 'string' ? body.carrera.trim() : null
    const fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null
    const fechaFin = body.fechaFin ? new Date(body.fechaFin) : null

    if (!name || !email || !cedula || !fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Campos obligatorios: nombre, email, cédula, fecha inicio y fecha fin' },
        { status: 400 }
      )
    }
    if (fechaFin <= fechaInicio) {
      return NextResponse.json({ error: 'La fecha fin debe ser posterior a la fecha inicio' }, { status: 400 })
    }
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })
    }
    const existingCedula = await prisma.pasante.findUnique({ where: { cedula } })
    if (existingCedula) {
      return NextResponse.json({ error: 'La cédula ya está registrada' }, { status: 409 })
    }

    const initialPassword = randomBytes(12).toString('base64url')
    const passwordHash = await bcrypt.hash(initialPassword, 10)

    const pasante = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          name,
          role: 'PASANTE',
          mustChangePassword: true,
        },
      })
      return tx.pasante.create({
        data: {
          userId: user.id,
          cedula,
          institucion,
          carrera,
          fechaInicio,
          fechaFin,
        },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
    })

    return NextResponse.json(
      {
        pasante: {
          id: pasante.id,
          userId: pasante.userId,
          name: pasante.user.name,
          email: pasante.user.email,
          cedula: pasante.cedula,
          institucion: pasante.institucion,
          carrera: pasante.carrera,
          fechaInicio: pasante.fechaInicio,
          fechaFin: pasante.fechaFin,
          activo: pasante.activo,
        },
        initialPassword,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[pasantes POST]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
