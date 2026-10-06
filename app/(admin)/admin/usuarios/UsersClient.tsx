'use client'

import React, { useState, useTransition } from 'react'
import {
  toggleCetysPickup,
  getCustomersList,
  type CustomerProfileRow,
} from '@/app/actions/admin'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react'

interface Props {
  initialCustomers: CustomerProfileRow[]
}

export default function UsersClient({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<CustomerProfileRow[]>(initialCustomers)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4500)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await getCustomersList(searchQuery)
      if (res.error) {
        showNotification('error', res.error)
      } else {
        setCustomers(res.customers || [])
      }
    })
  }

  const handleToggleCetys = (userId: string, currentStatus: boolean) => {
    setLoadingId(userId)
    const nextStatus = !currentStatus

    startTransition(async () => {
      const res = await toggleCetysPickup(userId, nextStatus)
      setLoadingId(null)

      if (res.error) {
        showNotification('error', res.error)
      } else {
        showNotification('success', res.message || 'Permiso actualizado')
        setCustomers((prev) =>
          prev.map((c) => (c.id === userId ? { ...c, cetys_pickup_enabled: nextStatus } : c))
        )
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl shadow-lg border text-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#261C19]">
          Directorio de Clientes
        </h1>
        <p className="text-sm text-[#6E564F] mt-1">
          Busca clientes registrados y administra su autorización para entregas especiales en CETYS Universidad.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] p-4 shadow-xs">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E564F]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo electrónico o teléfono..."
              aria-label="Buscar cliente"
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E8DCC4] rounded-xl text-xs sm:text-sm text-[#261C19] placeholder-[#6E564F]/60 focus:outline-none focus:ring-1 focus:ring-[#A73832]"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#261C19] text-white hover:bg-[#A73832] transition-colors shadow-xs"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Customers Table / Cards */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-xs overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6E564F]">
            No se encontraron clientes con el criterio de búsqueda.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DCC4] text-[#6E564F]">
                    <th className="py-3 px-5 font-semibold">Cliente</th>
                    <th className="py-3 px-5 font-semibold">Contacto</th>
                    <th className="py-3 px-5 font-semibold">Registro</th>
                    <th className="py-3 px-5 font-semibold text-right">Permiso Pickup CETYS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {customers.map((customer) => {
                    const regDate = customer.created_at
                      ? new Date(customer.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A'

                    return (
                      <tr key={customer.id} className="hover:bg-[#FAF7F2]/40">
                        <td className="py-4 px-5">
                          <p className="font-semibold text-sm text-[#261C19]">
                            {customer.full_name || 'Sin nombre registrado'}
                          </p>
                          <p className="text-[10px] text-[#6E564F]/60 font-mono">
                            ID: {customer.id.slice(0, 8)}...
                          </p>
                        </td>

                        <td className="py-4 px-5 space-y-1">
                          <div className="flex items-center text-[#261C19]">
                            <Mail className="w-3.5 h-3.5 mr-1.5 text-[#6E564F]" />
                            <span>{customer.email || 'Sin correo'}</span>
                          </div>
                          {customer.phone && (
                            <div className="flex items-center text-[#6E564F]">
                              <Phone className="w-3.5 h-3.5 mr-1.5" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-5 text-[#6E564F]">
                          <div className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#6E564F]/60" />
                            <span>{regDate}</span>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center space-x-2">
                            <span
                              className={`text-[11px] font-semibold ${
                                customer.cetys_pickup_enabled ? 'text-emerald-700' : 'text-[#6E564F]'
                              }`}
                            >
                              {customer.cetys_pickup_enabled ? 'Autorizado' : 'Sin acceso'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleCetys(customer.id, customer.cetys_pickup_enabled)}
                              disabled={isPending && loadingId === customer.id}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                customer.cetys_pickup_enabled ? 'bg-emerald-600' : 'bg-[#E8DCC4]'
                              } ${isPending && loadingId === customer.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              aria-label={`Alternar permiso CETYS para ${customer.full_name || customer.email}`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  customer.cetys_pickup_enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-[#F2ECE1]">
              {customers.map((customer) => {
                const regDate = customer.created_at
                  ? new Date(customer.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A'

                return (
                  <div key={customer.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-[#261C19]">
                          {customer.full_name || 'Sin nombre registrado'}
                        </p>
                        <p className="text-[10px] text-[#6E564F]/60 font-mono">
                          ID: {customer.id.slice(0, 8)}...
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          customer.cetys_pickup_enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-[#F5EBDC] text-[#6E564F] border border-[#E8DCC4]'
                        }`}
                      >
                        {customer.cetys_pickup_enabled ? 'CETYS Activo' : 'Sin CETYS'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#6E564F]">
                      <div className="flex items-center text-[#261C19] break-all">
                        <Mail className="w-3.5 h-3.5 mr-1.5 shrink-0 text-[#6E564F]" />
                        <span>{customer.email || 'Sin correo'}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center text-[#6E564F]">
                          <Phone className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center text-[#6E564F]/70 text-[11px]">
                        <Calendar className="w-3 h-3 mr-1.5 shrink-0" />
                        <span>Registro: {regDate}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#F2ECE1] flex items-center justify-between">
                      <span className="text-xs font-medium text-[#261C19]">
                        Acceso Pickup CETYS
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleCetys(customer.id, customer.cetys_pickup_enabled)}
                        disabled={isPending && loadingId === customer.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          customer.cetys_pickup_enabled ? 'bg-emerald-600' : 'bg-[#E8DCC4]'
                        } ${isPending && loadingId === customer.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label={`Alternar permiso CETYS para ${customer.full_name || customer.email}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            customer.cetys_pickup_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
