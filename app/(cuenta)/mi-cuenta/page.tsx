import { createClient } from '@/app/actions/supabase-server'
import { redirect } from 'next/navigation'
import MiCuentaClient from './client-page'

export default async function MyAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/iniciar-sesion')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: request } = await supabase.from('cetys_access_requests').select('*').eq('user_id', user.id).order('requested_at', { ascending: false }).limit(1).maybeSingle()

  return <MiCuentaClient user={user} profile={profile} request={request} />
}
