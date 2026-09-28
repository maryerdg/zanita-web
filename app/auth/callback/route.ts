import { getSiteUrl } from '@/lib/utils/url'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

const ALLOWED_NEXT_ROUTES = ['/mi-cuenta', '/actualizar-contrasena']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  let next = searchParams.get('next') ?? '/mi-cuenta'

  if (!ALLOWED_NEXT_ROUTES.includes(next)) {
    next = '/mi-cuenta'
  }

  if ((token_hash && type) || code) {
    const supabase = await createClient()

    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      })

      if (!error) {
        return NextResponse.redirect(`${getSiteUrl()}${next}`)
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        return NextResponse.redirect(`${getSiteUrl()}${next}`)
      }
    }
  }

  return NextResponse.redirect(
    `${getSiteUrl()}/iniciar-sesion?error=Enlace+inválido+o+expirado`
  )
}
