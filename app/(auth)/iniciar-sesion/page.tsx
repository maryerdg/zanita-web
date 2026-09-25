'use client'
import { signIn, resendConfirmation } from '@/app/actions/auth'
import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

function ResendButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full py-2 bg-transparent text-[#6E564F] rounded-md text-sm font-medium hover:bg-[#F5EBDC] transition-colors border border-[#E4D5C1]"
    >
      {pending ? 'Enviando...' : 'Reenviar correo de confirmación'}
    </button>
  )
}

export default function Login() {
  const [state, formAction] = useActionState(signIn, null)
  const [resendState, resendAction] = useActionState(resendConfirmation, null)

  const isUnconfirmedError = state?.error === 'Confirma tu correo electrónico antes de iniciar sesión.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2] p-4">
      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1]/70 shadow-sm">
        <h1 className="text-2xl font-serif text-[#261C19] text-center mb-6">Iniciar sesión</h1>

        {state?.error && (
          <div className="mb-6 text-center">
            <p className="text-sm text-[#A73832]">{state.error}</p>
            {isUnconfirmedError && (
              <div className="mt-3">
                <p className="text-xs text-[#6E564F] mb-2">¿No recibiste el correo o ya expiró?</p>
                <form action={resendAction}>
                  <input type="hidden" name="email" value={state.email || ''} />
                  <ResendButton />
                </form>
                {resendState?.success && (
                  <p className="mt-2 text-xs text-green-700">{resendState.success}</p>
                )}
                {resendState?.error && (
                  <p className="mt-2 text-xs text-[#A73832]">{resendState.error}</p>
                )}
              </div>
            )}
          </div>
        )}

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
