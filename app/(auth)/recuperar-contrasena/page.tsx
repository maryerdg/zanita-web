'use client'
import { resetPasswordForEmail } from '@/app/actions/auth'
import Link from 'next/link'
import { useActionState } from 'react'

export default function RecoverPassword() {
  const [state, formAction] = useActionState(resetPasswordForEmail, null)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2] p-4">
      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1]/70 shadow-sm">
        <h1 className="text-2xl font-serif text-[#261C19] text-center mb-6">Recuperar contraseña</h1>
        {state?.error && <p className="text-sm text-[#A73832] mb-4 text-center">{state.error}</p>}
        {state?.success && <p className="text-sm text-[#2A5A2A] mb-4 text-center">{state.success}</p>}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Correo electrónico</label>
            <input name="email" type="email" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#A73832] text-white rounded-md text-sm font-medium hover:bg-[#8e2e28] transition-colors">
            Enviar enlace
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/iniciar-sesion" className="text-xs text-[#6E564F] hover:underline">Volver a inicio de sesión</Link>
        </div>
      </div>
    </div>
  )
}
