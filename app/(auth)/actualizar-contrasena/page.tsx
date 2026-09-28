'use client'
import { updatePassword } from '@/app/actions/auth'
import { useActionState } from 'react'

export default function UpdatePassword() {
  const [state, formAction] = useActionState(updatePassword, null)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2] p-4">
      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1]/70 shadow-sm">
        <h1 className="text-2xl font-serif text-[#261C19] text-center mb-6">Nueva contraseña</h1>
        {state?.error && <p className="text-sm text-[#A73832] mb-4 text-center">{state.error}</p>}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Nueva contraseña</label>
            <input name="password" type="password" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Confirmar nueva contraseña</label>
            <input name="confirmPassword" type="password" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#A73832] text-white rounded-md text-sm font-medium hover:bg-[#8e2e28] transition-colors">
            Actualizar contraseña
          </button>
        </form>
      </div>
    </div>
  )
}
