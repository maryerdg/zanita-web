'use client'

import { signOut } from '@/app/actions/auth'
import { useActionState } from 'react'

type ProfileData = {
  email?: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MiCuentaClient({ user, profile }: { user: unknown, profile: ProfileData }) {
  const [, signOutAction] = useActionState(signOut as unknown as (prevState: unknown, formData: FormData) => Promise<unknown>, null)

  return (
    <div className="min-h-screen bg-[#FFFBF8] pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-12 gap-8">

        {/* Sidebar / Menu */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8DCC4]/30">
            <h1 className="text-2xl font-serif text-[#6E564F] mb-1">Mi Cuenta</h1>
            <p className="text-sm text-[#261C19] opacity-70 mb-6">{profile?.email}</p>

            <nav className="space-y-2">
              <button className="w-full text-left px-4 py-3 rounded-xl bg-[#F4E9D8] text-[#261C19] font-medium transition-colors">
                Historial de Pedidos
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#F4E9D8]/50 text-[#6E564F] transition-colors">
                Mis Datos
              </button>
            </nav>

            <form action={signOutAction} className="mt-8 pt-6 border-t border-[#E8DCC4]/30">
              <button type="submit" className="text-sm text-[#D95F52] font-medium hover:underline">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8DCC4]/30">
            <h2 className="text-xl font-medium text-[#261C19] mb-6">Mis Pedidos</h2>

            <div className="text-center py-12">
              <p className="text-[#6E564F]">Aún no tienes pedidos registrados.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
