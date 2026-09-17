'use server'

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error?: string; success?: string } | null;

export async function signUp(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string

  if (!email || !password || !confirmPassword || !full_name || !phone) {
    return { error: 'Todos los campos son obligatorios' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden' }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { error: 'Las cuentas aún no están disponibles en este preview.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/mi-cuenta')
  } else {
    return { success: 'Revisa tu correo para confirmar tu cuenta' }
  }
}

export async function signIn(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Correo y contraseña obligatorios' }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { error: 'Las cuentas aún no están disponibles en este preview.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Credenciales inválidas' }
  }

  revalidatePath('/', 'layout')
  redirect('/mi-cuenta')
}

export async function signOut(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/iniciar-sesion')
}

export async function resetPasswordForEmail(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string
  if (!email) return { error: 'Correo obligatorio' }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { error: 'Las cuentas aún no están disponibles en este preview.' }
  }

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/actualizar-contrasena`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Si el correo está registrado, recibirás un enlace de recuperación.' }
}

export async function updatePassword(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) return { error: 'Campos obligatorios' }
  if (password !== confirmPassword) return { error: 'No coinciden' }
  if (password.length < 6) return { error: 'Mínimo 6 caracteres' }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión inválida' }

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/mi-cuenta')
}

export async function updateProfile(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string

  if (!full_name || !phone) return { error: 'Nombre y teléfono son obligatorios' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, phone })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/mi-cuenta')
  return { success: 'Perfil actualizado correctamente' }
}
