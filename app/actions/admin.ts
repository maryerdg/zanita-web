'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'

export async function toggleCetysPickup(userId: string, enabled: boolean) {
  const supabase = await createClient()

  // 1. Verify caller identity
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { error: 'No autorizado' }
  }

  // 2. Server-side role authorization
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return { error: 'Permisos insuficientes' }
  }

  // 3. Verify target user is a customer
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!targetProfile || targetProfile.role !== 'customer') {
    return { error: 'Solo se pueden modificar permisos de clientes' }
  }

  // 4. Perform the update
  const { error } = await supabase
    .from('profiles')
    .update({ cetys_pickup_enabled: enabled })
    .eq('id', userId)

  if (error) {
    console.error('Error toggling pickup:', error)
    return { error: 'Error interno al actualizar el permiso' }
  }

  revalidatePath('/admin')
  return { success: true }
}
