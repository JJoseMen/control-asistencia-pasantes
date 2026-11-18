import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import type { Role, UserSession } from '@/types'

const PLACEHOLDER = 'CAMBIAR_EN_PROD_MIN_32_CHARS'
const rawSecret = process.env.JWT_SECRET
if (!rawSecret || rawSecret.length < 32 || rawSecret === PLACEHOLDER) {
  throw new Error(
    'JWT_SECRET inválido: debe existir, tener al menos 32 caracteres ' +
    'y no ser el placeholder. Configúralo en .env.local (dev) o en ' +
    'las variables de entorno del deploy (prod).'
  )
}
const JWT_SECRET: string = rawSecret
const TOKEN_COOKIE = 'token'

export interface TokenPayload {
  sub: string
  email: string
  role: Role
}

export function signToken(user: { id: string; email: string; role: Role }): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return request.cookies.get(TOKEN_COOKIE)?.value ?? null
}

export function getSessionFromRequest(request: NextRequest): TokenPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}

export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies()
  store.delete(TOKEN_COOKIE)
}

export async function getSession(): Promise<TokenPayload | null> {
  const store = await cookies()
  const token = store.get(TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function toUserSession(payload: TokenPayload, name: string): UserSession {
  return {
    id: payload.sub,
    email: payload.email,
    name,
    role: payload.role,
  }
}
