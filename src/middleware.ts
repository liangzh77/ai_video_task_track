import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.role === 'ADMIN'

  const isAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
  const isAdminPage = nextUrl.pathname.startsWith('/admin')
  const isDashboardPage = nextUrl.pathname.startsWith('/dashboard')
  const isApiRoute = nextUrl.pathname.startsWith('/api')
  const isPublicRoute = nextUrl.pathname === '/'

  if (isApiRoute) {
    return NextResponse.next()
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', nextUrl))
      }
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn && (isAdminPage || isDashboardPage)) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isAdminPage && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (isDashboardPage && isAdmin) {
    return NextResponse.redirect(new URL('/admin', nextUrl))
  }

  if (isPublicRoute && isLoggedIn) {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin', nextUrl))
    }
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
