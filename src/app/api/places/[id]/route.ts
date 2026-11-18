import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await context.params
    const existing = await prisma.place.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lugar no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const lat = body.lat !== undefined ? Number(body.lat) : undefined
    const lng = body.lng !== undefined ? Number(body.lng) : undefined
    const radio = body.radio !== undefined ? Number(body.radio) : undefined
    const activo = body.activo !== undefined ? Boolean(body.activo) : undefined

    if (name === '') {
      return NextResponse.json({ error: 'El nombre del lugar es obligatorio' }, { status: 400 })
    }
    if (lat !== undefined && !Number.isFinite(lat)) {
      return NextResponse.json({ error: 'Latitud inválida' }, { status: 400 })
    }
    if (lng !== undefined && !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Longitud inválida' }, { status: 400 })
    }
    if (lat !== undefined && (lat < -90 || lat > 90)) {
      return NextResponse.json({ error: 'Latitud fuera de rango (-90 a 90)' }, { status: 400 })
    }
    if (lng !== undefined && (lng < -180 || lng > 180)) {
      return NextResponse.json({ error: 'Longitud fuera de rango (-180 a 180)' }, { status: 400 })
    }
    if (radio !== undefined && (!Number.isFinite(radio) || radio <= 0)) {
      return NextResponse.json({ error: 'El radio debe ser mayor a 0' }, { status: 400 })
    }

    const place = await prisma.place.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
        ...(radio !== undefined ? { radio } : {}),
        ...(activo !== undefined ? { activo } : {}),
      },
    })

    return NextResponse.json({ place })
  } catch (error) {
    console.error('[places PUT]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await context.params
    const existing = await prisma.place.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lugar no encontrado' }, { status: 404 })
    }

    const pasantes = await prisma.pasante.count({ where: { placeId: id } })
    if (pasantes > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: ${pasantes} pasante(s) asignado(s) a este lugar` },
        { status: 409 }
      )
    }

    await prisma.place.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error('[places DELETE]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
