import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

function redirectTo(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''
  return NextResponse.redirect(url)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = getSessionFromRequest(request)
  const isLoggedIn = Boolean(session)

  const isLoginPage = pathname === '/login'
  const isChangePasswordPage = pathname === '/login/cambiar-contrasena'
  const isHomePage = pathname === '/'
  const isAdminRoute = pathname.startsWith('/admin')
  const isPasanteRoute = pathname.startsWith('/pasante')

  if (isChangePasswordPage) {
    if (!isLoggedIn) return redirectTo(request, '/login')
    return NextResponse.next()
  }

  if (isLoginPage) {
    if (isLoggedIn) {
      return redirectTo(request, session!.role === 'ADMIN' ? '/admin/dashboard' : '/pasante/marcar')
    }
    return NextResponse.next()
  }

  if (isHomePage) {
    return redirectTo(request, isLoggedIn ? (session!.role === 'ADMIN' ? '/admin/dashboard' : '/pasante/marcar') : '/login')
  }

  if (!isLoggedIn) {
    return redirectTo(request, '/login')
  }

  if (isAdminRoute && session!.role !== 'ADMIN') {
    return redirectTo(request, '/pasante/marcar')
  }

  if (isPasanteRoute && session!.role !== 'PASANTE') {
    return redirectTo(request, '/admin/dashboard')
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
