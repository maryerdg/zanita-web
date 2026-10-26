import { createClient } from '@/app/actions/supabase-server'
import { redirect } from 'next/navigation'
import AdminNav from './AdminNav'
import { AdminOrdersRealtimeProvider } from './AdminOrdersRealtime'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/iniciar-sesion')
  }

  // Server-side authorization check
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin') {
    redirect('/mi-cuenta')
  }

  return (
    <AdminOrdersRealtimeProvider>
      <div className="min-h-[calc(100vh-64px)] bg-[#FAF7F2] text-[#261C19] flex flex-col md:flex-row font-sans">
        <AdminNav userEmail={user.email || 'Admin'} />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </AdminOrdersRealtimeProvider>
  )
}
