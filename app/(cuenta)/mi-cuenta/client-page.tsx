'use client'

import { signOut, updateProfile } from '@/app/actions/auth'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

type ProfileData = {
  email?: string;
  full_name?: string;
  phone?: string;
  [key: string]: unknown;
}

function SubmitProfileButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto px-6 py-2.5 bg-[#A73832] text-white rounded-md text-sm font-medium hover:bg-[#8e2e28] transition-colors disabled:opacity-50"
    >
      {pending ? 'Guardando...' : 'Guardar Cambios'}
    </button>
  )
}

export default function MiCuentaClient({ profile }: { profile: ProfileData }) {
  const [, signOutAction] = useActionState(signOut as unknown as (prevState: unknown, formData: FormData) => Promise<unknown>, null)
  const [profileState, profileAction] = useActionState(updateProfile, null)
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders')

  return (
    <div className="min-h-screen bg-[#FFFBF8] pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-12 gap-8">

        {/* Sidebar / Menu */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8DCC4]/30">
            <h1 className="text-2xl font-serif text-[#6E564F] mb-1">Mi Cuenta</h1>
            <p className="text-sm text-[#261C19] opacity-70 mb-6">{profile?.email}</p>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'orders' ? 'bg-[#F4E9D8] text-[#261C19]' : 'hover:bg-[#F4E9D8]/50 text-[#6E564F]'}`}
              >
                Historial de Pedidos
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'profile' ? 'bg-[#F4E9D8] text-[#261C19]' : 'hover:bg-[#F4E9D8]/50 text-[#6E564F]'}`}
              >
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
            {activeTab === 'orders' && (
              <>
                <h2 className="text-xl font-medium text-[#261C19] mb-6">Mis Pedidos</h2>
                <div className="text-center py-12">
                  <p className="text-[#6E564F]">Aún no tienes pedidos registrados.</p>
                </div>
              </>
            )}

            {activeTab === 'profile' && (
              <>
                <h2 className="text-xl font-medium text-[#261C19] mb-6">Mis Datos</h2>

                {profileState?.success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">{profileState.success}</p>
                  </div>
                )}
                {profileState?.error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-[#A73832]">{profileState.error}</p>
                  </div>
                )}

                <form action={profileAction} className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-xs text-[#6E564F] mb-1">Nombre completo</label>
                    <input
                      name="full_name"
                      type="text"
                      defaultValue={profile?.full_name || ''}
                      required
                      className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6E564F] mb-1">Teléfono</label>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={profile?.phone || ''}
                      required
                      className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6E564F] mb-1">Correo electrónico</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={profile?.email || ''}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 border border-[#E4D5C1] bg-gray-50 opacity-70 rounded-md text-sm text-[#261C19] cursor-not-allowed"
                    />
                  </div>
                  <div className="pt-2">
                    <SubmitProfileButton />
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
