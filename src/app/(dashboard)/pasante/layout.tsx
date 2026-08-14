import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth'
import SidebarPasante from '@/components/pasante/SidebarPasante'

export default async function PasanteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PASANTE') redirect('/admin/dashboard')

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarPasante userName={user.name} />
      <main className="p-4 pt-4 sm:p-6 lg:ml-64 lg:mt-16">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
