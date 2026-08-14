'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, LogIn } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { LoginResponse } from '@/types'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = (await res.json()) as LoginResponse & { error?: string }

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      if (data.mustChangePassword) {
        router.push('/login/cambiar-contrasena')
        return
      }

      router.push(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/pasante/marcar')
      router.refresh()
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-slate-900 px-8 py-10 text-white">
        <h1 className="text-2xl font-bold">Control de Asistencia</h1>
        <p className="mt-1 text-sm text-slate-300">Inicia sesión para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-8 py-8">
        <Input
          label="Email"
          name="email"
          type="email"
          icon={Mail}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@empresa.com"
        />

        <Input
          label="Contraseña"
          name="password"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Ingresando...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </>
          )}
        </button>
      </form>
    </div>
  )
}
