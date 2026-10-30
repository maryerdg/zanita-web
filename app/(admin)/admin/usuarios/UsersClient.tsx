'use client'

import React, { useMemo, useState, useTransition } from 'react'
import {
  toggleCetysPickup,
  type AdminUserProfileRow,
  type UserRoleFilter,
} from '@/app/actions/admin'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'

interface Props {
  initialUsers: AdminUserProfileRow[]
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Admin'
  if (role === 'customer') return 'Cliente'
  return role || 'Usuario'
}

function roleBadge(role: string) {
  if (role === 'admin') {
    return 'border-violet-200 bg-violet-50 text-violet-700'
  }
  return 'border-[#E8DCC4] bg-[#FAF7F2] text-[#6E564F]'
}

export default function UsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<AdminUserProfileRow[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all')
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4500)
  }

  const counts = useMemo(
    () => ({
      all: users.length,
      customer: users.filter((user) => user.role === 'customer').length,
      admin: users.filter((user) => user.role === 'admin').length,
    }),
    [users]
  )

  const visibleUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false

      if (!q) return true

      const haystack = [
        user.full_name || '',
        user.email || '',
        user.phone || '',
        roleLabel(user.role),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [users, searchQuery, roleFilter])

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
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? { ...user, cetys_pickup_enabled: nextStatus }
              : user
          )
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`fixed bottom-24 right-4 z-50 flex max-w-sm items-center rounded-xl border px-4 py-3 text-sm shadow-lg md:bottom-6 md:right-6 ${
            statusMessage.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <header>
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#A73832]">
          <Users className="h-3.5 w-3.5" />
          Personas
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#261C19]">
          Directorio de usuarios
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[#6E564F]">
          Consulta todas las cuentas registradas en Zanita, incluyendo clientes y administradores.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            id: 'all' as UserRoleFilter,
            label: 'Todos',
            count: counts.all,
            icon: Users,
          },
          {
            id: 'customer' as UserRoleFilter,
            label: 'Clientes',
            count: counts.customer,
            icon: UserRound,
          },
          {
            id: 'admin' as UserRoleFilter,
            label: 'Admins',
            count: counts.admin,
            icon: ShieldCheck,
          },
        ].map((item) => {
          const Icon = item.icon
          const active = roleFilter === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRoleFilter(item.id)}
              className={`flex min-h-20 items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                active
                  ? 'border-[#A73832] bg-[#FFF1EF]'
                  : 'border-[#E8DCC4] bg-white hover:bg-[#FAF7F2]'
              }`}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6E564F]">
                  {item.label}
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-[#261C19]">
                  {item.count}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  active ? 'bg-[#A73832] text-white' : 'bg-[#FAF7F2] text-[#A73832]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </button>
          )
        })}
      </section>

      <section className="rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E564F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o rol..."
            aria-label="Buscar usuario"
            className="w-full rounded-xl border border-[#E8DCC4] bg-[#FAF7F2] py-2.5 pl-10 pr-4 text-xs text-[#261C19] placeholder-[#6E564F]/60 focus:outline-none focus:ring-1 focus:ring-[#A73832] sm:text-sm"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E8DCC4] bg-white shadow-xs">
        {visibleUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6E564F]">
            No se encontraron usuarios con esos filtros.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DCC4] bg-[#FAF7F2] text-[#6E564F]">
                    <th className="px-5 py-3 font-semibold">Usuario</th>
                    <th className="px-5 py-3 font-semibold">Rol</th>
                    <th className="px-5 py-3 font-semibold">Contacto</th>
                    <th className="px-5 py-3 font-semibold">Registro</th>
                    <th className="px-5 py-3 text-right font-semibold">Pickup CETYS</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F2ECE1]">
                  {visibleUsers.map((user) => {
                    const regDate = user.created_at
                      ? new Date(user.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A'

                    return (
                      <tr key={user.id} className="hover:bg-[#FAF7F2]/40">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#261C19]">
                            {user.full_name || 'Sin nombre registrado'}
                          </p>
                          <p className="font-mono text-[10px] text-[#6E564F]/60">
                            ID: {user.id.slice(0, 8)}...
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${roleBadge(user.role)}`}
                          >
                            {user.role === 'admin' && <ShieldCheck className="h-3 w-3" />}
                            {roleLabel(user.role)}
                          </span>
                        </td>

                        <td className="space-y-1 px-5 py-4">
                          <div className="flex items-center text-[#261C19]">
                            <Mail className="mr-1.5 h-3.5 w-3.5 text-[#6E564F]" />
                            <span>{user.email || 'Sin correo'}</span>
                          </div>

                          {user.phone && (
                            <div className="flex items-center text-[#6E564F]">
                              <Phone className="mr-1.5 h-3.5 w-3.5" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-[#6E564F]">
                          <div className="flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5 text-[#6E564F]/60" />
                            <span>{regDate}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          {user.role === 'customer' ? (
                            <div className="inline-flex items-center space-x-2">
                              <span
                                className={`text-[11px] font-semibold ${
                                  user.cetys_pickup_enabled
                                    ? 'text-emerald-700'
                                    : 'text-[#6E564F]'
                                }`}
                              >
                                {user.cetys_pickup_enabled ? 'Autorizado' : 'Sin acceso'}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleCetys(
                                    user.id,
                                    user.cetys_pickup_enabled
                                  )
                                }
                                disabled={isPending && loadingId === user.id}
                                className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
                                  user.cetys_pickup_enabled
                                    ? 'bg-emerald-600'
                                    : 'bg-[#E8DCC4]'
                                } ${
                                  isPending && loadingId === user.id
                                    ? 'cursor-not-allowed opacity-50'
                                    : ''
                                }`}
                                aria-label={`Alternar permiso CETYS para ${user.full_name || user.email}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    user.cetys_pickup_enabled
                                      ? 'translate-x-6'
                                      : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#6E564F]/60">
                              No aplica
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[#F2ECE1] md:hidden">
              {visibleUsers.map((user) => {
                const regDate = user.created_at
                  ? new Date(user.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A'

                return (
                  <article key={user.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#261C19]">
                          {user.full_name || 'Sin nombre registrado'}
                        </p>
                        <p className="font-mono text-[10px] text-[#6E564F]/60">
                          ID: {user.id.slice(0, 8)}...
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${roleBadge(user.role)}`}
                      >
                        {user.role === 'admin' && <ShieldCheck className="h-3 w-3" />}
                        {roleLabel(user.role)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#6E564F]">
                      <div className="flex items-center break-all text-[#261C19]">
                        <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0 text-[#6E564F]" />
                        <span>{user.email || 'Sin correo'}</span>
                      </div>

                      {user.phone && (
                        <div className="flex items-center">
                          <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center text-[11px] text-[#6E564F]/70">
                        <Calendar className="mr-1.5 h-3 w-3 shrink-0" />
                        <span>Registro: {regDate}</span>
                      </div>
                    </div>

                    {user.role === 'customer' && (
                      <div className="flex items-center justify-between border-t border-[#F2ECE1] pt-3">
                        <div>
                          <p className="text-xs font-semibold text-[#261C19]">
                            Pickup CETYS
                          </p>
                          <p className="text-[10px] text-[#6E564F]">
                            {user.cetys_pickup_enabled
                              ? 'Cliente autorizado'
                              : 'Sin autorización'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCetys(
                              user.id,
                              user.cetys_pickup_enabled
                            )
                          }
                          disabled={isPending && loadingId === user.id}
                          className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
                            user.cetys_pickup_enabled
                              ? 'bg-emerald-600'
                              : 'bg-[#E8DCC4]'
                          } ${
                            isPending && loadingId === user.id
                              ? 'cursor-not-allowed opacity-50'
                              : ''
                          }`}
                          aria-label={`Alternar permiso CETYS para ${user.full_name || user.email}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              user.cetys_pickup_enabled
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
