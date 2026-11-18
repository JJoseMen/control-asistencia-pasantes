'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, setAuthCookie, clearAuthCookie, getSession } from '@/lib/auth'
import type { UserSession } from '@/types'

export interface LoginResult {
  ok: boolean
  error?: string
  redirectTo?: string
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { ok: false, error: 'Email y contraseña son obligatorios' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return { ok: false, error: 'Credenciales inválidas' }
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return { ok: false, error: 'Credenciales inválidas' }
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  })
  await setAuthCookie(token)

  return {
    ok: true,
    redirectTo: user.role === 'ADMIN' ? '/admin/dashboard' : '/pasante/marcar',
  }
}

export async function logoutAction(): Promise<void> {
  await clearAuthCookie()
  redirect('/login')
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}
