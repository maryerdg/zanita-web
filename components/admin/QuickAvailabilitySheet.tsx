'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Search, X, Zap } from 'lucide-react'
import {
  setCatalogOptionStatus,
  setCatalogProductStatus,
  type AdminCatalogData,
} from '@/app/actions/admin-catalog'

export default function QuickAvailabilitySheet({
  data,
}: {
  data: Pick<AdminCatalogData, 'products' | 'groups' | 'schemaReady'>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const products = data.products
      .filter((product) => product.status !== 'archived' && product.status !== 'draft')
      .map((product) => ({
        id: product.id,
        name: product.name,
        kind: 'product' as const,
        detail: product.categoryLabel,
        available: product.status === 'published' && product.isAvailable,
      }))

    const options = data.groups.flatMap((group) =>
      group.options
        .filter((option) => option.status !== 'archived')
        .map((option) => ({
          id: option.id,
          name: option.name,
          kind: 'option' as const,
          detail: group.name,
          available: option.status === 'published' && option.isAvailable,
        }))
    )

    return [...products, ...options]
      .filter((item) => !q || `${item.name} ${item.detail}`.toLowerCase().includes(q))
      .slice(0, 30)
  }, [data, query])

  const change = async (item: (typeof items)[number]) => {
    setMessage(null)
    const result =
      item.kind === 'product'
        ? await setCatalogProductStatus(item.id, item.available ? 'sold_out' : 'published')
        : await setCatalogOptionStatus(item.id, item.available ? 'sold_out' : 'published')

    if (!result.success) {
      setMessage(result.error || 'No se pudo cambiar la disponibilidad.')
      return
    }

    startTransition(() => router.refresh())
    setMessage(item.available ? `${item.name} quedó agotado.` : `${item.name} volvió a estar disponible.`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8DCC4] bg-white px-4 text-sm font-bold text-[#A73832] shadow-xs hover:bg-[#FFF9F2]"
      >
        <Zap className="h-4 w-4" />
        Agotar producto / ingrediente
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/35 sm:items-center sm:justify-center sm:p-6">
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-3xl bg-[#FAF7F2] shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-[#E8DCC4] bg-white px-5 py-4">
              <div>
                <p className="font-serif text-xl font-bold text-[#261C19]">Disponibilidad rápida</p>
                <p className="text-xs text-[#6E564F]">Un toque para agotar o reactivar</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF7F2] text-[#6E564F]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {!data.schemaReady && (
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Vista previa: los cambios se activarán al aprobar la migración de Catálogo.</span>
                </div>
              )}

              <label className="relative block">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#6E564F]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar producto, fruta o topping"
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#A73832]"
                />
              </label>

              {message && (
                <div className="rounded-xl bg-[#FFF9F2] px-3 py-2 text-xs font-semibold text-[#A73832]">
                  {message}
                </div>
              )}

              <div className="max-h-[55vh] divide-y divide-[#F2ECE1] overflow-y-auto rounded-2xl border border-[#E8DCC4] bg-white">
                {items.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#261C19]">{item.name}</p>
                      <p className="truncate text-[11px] text-[#6E564F]">
                        {item.detail} · {item.kind === 'product' ? 'Producto' : 'Ingrediente'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!data.schemaReady || isPending}
                      onClick={() => void change(item)}
                      className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold disabled:opacity-35 ${
                        item.available
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : item.available ? (
                        'Agotar'
                      ) : (
                        'Disponible'
                      )}
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="p-8 text-center text-sm text-[#6E564F]">No encontramos coincidencias.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
