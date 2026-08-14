'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, History, KeyRound, LogOut, Menu, X, UserCircle } from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

const links = [
  { href: '/pasante/marcar', label: 'Marcar Asistencia', icon: Clock },
  { href: '/pasante/historial', label: 'Mi Historial', icon: History },
  { href: '/pasante/cambiar-contrasena', label: 'Cambiar contraseña', icon: KeyRound },
]

export default function SidebarPasante({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
        <SidebarContent pathname={pathname} userName={userName} onClose={() => {}} />
      </aside>

      <MobileMenu pathname={pathname} userName={userName} />
    </>
  )
}

function SidebarContent({
  pathname,
  userName,
  onClose,
}: {
  pathname: string
  userName: string
  onClose: () => void
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
        <UserCircle className="h-6 w-6 text-emerald-400" />
        <div>
          <p className="text-sm font-bold text-white">Control de Asistencia</p>
          <p className="text-xs text-slate-400">Portal del Pasante</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="mb-2 px-3 text-sm font-medium text-white">{userName}</p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  )
}

function MobileMenu({
  pathname,
  userName,
}: {
  pathname: string
  userName: string
}) {
  return (
    <div className="lg:hidden">
      <details className="group relative">
        <summary className="flex h-14 cursor-pointer list-none items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-white">
          <span className="flex items-center gap-2 font-semibold">
            <UserCircle className="h-5 w-5 text-emerald-400" />
            Control de Asistencia
          </span>
          <Menu className="h-5 w-5 transition group-open:hidden" />
          <X className="hidden h-5 w-5 transition group-open:block" />
        </summary>
        <div className="absolute inset-x-0 top-14 z-50 border-b border-slate-800 bg-slate-900 px-4 pb-4 shadow-xl">
          <SidebarContent pathname={pathname} userName={userName} onClose={() => {}} />
        </div>
      </details>
    </div>
  )
}
