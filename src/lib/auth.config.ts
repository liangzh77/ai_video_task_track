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
      const isGalleryPage = nextUrl.pathname.startsWith('/gallery')
      const isPublicRoute = nextUrl.pathname === '/'

      // Helper function to create redirect URL
      const createRedirectUrl = (path: string) => {
        const url = new URL(path, nextUrl.origin)
        return Response.redirect(url)
      }

      if (isAuthPage) {
        if (isLoggedIn) {
          return createRedirectUrl(isAdmin ? '/admin' : '/dashboard')
        }
        return true
      }

      if (!isLoggedIn && (isAdminPage || isDashboardPage || isGalleryPage)) {
        const loginUrl = new URL('/login', nextUrl.origin)
        loginUrl.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search)
        return Response.redirect(loginUrl)
      }

      if (isAdminPage && !isAdmin) {
        return createRedirectUrl('/dashboard')
      }

      if ((isDashboardPage || isGalleryPage) && isAdmin) {
        return createRedirectUrl('/admin')
      }

      if (isPublicRoute && isLoggedIn) {
        return createRedirectUrl(isAdmin ? '/admin' : '/dashboard')
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
        token.canViewGallery = user.canViewGallery
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
        session.user.canViewGallery = token.canViewGallery as boolean
      }
      return session
    },
  },
  providers: [],
  session: {
    strategy: 'jwt',
  },
}
