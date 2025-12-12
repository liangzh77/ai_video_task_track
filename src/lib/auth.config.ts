import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAdmin = auth?.user?.role === 'ADMIN'

      const isAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
      const isAdminPage = nextUrl.pathname.startsWith('/admin')
      const isDashboardPage = nextUrl.pathname.startsWith('/dashboard')
      const isPublicRoute = nextUrl.pathname === '/'

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(isAdmin ? '/admin' : '/dashboard', nextUrl))
        }
        return true
      }

      if (!isLoggedIn && (isAdminPage || isDashboardPage)) {
        return false // Redirect to login
      }

      if (isAdminPage && !isAdmin) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }

      if (isDashboardPage && isAdmin) {
        return Response.redirect(new URL('/admin', nextUrl))
      }

      if (isPublicRoute && isLoggedIn) {
        return Response.redirect(new URL(isAdmin ? '/admin' : '/dashboard', nextUrl))
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
        token.canCRUD = user.canCRUD
        token.canApprove = user.canApprove
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as string
        session.user.canCRUD = token.canCRUD as boolean
        session.user.canApprove = token.canApprove as boolean
      }
      return session
    },
  },
  providers: [], // Providers are added in auth.ts
  session: {
    strategy: 'jwt',
  },
}
