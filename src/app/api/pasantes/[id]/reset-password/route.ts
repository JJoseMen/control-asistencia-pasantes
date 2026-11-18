import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await context.params

    const pasante = await prisma.pasante.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!pasante) {
      return NextResponse.json({ error: 'Pasante no encontrado' }, { status: 404 })
    }
    if (!pasante.user) {
      return NextResponse.json({ error: 'Usuario asociado no encontrado' }, { status: 404 })
    }

    const initialPassword = randomBytes(12).toString('base64url')
    const passwordHash = await bcrypt.hash(initialPassword, 10)

    await prisma.user.update({
      where: { id: pasante.user.id },
      data: {
        password: passwordHash,
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
      },
    })

    return NextResponse.json({ initialPassword }, { status: 200 })
  } catch (error) {
    console.error('[pasantes reset-password]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
