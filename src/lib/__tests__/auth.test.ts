import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

const ORIGINAL_SECRET = process.env.JWT_SECRET

function setSecret(secret: string | undefined) {
  if (secret === undefined) {
    delete process.env.JWT_SECRET
  } else {
    process.env.JWT_SECRET = secret
  }
}

beforeEach(() => {
  vi.resetModules()
  setSecret('test-secret-min-32-chars-for-testing')
})

afterEach(() => {
  setSecret(ORIGINAL_SECRET)
})

describe('auth.ts', () => {
  it('signToken + verifyToken funcionan con JWT_SECRET válido', async () => {
    const { signToken, verifyToken } = await import('../auth')
    const payload = { id: 'user-1', email: 'test@test.com', role: 'PASANTE' as const, tokenVersion: 1 }
    const token = signToken(payload)
    const decoded = verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.sub).toBe('user-1')
    expect(decoded?.email).toBe('test@test.com')
    expect(decoded?.role).toBe('PASANTE')
    expect(decoded?.tokenVersion).toBe(1)
  })

  it('verifyToken devuelve null con token corrupto', async () => {
    const { verifyToken } = await import('../auth')
    const result = verifyToken('token.invalido.corrupto')
    expect(result).toBeNull()
  })

  it('importar auth.ts sin JWT_SECRET lanza error (fail fast)', async () => {
    vi.resetModules()
    delete process.env.JWT_SECRET
    await expect(import('../auth')).rejects.toThrow(
      'JWT_SECRET inválido'
    )
  })

  it('importar auth.ts con JWT_SECRET placeholder lanza error (fail fast)', async () => {
    vi.resetModules()
    process.env.JWT_SECRET = 'CAMBIAR_EN_PROD_MIN_32_CHARS'
    await expect(import('../auth')).rejects.toThrow(
      'JWT_SECRET inválido'
    )
  })

  it('importar auth.ts con JWT_SECRET vacío lanza error (fail fast)', async () => {
    vi.resetModules()
    process.env.JWT_SECRET = ''
    await expect(import('../auth')).rejects.toThrow(
      'JWT_SECRET inválido'
    )
  })

  it('importar auth.ts con JWT_SECRET menor a 32 chars lanza error (fail fast)', async () => {
    vi.resetModules()
    process.env.JWT_SECRET = 'corto'
    await expect(import('../auth')).rejects.toThrow(
      'JWT_SECRET inválido'
    )
  })
})
