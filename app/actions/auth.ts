
'use server'
import { getSiteUrl } from "@/lib/utils/url"

import { createClient } from './supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error?: string; success?: string; email?: string } | null;

export async function signUp(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const legal_acceptance = formData.get('legal_acceptance')

  if (!email || !password || !confirmPassword || !full_name || !phone) {
    return { error: 'Todos los campos son obligatorios' }
  }

  if (!legal_acceptance) {
    return { error: 'Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para crear tu cuenta.' }
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
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/mi-cuenta`,
      data: {
        full_name,
        phone,
      },
    },
  })

  if (error) {
    if (error.message.includes('rate limit')) {
      return { error: 'Demasiados intentos. Por favor intenta de nuevo más tarde.' }
    }
    return { error: error.message }
  }

  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/mi-cuenta')
  } else {
    return { success: 'Revisa tu correo para confirmar tu cuenta', email }
  }
}

export async function resendConfirmation(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Falta el correo electrónico' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/mi-cuenta`,
    }
  })

  if (error && error.message.includes('rate limit')) {
    return { error: 'Espera un momento antes de solicitar otro correo.', email }
  }

  // Generic success to prevent enumeration, passing back the email so the UI keeps it
  return { success: 'Te enviamos un nuevo correo de confirmación. Revisa tu bandeja de entrada.', email }
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
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Confirma tu correo electrónico antes de iniciar sesión.', email }
    }
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Correo o contraseña incorrectos.' }
    }
    if (error.message.includes('rate limit')) {
      return { error: 'Demasiados intentos. Por favor intenta de nuevo más tarde.' }
    }
    return { error: 'Correo o contraseña incorrectos.' }
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


  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/actualizar-contrasena`,
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
