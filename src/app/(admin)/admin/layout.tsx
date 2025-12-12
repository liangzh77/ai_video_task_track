import { SessionProvider } from '@/components/providers/session-provider'
import { Header } from '@/components/ui/header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </SessionProvider>
  )
}
