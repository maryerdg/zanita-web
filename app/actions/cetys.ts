'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'
import { ActionState } from './auth'

export async function requestCetysAccess(_prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('cetys_access_requests')
    .insert({ user_id: user.id })
  
  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya tienes una solicitud pendiente' }
    }
    return { error: 'Ocurrió un error al enviar tu solicitud' }
  }

  revalidatePath('/mi-cuenta')
  return { success: 'Solicitud enviada' }
}

export async function updateCetysRequestStatus(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Fast check: Ensure user is admin using DB logic
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return { error: 'Permisos insuficientes' }
  }

  const requestId = formData.get('request_id') as string
  const status = formData.get('status') as string

  if (!requestId || (status !== 'approved' && status !== 'rejected')) {
    return { error: 'Datos inválidos' }
  }

  const { error } = await supabase
    .from('cetys_access_requests')
    .update({ status })
    .eq('id', requestId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: 'Solicitud actualizada' }
}
