'use client'
import { updateCetysRequestStatus } from '@/app/actions/cetys'
import { useActionState, useEffect, useState } from 'react'

export default function AdminClient({ initialRequests }: { initialRequests: import("@/lib/types").CetysAccessRequest[] }) {
  const [state, formAction] = useActionState(updateCetysRequestStatus, null)
  // In a real app we would re-fetch requests or use SWR. 
  // Here we just let Next.js revalidate the path on server action, which re-renders the server component.

  return (
    <div className="min-h-screen bg-[#FFF9F2] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif text-[#261C19] mb-8">Panel de Ximena</h1>
        
        <div className="bg-white p-6 rounded-2xl border border-[#E4D5C1]/70 shadow-sm">
          <h2 className="text-xl font-medium text-[#261C19] mb-6">Solicitudes CETYS Pendientes</h2>
          
          {state?.error && <p className="text-sm text-[#A73832] mb-4">{state.error}</p>}
          {state?.success && <p className="text-sm text-[#2A5A2A] mb-4">{state.success}</p>}

          {!initialRequests || initialRequests.length === 0 ? (
            <p className="text-[#8A716A] text-sm">No hay solicitudes pendientes en este momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E4D5C1] text-xs uppercase tracking-wider text-[#8A716A]">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Teléfono</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4D5C1]/50">
                  {initialRequests.map((req: import("@/lib/types").CetysAccessRequest) => (
                    <tr key={req.id} className="text-sm text-[#261C19]">
                      <td className="py-4 px-4 whitespace-nowrap">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 font-medium">{req.profiles?.full_name}</td>
                      <td className="py-4 px-4">{req.profiles?.email}</td>
                      <td className="py-4 px-4">{req.profiles?.phone}</td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2">
                          <form action={formAction}>
                            <input type="hidden" name="request_id" value={req.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button type="submit" data-testid="btn-reject" className="px-3 py-1.5 bg-[#FCE8E8] text-[#A73832] rounded hover:bg-[#F9D6D6] transition-colors font-medium">
                              Rechazar
                            </button>
                          </form>
                          <form action={formAction}>
                            <input type="hidden" name="request_id" value={req.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button type="submit" data-testid="btn-approve" className="px-3 py-1.5 bg-[#EAF3EA] text-[#2A5A2A] rounded hover:bg-[#D5E8D5] transition-colors font-medium">
                              Aprobar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
