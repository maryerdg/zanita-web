'use client'
import { signIn } from '@/app/actions/auth'
import Link from 'next/link'
import { useActionState } from 'react'

export default function Login() {
  const [state, formAction] = useActionState(signIn, null)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2] p-4">
      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1]/70 shadow-sm">
        <h1 className="text-2xl font-serif text-[#261C19] text-center mb-6">Iniciar sesión</h1>
        {state?.error && <p className="text-sm text-[#A73832] mb-4 text-center">{state.error}</p>}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Correo electrónico</label>
            <input name="email" type="email" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Contraseña</label>
            <input name="password" type="password" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#A73832] text-white rounded-md text-sm font-medium hover:bg-[#8e2e28] transition-colors">
            Entrar
          </button>
        </form>
        <div className="mt-4 text-center space-y-2">
          <Link href="/recuperar-contrasena" className="block text-xs text-[#D46240] hover:underline">¿Olvidaste tu contraseña?</Link>
          <Link href="/registro" className="block text-xs text-[#6E564F] hover:underline">¿No tienes cuenta? Regístrate</Link>
        </div>
      </div>
    </div>
  )
}
