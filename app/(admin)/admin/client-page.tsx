'use client'

import { useState, useTransition } from 'react'
import { toggleCetysPickup } from '@/app/actions/admin'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  cetys_pickup_enabled: boolean
  created_at: string
}

export default function AdminClientPage({ profiles }: { profiles: Profile[] }) {
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleToggle = (userId: string, currentStatus: boolean) => {
    setLoadingId(userId)
    startTransition(async () => {
      await toggleCetysPickup(userId, !currentStatus)
      setLoadingId(null)
    })
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8DCC4]/30">
      <h2 className="text-xl font-medium text-[#261C19] mb-6">Directorio de Clientes</h2>

      {profiles.length === 0 ? (
        <p className="text-[#6E564F]">No hay clientes registrados todavía.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8DCC4]">
                <th className="py-3 px-4 text-sm font-semibold text-[#6E564F]">Nombre</th>
                <th className="py-3 px-4 text-sm font-semibold text-[#6E564F]">Contacto</th>
                <th className="py-3 px-4 text-sm font-semibold text-[#6E564F]">Permiso Especial (Pickup)</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-[#E8DCC4]/30">
                  <td className="py-4 px-4">
                    <p className="font-medium text-[#261C19]">{profile.full_name || 'Sin nombre'}</p>
                    <p className="text-xs text-[#6E564F]/70">ID: {profile.id.slice(0,8)}...</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-[#261C19]">{profile.email}</p>
                    <p className="text-xs text-[#6E564F]">{profile.phone || 'Sin teléfono'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggle(profile.id, profile.cetys_pickup_enabled)}
                      disabled={isPending && loadingId === profile.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        profile.cetys_pickup_enabled ? 'bg-[#98B19C]' : 'bg-[#E8DCC4]'
                      } ${isPending && loadingId === profile.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="sr-only">Habilitar Pickup Especial</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          profile.cetys_pickup_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="ml-3 text-sm text-[#6E564F]">
                      {profile.cetys_pickup_enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
