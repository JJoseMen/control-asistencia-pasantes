import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }
    if (!currentPassword) {
      return NextResponse.json({ error: 'La contraseña actual es obligatoria' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.sub } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 401 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, mustChangePassword: false },
    })

    return NextResponse.json({ ok: true, message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    console.error('[auth/change-password]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
