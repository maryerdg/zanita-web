import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function redirectWithSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname

  const response = NextResponse.redirect(url)

  for (const cookie of sessionResponse.cookies.getAll()) {
    const { name, value, ...options } = cookie
    response.cookies.set(name, value, options)
  }

  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = sessionResponse.headers.get(header)
    if (value) response.headers.set(header, value)
  }

  return response
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )

          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Supabase's current SSR guidance recommends getClaims() in the proxy.
  // It validates the JWT and refreshes the cookie pair when necessary.
  const { data: claimsData } = await supabase.auth.getClaims()
  const userClaims = claimsData?.claims ?? null

  const isProtectedPath =
    request.nextUrl.pathname.startsWith('/mi-cuenta') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/actualizar-contrasena')

  const isAuthPath =
    request.nextUrl.pathname.startsWith('/iniciar-sesion') ||
    request.nextUrl.pathname.startsWith('/registro') ||
    request.nextUrl.pathname.startsWith('/recuperar-contrasena')

  if (!userClaims && isProtectedPath) {
    return redirectWithSession(request, supabaseResponse, '/iniciar-sesion')
  }

  if (userClaims && isAuthPath) {
    return redirectWithSession(request, supabaseResponse, '/mi-cuenta')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
