import { createClient } from '@/app/actions/supabase-server'
import { redirect } from 'next/navigation'
import AdminClientPage from './client-page'

export default async function AdminPage() {
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

  // Fetch all customers for admin dashboard
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading profiles:', error)
  }

  return (
    <div className="min-h-screen bg-[#FFFBF8] pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-serif text-[#6E564F] mb-8">Panel de Administración</h1>
        <AdminClientPage profiles={profiles || []} />
      </div>
    </div>
  )
}
