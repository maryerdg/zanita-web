'use client'
import { signOut, updateProfile } from '@/app/actions/auth'
import { requestCetysAccess } from '@/app/actions/cetys'
import { useActionState } from 'react'

export default function MiCuentaClient({ user, profile, request }: { user: import("@supabase/supabase-js").User, profile: import("@/lib/types").Profile, request: import("@/lib/types").CetysAccessRequest | null }) {
  const [, signOutAction] = useActionState(signOut as unknown as (prevState: unknown, formData: FormData) => Promise<unknown>, null)
  const [profileState, profileAction] = useActionState(updateProfile, null)
  const [cetysState, cetysAction] = useActionState(requestCetysAccess, null)

  return (
    <div className="min-h-screen bg-[#FFF9F2] p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1]/70 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-serif text-[#261C19]">Mi cuenta</h1>
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-[#A73832] font-medium hover:underline">Cerrar sesión</button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="bg-[#FFF9F2] p-4 rounded-xl border border-[#E4D5C1]/50">
            <h2 className="text-sm font-bold text-[#6E564F] uppercase tracking-wider mb-4">Datos personales</h2>
            {profileState?.error && <p className="text-sm text-[#A73832] mb-2">{profileState.error}</p>}
            {profileState?.success && <p className="text-sm text-[#2A5A2A] mb-2">{profileState.success}</p>}
            
            <form action={profileAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#8A716A] mb-1">Nombre</label>
                <input name="full_name" defaultValue={profile?.full_name} className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
              </div>
              <div>
                <label className="block text-xs text-[#8A716A] mb-1">Correo (Solo lectura)</label>
                <input readOnly value={profile?.email} className="w-full px-3 py-2 bg-gray-50 border border-[#E4D5C1] rounded-md text-sm text-[#8A716A] cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs text-[#8A716A] mb-1">Teléfono</label>
                <input name="phone" defaultValue={profile?.phone} className="w-full px-3 py-2 border border-[#E4D5C1] rounded-md text-sm text-[#261C19]" />
              </div>
              <div>
                <label className="block text-xs text-[#8A716A] mb-1">Nivel de cuenta</label>
                <input readOnly value={profile?.role} className="w-full px-3 py-2 bg-gray-50 border border-[#E4D5C1] rounded-md text-sm text-[#8A716A] capitalize cursor-not-allowed" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-[#261C19] text-white rounded-md text-sm font-medium hover:bg-[#1a1210] transition-colors">
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>

          {profile?.role !== 'admin' && (
            <section className="bg-[#FFF9F2] p-4 rounded-xl border border-[#E4D5C1]/50">
              <h2 className="text-sm font-bold text-[#6E564F] uppercase tracking-wider mb-4">Acceso CETYS</h2>
              {cetysState?.error && <p className="text-sm text-[#A73832] mb-2">{cetysState.error}</p>}
              {cetysState?.success && <p className="text-sm text-[#2A5A2A] mb-2">{cetysState.success}</p>}

              {profile?.role === 'cetys' ? (
                <div className="bg-[#EAF3EA] text-[#2A5A2A] p-3 rounded-md text-sm">
                  ✅ Tienes acceso CETYS aprobado. Puedes elegir Pickup en CETYS al finalizar tu pedido.
                </div>
              ) : request?.status === 'pending' ? (
                <div className="bg-[#FEF5E7] text-[#9A6700] p-3 rounded-md text-sm">
                  ⏳ Tu solicitud para acceso CETYS está en revisión.
                </div>
              ) : request?.status === 'rejected' ? (
                <div className="bg-[#FCE8E8] text-[#A73832] p-3 rounded-md text-sm mb-4">
                  ❌ Tu solicitud anterior fue rechazada. Puedes intentar de nuevo.
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[#6E564F] mb-4">
                    Si eres estudiante o personal de CETYS, solicita acceso para habilitar el punto de entrega en campus.
                  </p>
                  <form action={cetysAction}>
                    <button type="submit" data-testid="btn-request-cetys" className="px-4 py-2 bg-[#261C19] text-white rounded-md text-sm font-medium hover:bg-[#1a1210] transition-colors">
                      Solicitar acceso CETYS
                    </button>
                  </form>
                </div>
              )}
              {request?.status === 'rejected' && profile?.role !== 'cetys' && (
                <form action={cetysAction}>
                  <button type="submit" data-testid="btn-request-cetys" className="px-4 py-2 bg-[#261C19] text-white rounded-md text-sm font-medium hover:bg-[#1a1210] transition-colors">
                    Solicitar acceso CETYS
                  </button>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
