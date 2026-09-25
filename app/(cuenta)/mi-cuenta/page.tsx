import { createClient } from '@/app/actions/supabase-server'
import { redirect } from 'next/navigation'
import MiCuentaClient from './client-page'

export default async function MiCuentaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/iniciar-sesion')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <MiCuentaClient profile={profile} />
}
