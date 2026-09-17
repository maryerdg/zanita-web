import { createClient } from '@/app/actions/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './client-page'

export default async function AdminPanel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/iniciar-sesion')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/mi-cuenta')

  const { data: reqs } = await supabase
    .from('cetys_access_requests')
    .select('*, profiles!cetys_access_requests_user_id_fkey(full_name, phone, email)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  return <AdminClient initialRequests={reqs || []} />
}
