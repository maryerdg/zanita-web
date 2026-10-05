import { createClient } from '@/app/actions/supabase-server'
import { redirect } from 'next/navigation'
import AdminNav from './AdminNav'

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
    <div className="min-h-screen bg-[#FAF7F2] text-[#261C19] flex flex-col font-sans">
      <AdminNav userEmail={user.email || 'Admin'} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
