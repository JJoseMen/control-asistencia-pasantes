import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { isValidTime } from '@/lib/hours'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await context.params
    const pasante = await prisma.pasante.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } } },
    })
    if (!pasante) {
      return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      pasante: {
        id: pasante.id,
        userId: pasante.userId,
        name: pasante.user.name,
        email: pasante.user.email,
        cedula: pasante.cedula,
        telefono: pasante.telefono,
        institucion: pasante.institucion,
        carrera: pasante.carrera,
        lugarId: pasante.lugarId,
        horaEntrada: pasante.horaEntrada,
        horaSalida: pasante.horaSalida,
        fechaInicio: pasante.fechaInicio,
        fechaFin: pasante.fechaFin,
        activo: pasante.activo,
      },
    })
  } catch (error) {
    console.error('[pasantes GET by id]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await context.params
    const existing = await prisma.pasante.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 })
    }

    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
    const cedula = typeof body.cedula === 'string' ? body.cedula.trim() : undefined
    const telefono =
      typeof body.telefono === 'string' ? body.telefono.trim() : body.telefono === null ? null : undefined
    const institucion =
      typeof body.institucion === 'string' ? body.institucion.trim() : body.institucion === null ? null : undefined
    const carrera =
      typeof body.carrera === 'string' ? body.carrera.trim() : body.carrera === null ? null : undefined
    const lugarId =
      typeof body.lugarId === 'string' && body.lugarId ? body.lugarId : body.lugarId === null ? null : undefined
    const horaEntrada =
      typeof body.horaEntrada === 'string' && body.horaEntrada.trim()
        ? body.horaEntrada.trim()
        : undefined
    const horaSalida =
      typeof body.horaSalida === 'string' && body.horaSalida.trim()
        ? body.horaSalida.trim()
        : undefined
    const fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : undefined
    const fechaFin = body.fechaFin ? new Date(body.fechaFin) : undefined

    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      return NextResponse.json({ error: 'La fecha fin debe ser posterior a la fecha inicio' }, { status: 400 })
    }

    if (horaEntrada !== undefined && !isValidTime(horaEntrada)) {
      return NextResponse.json({ error: 'La hora de entrada debe tener formato HH:mm' }, { status: 400 })
    }
    if (horaSalida !== undefined && !isValidTime(horaSalida)) {
      return NextResponse.json({ error: 'La hora de salida debe tener formato HH:mm' }, { status: 400 })
    }
    const effectiveHoraEntrada = horaEntrada ?? existing.horaEntrada
    const effectiveHoraSalida = horaSalida ?? existing.horaSalida
    if (effectiveHoraSalida <= effectiveHoraEntrada) {
      return NextResponse.json(
        { error: 'La hora de salida debe ser posterior a la hora de entrada' },
        { status: 400 }
      )
    }

    if (email) {
      const conflict = await prisma.user.findFirst({
        where: { email, id: { not: existing.userId } },
      })
      if (conflict) {
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })
      }
    }

    if (cedula) {
      const conflict = await prisma.pasante.findFirst({
        where: { cedula, id: { not: existing.id } },
      })
      if (conflict) {
        return NextResponse.json({ error: 'La cédula ya está registrada' }, { status: 409 })
      }
    }

    const pasante = await prisma.$transaction(async (tx) => {
      if (name || email) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(name ? { name } : {}),
            ...(email ? { email } : {}),
          },
        })
      }
      return tx.pasante.update({
        where: { id },
        data: {
          ...(cedula ? { cedula } : {}),
          ...(telefono !== undefined ? { telefono } : {}),
          ...(institucion !== undefined ? { institucion } : {}),
          ...(carrera !== undefined ? { carrera } : {}),
          ...(lugarId !== undefined ? { lugarId } : {}),
          ...(horaEntrada !== undefined ? { horaEntrada } : {}),
          ...(horaSalida !== undefined ? { horaSalida } : {}),
          ...(fechaInicio ? { fechaInicio } : {}),
          ...(fechaFin ? { fechaFin } : {}),
        },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
    })

    return NextResponse.json({
      pasante: {
        id: pasante.id,
        userId: pasante.userId,
        name: pasante.user.name,
        email: pasante.user.email,
        cedula: pasante.cedula,
        telefono: pasante.telefono,
        institucion: pasante.institucion,
        carrera: pasante.carrera,
        lugarId: pasante.lugarId,
        horaEntrada: pasante.horaEntrada,
        horaSalida: pasante.horaSalida,
        fechaInicio: pasante.fechaInicio,
        fechaFin: pasante.fechaFin,
        activo: pasante.activo,
      },
    })
  } catch (error) {
    console.error('[pasantes PUT]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await context.params
    const existing = await prisma.pasante.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    if (typeof body.activo !== 'boolean') {
      return NextResponse.json({ error: 'El campo activo es obligatorio' }, { status: 400 })
    }

    const pasante = await prisma.pasante.update({
      where: { id },
      data: { activo: body.activo },
    })

    return NextResponse.json({ pasante: { id: pasante.id, activo: pasante.activo } })
  } catch (error) {
    console.error('[pasantes PATCH]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await context.params
    const existing = await prisma.pasante.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { pasanteId: id } }),
      prisma.pasante.delete({ where: { id } }),
      prisma.user.delete({ where: { id: existing.userId } }),
    ])

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error('[pasantes DELETE]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
