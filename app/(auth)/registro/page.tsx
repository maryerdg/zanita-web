'use client'
import { signUp, resendConfirmation } from '@/app/actions/auth'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { POLICIES, Policy } from '@/data/policies'
import { useFormStatus } from 'react-dom'

function ResendButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="block w-full py-2 bg-transparent text-[#6E564F] rounded-md text-sm font-medium hover:bg-[#F5EBDC] transition-colors border border-[#E4D5C1]"
    >
      {pending ? 'Enviando...' : 'Reenviar correo'}
    </button>
  )
}

export default function Register() {
  const [state, formAction] = useActionState(signUp, null)
  const [resendState, resendAction] = useActionState(resendConfirmation, null)
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null)

  const isSuccess = state?.success || resendState?.success
  const currentEmail = state?.email || resendState?.email

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2] p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl border border-[#E4D5C1]/70 shadow-sm text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#F5EBDC] mb-4">
            <svg className="h-6 w-6 text-[#A73832]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-[#261C19] mb-2">Revisa tu correo</h1>

          <p className="text-sm text-[#6E564F] mb-4">
            {resendState?.success ? (
              resendState.success
            ) : (
              <>Te enviamos un enlace de confirmación a <span className="font-semibold">{currentEmail}</span>. Después de confirmar tu correo podrás iniciar sesión.</>
            )}
          </p>

          {resendState?.error && (
            <p className="text-sm text-[#A73832] mb-4">{resendState.error}</p>
          )}

          <div className="space-y-3">
            <Link
              href="/iniciar-sesion"
              className="block w-full py-2.5 bg-[#A73832] text-white rounded-md text-sm font-medium hover:bg-[#8e2e28] transition-colors"
            >
              Ir a iniciar sesión
            </Link>

            <form action={resendAction}>
              <input type="hidden" name="email" value={currentEmail || ''} />
              <ResendButton />
            </form>

            <Link
              href="/"
              className="block w-full py-2.5 bg-[#F5EBDC] text-[#A73832] rounded-md text-sm font-medium hover:bg-[#E4D5C1] transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2] p-4">
      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1]/70 shadow-sm">
        <h1 className="text-2xl font-serif text-[#261C19] text-center mb-6">Crear cuenta</h1>
        {state?.error && <p className="text-sm text-[#A73832] mb-4 text-center">{state.error}</p>}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Nombre completo</label>
            <input name="full_name" type="text" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Teléfono</label>
            <input name="phone" type="tel" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Correo electrónico</label>
            <input name="email" type="email" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Contraseña</label>
            <input name="password" type="password" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <div>
            <label className="block text-xs text-[#6E564F] mb-1">Confirmar contraseña</label>
            <input name="confirmPassword" type="password" required className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
          </div>
          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              name="legal_acceptance"
              id="legal_acceptance"
              required
              className="mt-1 h-4 w-4 rounded border-[#E4D5C1] text-[#A73832] focus:ring-[#A73832]"
            />
            <label htmlFor="legal_acceptance" className="text-xs text-[#6E564F] leading-tight">
              He leído y acepto los{' '}
              <button type="button" onClick={() => setActivePolicy(POLICIES.terminos)} className="text-[#A73832] hover:underline focus:outline-none focus:underline">
                Términos y Condiciones
              </button>{' '}
              y el{' '}
              <button type="button" onClick={() => setActivePolicy(POLICIES.privacidad)} className="text-[#A73832] hover:underline focus:outline-none focus:underline">
                Aviso de Privacidad
              </button>.
            </label>
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#A73832] text-white rounded-md text-sm font-medium hover:bg-[#8e2e28] transition-colors">
            Registrarme
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/iniciar-sesion" className="text-xs text-[#6E564F] hover:underline">¿Ya tienes cuenta? Inicia sesión</Link>
        </div>
      </div>

      {activePolicy && (
        <Modal
          isOpen={!!activePolicy}
          onClose={() => setActivePolicy(null)}
          title={activePolicy.title}
        >
          <div className="space-y-4 text-[#261C19]">
            <p className="text-xs text-[#6E564F] italic">Estado: {activePolicy.lastUpdated}</p>
            <p className="font-semibold text-sm">{activePolicy.summary}</p>
            {activePolicy.sections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <h3 className="font-serif font-bold text-[#A73832] text-base">{section.title}</h3>
                <p className="text-xs sm:text-sm text-[#6E564F] leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
