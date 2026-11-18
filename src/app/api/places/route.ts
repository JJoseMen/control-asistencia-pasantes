import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const places = await prisma.place.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ items: places })
  } catch (error) {
    console.error('[places GET]', error)
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
    const lat = Number(body.lat)
    const lng = Number(body.lng)
    const radio = Number(body.radio || 500)

    if (!name) {
      return NextResponse.json({ error: 'El nombre del lugar es obligatorio' }, { status: 400 })
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Latitud y longitud deben ser números válidos' }, { status: 400 })
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordenadas fuera de rango (lat: -90 a 90, lng: -180 a 180)' },
        { status: 400 }
      )
    }
    if (!Number.isFinite(radio) || radio <= 0) {
      return NextResponse.json({ error: 'El radio debe ser un número mayor a 0' }, { status: 400 })
    }

    const place = await prisma.place.create({
      data: { name, lat, lng, radio },
    })

    return NextResponse.json({ place }, { status: 201 })
  } catch (error) {
    console.error('[places POST]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
