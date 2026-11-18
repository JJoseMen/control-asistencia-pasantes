import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ORIGINAL_SECRET = process.env.JWT_SECRET

function setSecret(secret: string | undefined) {
  if (secret === undefined) {
    delete process.env.JWT_SECRET
  } else {
    process.env.JWT_SECRET = secret
  }
}

const VALID_SECRET = 'test-secret-min-32-chars-for-testing'

const mockFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}))

beforeEach(() => {
  vi.resetModules()
  setSecret(VALID_SECRET)
  mockFindUnique.mockReset()
})

afterEach(() => {
  setSecret(ORIGINAL_SECRET)
  vi.restoreAllMocks()
})

describe('auth session validation (tokenVersion + soft-delete)', () => {
  it('token válido + tokenVersion coincide → sesión OK', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'PASANTE',
      tokenVersion: 1,
      active: true,
      deletedAt: null,
    })

    const { signToken, verifyTokenAndSession } = await import('../auth')
    const token = signToken({
      id: 'user-1',
      email: 'test@test.com',
      role: 'PASANTE',
      tokenVersion: 1,
    })
    const session = await verifyTokenAndSession(token)
    expect(session).not.toBeNull()
    expect(session?.sub).toBe('user-1')
    expect(session?.tokenVersion).toBe(1)
  })

  it('token válido + tokenVersion distinto → null (revocado)', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'PASANTE',
      tokenVersion: 2,
      active: true,
      deletedAt: null,
    })

    const { signToken, verifyTokenAndSession } = await import('../auth')
    const token = signToken({
      id: 'user-1',
      email: 'test@test.com',
      role: 'PASANTE',
      tokenVersion: 1,
    })
    const session = await verifyTokenAndSession(token)
    expect(session).toBeNull()
  })

  it('token válido + user.active === false → null', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'PASANTE',
      tokenVersion: 1,
      active: false,
      deletedAt: null,
    })

    const { signToken, verifyTokenAndSession } = await import('../auth')
    const token = signToken({
      id: 'user-1',
      email: 'test@test.com',
      role: 'PASANTE',
      tokenVersion: 1,
    })
    const session = await verifyTokenAndSession(token)
    expect(session).toBeNull()
  })

  it('token válido + user.deletedAt !== null → null (soft delete)', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'PASANTE',
      tokenVersion: 1,
      active: true,
      deletedAt: new Date(),
    })

    const { signToken, verifyTokenAndSession } = await import('../auth')
    const token = signToken({
      id: 'user-1',
      email: 'test@test.com',
      role: 'PASANTE',
      tokenVersion: 1,
    })
    const session = await verifyTokenAndSession(token)
    expect(session).toBeNull()
  })

  it('token válido + user no existe en BD → null', async () => {
    mockFindUnique.mockResolvedValue(null)

    const { signToken, verifyTokenAndSession } = await import('../auth')
    const token = signToken({
      id: 'user-999',
      email: 'nonexistent@test.com',
      role: 'PASANTE',
      tokenVersion: 1,
    })
    const session = await verifyTokenAndSession(token)
    expect(session).toBeNull()
  })
})
