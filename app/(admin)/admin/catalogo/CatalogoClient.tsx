'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import {
  safeDeleteCatalogOption,
  safeDeleteCatalogProduct,
  saveCatalogOption,
  saveCatalogOptionGroup,
  saveCatalogProduct,
  setCatalogOptionStatus,
  setCatalogProductStatus,
  uploadCatalogImage,
  type AdminCatalogData,
  type AdminCatalogGroup,
  type AdminCatalogOption,
  type AdminCatalogProduct,
  type OptionStatus,
  type ProductGroupInput,
  type ProductStatus,
} from '@/app/actions/admin-catalog'

type Tab = 'products' | 'ingredients' | 'groups'
type StatusFilter = 'all' | ProductStatus

const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  sold_out: 'Agotado',
  hidden: 'Oculto',
  archived: 'Archivado',
}

const OPTION_STATUS_LABELS: Record<OptionStatus, string> = {
  published: 'Disponible',
  sold_out: 'Agotado',
  hidden: 'Oculto',
  archived: 'Archivado',
}

const PRODUCT_STATUS_STYLES: Record<ProductStatus, string> = {
  draft: 'bg-stone-100 text-stone-700 border-stone-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sold_out: 'bg-amber-50 text-amber-800 border-amber-200',
  hidden: 'bg-slate-100 text-slate-700 border-slate-200',
  archived: 'bg-rose-50 text-rose-700 border-rose-200',
}

type ProductDraft = {
  id?: string
  name: string
  tagline: string
  description: string
  price: string
  category: string
  categoryLabel: string
  photoSrc: string
  featured: boolean
  status: ProductStatus
  scheduledReactivationAt: string
  assignments: ProductGroupInput[]
}

type OptionDraft = {
  id?: string
  groupId: string
  name: string
  price: string
  alwaysCharge: boolean
  status: OptionStatus
  scheduledReactivationAt: string
  displayOrder: number
}

type GroupDraft = {
  id?: string
  name: string
  description: string
  isActive: boolean
}

const emptyProduct = (): ProductDraft => ({
  name: '',
  tagline: '',
  description: '',
  price: '',
  category: '',
  categoryLabel: '',
  photoSrc: '',
  featured: false,
  status: 'draft',
  scheduledReactivationAt: '',
  assignments: [],
})

const emptyOption = (groupId = ''): OptionDraft => ({
  groupId,
  name: '',
  price: '0',
  alwaysCharge: false,
  status: 'published',
  scheduledReactivationAt: '',
  displayOrder: 0,
})

const emptyGroup = (): GroupDraft => ({
  name: '',
  description: '',
  isActive: true,
})

function toLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function money(cents: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#FAF7F2] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8DCC4] bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="font-serif text-xl font-bold text-[#261C19]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF7F2] text-[#6E564F]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export default function CatalogoClient({ initialData }: { initialData: AdminCatalogData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('products')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [ingredientGroupFilter, setIngredientGroupFilter] = useState('all')
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null)
  const [optionDraft, setOptionDraft] = useState<OptionDraft | null>(null)
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  const refresh = () => startTransition(() => router.refresh())

  const run = async (work: () => Promise<{ success?: boolean; error?: string }>, successText: string) => {
    setNotice(null)
    const result = await work()
    if (result.error || result.success === false) {
      setNotice({ type: 'error', text: result.error || 'No se pudo completar la acción.' })
      return false
    }
    setNotice({ type: 'success', text: successText })
    refresh()
    return true
  }

  const products = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialData.products.filter((product) => {
      if (q && !`${product.name} ${product.categoryLabel}`.toLowerCase().includes(q)) return false
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false
      if (statusFilter !== 'all' && product.status !== statusFilter) return false
      return true
    })
  }, [initialData.products, search, categoryFilter, statusFilter])

  const ingredientGroups = useMemo(
    () =>
      initialData.groups.filter((group) => {
        const text = `${group.name} ${group.description || ''}`.toLowerCase()
        return (
          text.includes('fruta') ||
          text.includes('topping') ||
          text.includes('composición') ||
          text.includes('composicion')
        )
      }),
    [initialData.groups]
  )

  const visibleIngredientGroups =
    ingredientGroupFilter === 'all'
      ? ingredientGroups
      : ingredientGroups.filter((group) => group.id === ingredientGroupFilter)

  const openProduct = (product?: AdminCatalogProduct) => {
    if (!product) {
      setProductDraft(emptyProduct())
      return
    }

    const assignments = initialData.assignments
      .filter((assignment) => assignment.productId === product.id)
      .map((assignment) => ({
        groupId: assignment.groupId,
        isRequired: assignment.isRequired,
        minSelections: assignment.minSelections,
        maxSelections: assignment.maxSelections,
        includedSelections: assignment.includedSelections,
        allowRepeats: assignment.allowRepeats,
        displayOrder: assignment.displayOrder,
      }))

    setProductDraft({
      id: product.id,
      name: product.name,
      tagline: product.tagline || '',
      description: product.description || '',
      price: String(product.basePriceCents / 100),
      category: product.category,
      categoryLabel: product.categoryLabel,
      photoSrc: product.photoSrc || '',
      featured: product.featured,
      status: product.status,
      scheduledReactivationAt: toLocalDateTime(product.scheduledReactivationAt),
      assignments,
    })
  }

  const openOption = (option?: AdminCatalogOption, groupId?: string) => {
    if (!option) {
      setOptionDraft(emptyOption(groupId || ingredientGroups[0]?.id || initialData.groups[0]?.id || ''))
      return
    }
    setOptionDraft({
      id: option.id,
      groupId: option.groupId,
      name: option.name,
      price: String(option.additionalPriceCents / 100),
      alwaysCharge: option.alwaysCharge,
      status: option.status,
      scheduledReactivationAt: toLocalDateTime(option.scheduledReactivationAt),
      displayOrder: option.displayOrder,
    })
  }

  const uploadImage = async (file: File) => {
    if (!initialData.schemaReady) return
    setUploading(true)
    setNotice(null)
    const form = new FormData()
    form.append('file', file)
    const result = await uploadCatalogImage(form)
    setUploading(false)
    if (!result.success || !result.url) {
      setNotice({ type: 'error', text: result.error || 'No se pudo subir la imagen.' })
      return
    }
    setProductDraft((current) => (current ? { ...current, photoSrc: result.url! } : current))
  }

  const saveProduct = async () => {
    if (!productDraft) return
    const cents = Math.round(Number(productDraft.price) * 100)
    const ok = await run(
      () =>
        saveCatalogProduct({
          id: productDraft.id,
          name: productDraft.name,
          tagline: productDraft.tagline,
          description: productDraft.description,
          basePriceCents: cents,
          category: productDraft.category,
          categoryLabel: productDraft.categoryLabel,
          photoSrc: productDraft.photoSrc || null,
          featured: productDraft.featured,
          status: productDraft.status,
          scheduledReactivationAt:
            productDraft.status === 'sold_out' && productDraft.scheduledReactivationAt
              ? new Date(productDraft.scheduledReactivationAt).toISOString()
              : null,
          groupAssignments: productDraft.assignments,
        }),
      productDraft.id ? 'Producto actualizado.' : 'Producto creado.'
    )
    if (ok) setProductDraft(null)
  }

  const saveOption = async () => {
    if (!optionDraft) return
    const ok = await run(
      () =>
        saveCatalogOption({
          id: optionDraft.id,
          groupId: optionDraft.groupId,
          name: optionDraft.name,
          additionalPriceCents: Math.round(Number(optionDraft.price) * 100),
          alwaysCharge: optionDraft.alwaysCharge,
          displayOrder: optionDraft.displayOrder,
          status: optionDraft.status,
          scheduledReactivationAt:
            optionDraft.status === 'sold_out' && optionDraft.scheduledReactivationAt
              ? new Date(optionDraft.scheduledReactivationAt).toISOString()
              : null,
        }),
      optionDraft.id ? 'Ingrediente actualizado.' : 'Ingrediente agregado.'
    )
    if (ok) setOptionDraft(null)
  }

  const saveGroup = async () => {
    if (!groupDraft) return
    const ok = await run(
      () =>
        saveCatalogOptionGroup({
          id: groupDraft.id,
          name: groupDraft.name,
          description: groupDraft.description,
          isActive: groupDraft.isActive,
        }),
      groupDraft.id ? 'Grupo actualizado.' : 'Grupo creado.'
    )
    if (ok) setGroupDraft(null)
  }

  const toggleAssignment = (group: AdminCatalogGroup, checked: boolean) => {
    setProductDraft((current) => {
      if (!current) return current
      if (!checked) {
        return { ...current, assignments: current.assignments.filter((item) => item.groupId !== group.id) }
      }
      const next: ProductGroupInput = {
        groupId: group.id,
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        includedSelections: 0,
        allowRepeats: false,
        displayOrder: current.assignments.length,
      }
      return { ...current, assignments: [...current.assignments, next] }
    })
  }

  const updateAssignment = (groupId: string, patch: Partial<ProductGroupInput>) => {
    setProductDraft((current) =>
      current
        ? {
            ...current,
            assignments: current.assignments.map((item) =>
              item.groupId === groupId ? { ...item, ...patch } : item
            ),
          }
        : current
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#A73832]">
            <Sparkles className="h-3.5 w-3.5" />
            Operación diaria
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#261C19]">Catálogo</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6E564F]">
            Cambia precios, disponibilidad, ingredientes y productos desde tu teléfono.
          </p>
        </div>
        {tab === 'products' && (
          <button
            type="button"
            onClick={() => openProduct()}
            disabled={!initialData.schemaReady}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A73832] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="h-4 w-4" />
            Agregar producto
          </button>
        )}
      </header>

      {!initialData.schemaReady && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Vista previa segura</p>
              <p className="mt-1 text-sm">
                Puedes revisar la nueva interfaz, pero crear, editar o cambiar disponibilidad se habilita
                únicamente después de aprobar y aplicar la migración de Catálogo.
              </p>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[#E8DCC4] bg-white p-1.5">
        {[
          { id: 'products' as Tab, label: 'Productos', icon: Package },
          { id: 'ingredients' as Tab, label: 'Ingredientes', icon: Utensils },
          { id: 'groups' as Tab, label: 'Personalizaciones', icon: ChevronDown },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-colors sm:text-sm ${
                tab === item.id ? 'bg-[#A73832] text-white' : 'text-[#6E564F] hover:bg-[#FAF7F2]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'products' && (
        <section className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#6E564F]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto"
                className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#A73832]"
              />
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
            >
              <option value="all">Todas las categorías</option>
              {initialData.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-11 rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-[#E8DCC4] bg-white">
                <div className="flex gap-3 p-3.5">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF9F2]">
                    {product.photoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.photoSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-[#A73832]/45" />
                    )}
                    {product.status === 'sold_out' && (
                      <span className="absolute inset-x-1 bottom-1 rounded-md bg-amber-600/95 px-1 py-0.5 text-center text-[9px] font-bold uppercase text-white">
                        Agotado
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-serif text-lg font-bold text-[#261C19]">{product.name}</h3>
                        <p className="truncate text-xs text-[#6E564F]">{product.categoryLabel}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${PRODUCT_STATUS_STYLES[product.status]}`}
                      >
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-bold text-[#A73832]">{money(product.basePriceCents)}</p>
                    {product.scheduledReactivationAt && product.status === 'sold_out' && (
                      <p className="mt-1 text-[11px] text-[#6E564F]">
                        Reactiva: {new Date(product.scheduledReactivationAt).toLocaleString('es-MX')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 border-t border-[#F2ECE1] p-2">
                  <button
                    type="button"
                    disabled={!initialData.schemaReady || isPending}
                    onClick={() =>
                      run(
                        () => setCatalogProductStatus(product.id, 'published'),
                        `${product.name} está disponible.`
                      )
                    }
                    className="min-h-10 rounded-lg px-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-35"
                  >
                    Disponible
                  </button>
                  <button
                    type="button"
                    disabled={!initialData.schemaReady || isPending}
                    onClick={() =>
                      run(
                        () => setCatalogProductStatus(product.id, 'sold_out'),
                        `${product.name} quedó agotado.`
                      )
                    }
                    className="min-h-10 rounded-lg px-2 text-[11px] font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-35"
                  >
                    Agotar
                  </button>
                  <button
                    type="button"
                    onClick={() => openProduct(product)}
                    className="min-h-10 rounded-lg px-2 text-[11px] font-bold text-[#A73832] hover:bg-[#FFF4F2]"
                  >
                    Editar
                  </button>
                </div>
              </article>
            ))}
          </div>

          {products.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#E8DCC4] bg-white p-10 text-center text-sm text-[#6E564F]">
              No encontramos productos con esos filtros.
            </div>
          )}
        </section>
      )}

      {tab === 'ingredients' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <select
              value={ingredientGroupFilter}
              onChange={(event) => setIngredientGroupFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
            >
              <option value="all">Frutas, toppings y composición</option>
              {ingredientGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => openOption(undefined, ingredientGroupFilter === 'all' ? undefined : ingredientGroupFilter)}
              disabled={!initialData.schemaReady || initialData.groups.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A73832] px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Agregar ingrediente
            </button>
          </div>

          {visibleIngredientGroups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-[#E8DCC4] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-bold">{group.name}</h3>
                  <p className="text-xs text-[#6E564F]">{group.options.length} opciones</p>
                </div>
                <button
                  type="button"
                  disabled={!initialData.schemaReady}
                  onClick={() => openOption(undefined, group.id)}
                  className="rounded-lg border border-[#E8DCC4] px-3 py-2 text-xs font-bold text-[#A73832] disabled:opacity-35"
                >
                  + Agregar
                </button>
              </div>

              <div className="divide-y divide-[#F2ECE1]">
                {group.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#261C19]">{option.name}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                            option.status === 'published'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : option.status === 'sold_out'
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'border-stone-200 bg-stone-100 text-stone-700'
                          }`}
                        >
                          {OPTION_STATUS_LABELS[option.status]}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E564F]">
                        {option.additionalPriceCents > 0 ? `+${money(option.additionalPriceCents)}` : 'Sin cargo extra'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!initialData.schemaReady || isPending}
                      onClick={() =>
                        run(
                          () =>
                            setCatalogOptionStatus(
                              option.id,
                              option.status === 'published' ? 'sold_out' : 'published'
                            ),
                          option.status === 'published'
                            ? `${option.name} quedó agotado.`
                            : `${option.name} volvió a estar disponible.`
                        )
                      }
                      className="rounded-lg border border-[#E8DCC4] px-2.5 py-2 text-[10px] font-bold text-[#6E564F] disabled:opacity-35"
                    >
                      {option.status === 'published' ? 'Agotar' : 'Disponible'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openOption(option)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF7F2] text-[#A73832]"
                      aria-label={`Editar ${option.name}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'groups' && (
        <section className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!initialData.schemaReady}
              onClick={() => setGroupDraft(emptyGroup())}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#A73832] px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Nueva personalización
            </button>
          </div>

          {initialData.groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() =>
                setGroupDraft({
                  id: group.id,
                  name: group.name,
                  description: group.description || '',
                  isActive: group.isActive,
                })
              }
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#E8DCC4] bg-white p-4 text-left"
            >
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-bold text-[#261C19]">{group.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-[#6E564F]">
                  {group.description || 'Sin descripción'}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-[#A73832]">
                  {group.options.length} opciones · {group.isActive ? 'Activo' : 'Oculto'}
                </p>
              </div>
              <Edit3 className="h-4 w-4 shrink-0 text-[#A73832]" />
            </button>
          ))}
        </section>
      )}

      {productDraft && (
        <Modal title={productDraft.id ? 'Editar producto' : 'Agregar producto'} onClose={() => setProductDraft(null)}>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold text-[#6E564F]">Nombre *</span>
                <input
                  value={productDraft.name}
                  onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })}
                  placeholder="Ej. Charola de quesos"
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Precio base MXN *</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={productDraft.price}
                  onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })}
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Estado</span>
                <select
                  value={productDraft.status}
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, status: event.target.value as ProductStatus })
                  }
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                >
                  {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Categoría</span>
                <select
                  value={initialData.categories.some((c) => c.id === productDraft.category) ? productDraft.category : '__new'}
                  onChange={(event) => {
                    const id = event.target.value
                    if (id === '__new') {
                      setProductDraft({ ...productDraft, category: '', categoryLabel: '' })
                      return
                    }
                    const category = initialData.categories.find((c) => c.id === id)
                    setProductDraft({
                      ...productDraft,
                      category: id,
                      categoryLabel: category?.label || id,
                    })
                  }}
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                >
                  <option value="__new">+ Nueva categoría</option>
                  {initialData.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Nombre visible de categoría *</span>
                <input
                  value={productDraft.categoryLabel}
                  onChange={(event) =>
                    setProductDraft({
                      ...productDraft,
                      categoryLabel: event.target.value,
                      category: initialData.categories.some((c) => c.id === productDraft.category)
                        ? productDraft.category
                        : event.target.value,
                    })
                  }
                  placeholder="Ej. Charolas saladas"
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#6E564F]">Descripción</span>
              <textarea
                value={productDraft.description}
                onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })}
                rows={4}
                className="w-full rounded-xl border border-[#E8DCC4] bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-4">
              <p className="text-xs font-bold text-[#6E564F]">Foto del producto</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF9F2]">
                  {productDraft.photoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productDraft.photoSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-[#A73832]/45" />
                  )}
                </div>
                <label
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#E8DCC4] px-3 text-sm font-bold text-[#A73832] ${
                    !initialData.schemaReady ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploading ? 'Subiendo…' : 'Elegir foto'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    disabled={!initialData.schemaReady || uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadImage(file)
                    }}
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-[#6E564F]">JPG, PNG, WEBP o AVIF · máximo 5 MB</p>
            </div>

            {productDraft.status === 'sold_out' && (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Reactivar automáticamente (opcional)</span>
                <input
                  type="datetime-local"
                  value={productDraft.scheduledReactivationAt}
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, scheduledReactivationAt: event.target.value })
                  }
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                />
              </label>
            )}

            <div className="space-y-3 rounded-2xl border border-[#E8DCC4] bg-white p-4">
              <div>
                <h3 className="font-serif text-lg font-bold">Personalización</h3>
                <p className="text-xs text-[#6E564F]">Asigna frutas, toppings u otras personalizaciones a este producto.</p>
              </div>

              {initialData.groups.filter((group) => group.isActive).map((group) => {
                const assignment = productDraft.assignments.find((item) => item.groupId === group.id)
                return (
                  <div key={group.id} className="rounded-xl border border-[#F2ECE1] p-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(assignment)}
                        onChange={(event) => toggleAssignment(group, event.target.checked)}
                      />
                      <span className="text-sm font-bold text-[#261C19]">{group.name}</span>
                    </label>

                    {assignment && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <label className="col-span-2 flex items-center gap-2 text-xs font-semibold text-[#6E564F] sm:col-span-1">
                          <input
                            type="checkbox"
                            checked={assignment.isRequired}
                            onChange={(event) =>
                              updateAssignment(group.id, { isRequired: event.target.checked })
                            }
                          />
                          Requerido
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-bold text-[#6E564F]">Mínimo</span>
                          <input
                            type="number"
                            min="0"
                            value={assignment.minSelections}
                            onChange={(event) =>
                              updateAssignment(group.id, { minSelections: Number(event.target.value) })
                            }
                            className="h-9 w-full rounded-lg border border-[#E8DCC4] px-2 text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-bold text-[#6E564F]">Máximo</span>
                          <input
                            type="number"
                            min="0"
                            value={assignment.maxSelections ?? ''}
                            onChange={(event) =>
                              updateAssignment(group.id, {
                                maxSelections: event.target.value === '' ? null : Number(event.target.value),
                              })
                            }
                            className="h-9 w-full rounded-lg border border-[#E8DCC4] px-2 text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-bold text-[#6E564F]">Incluidos</span>
                          <input
                            type="number"
                            min="0"
                            value={assignment.includedSelections}
                            onChange={(event) =>
                              updateAssignment(group.id, { includedSelections: Number(event.target.value) })
                            }
                            className="h-9 w-full rounded-lg border border-[#E8DCC4] px-2 text-xs"
                          />
                        </label>
                        <label className="col-span-2 flex items-center gap-2 text-xs font-semibold text-[#6E564F]">
                          <input
                            type="checkbox"
                            checked={assignment.allowRepeats}
                            onChange={(event) =>
                              updateAssignment(group.id, { allowRepeats: event.target.checked })
                            }
                          />
                          Permitir repetir opciones
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {productDraft.id ? (
                <button
                  type="button"
                  disabled={!initialData.schemaReady || isPending}
                  onClick={async () => {
                    if (!window.confirm('¿Eliminar este producto? Si ya tiene historial, se archivará en lugar de borrarse.')) return
                    const result = await safeDeleteCatalogProduct(productDraft.id!)
                    if (!result.success) {
                      setNotice({ type: 'error', text: result.error || 'No se pudo eliminar.' })
                      return
                    }
                    setNotice({
                      type: 'success',
                      text: result.archived
                        ? 'El producto tenía historial y se archivó de forma segura.'
                        : 'Producto eliminado.',
                    })
                    setProductDraft(null)
                    refresh()
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 disabled:opacity-35"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar / archivar
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={() => void saveProduct()}
                disabled={!initialData.schemaReady || isPending || uploading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A73832] px-5 text-sm font-bold text-white disabled:opacity-40"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar producto
              </button>
            </div>
          </div>
        </Modal>
      )}

      {optionDraft && (
        <Modal title={optionDraft.id ? 'Editar ingrediente' : 'Agregar ingrediente'} onClose={() => setOptionDraft(null)}>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#6E564F]">Grupo *</span>
              <select
                value={optionDraft.groupId}
                onChange={(event) => setOptionDraft({ ...optionDraft, groupId: event.target.value })}
                className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
              >
                {initialData.groups.filter((group) => group.isActive).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#6E564F]">Nombre *</span>
              <input
                value={optionDraft.name}
                onChange={(event) => setOptionDraft({ ...optionDraft, name: event.target.value })}
                className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Cargo extra MXN</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={optionDraft.price}
                  onChange={(event) => setOptionDraft({ ...optionDraft, price: event.target.value })}
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Estado</span>
                <select
                  value={optionDraft.status}
                  onChange={(event) =>
                    setOptionDraft({ ...optionDraft, status: event.target.value as OptionStatus })
                  }
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                >
                  {Object.entries(OPTION_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-[#E8DCC4] bg-white p-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={optionDraft.alwaysCharge}
                onChange={(event) => setOptionDraft({ ...optionDraft, alwaysCharge: event.target.checked })}
              />
              Este extra siempre se cobra
            </label>

            {optionDraft.status === 'sold_out' && (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-[#6E564F]">Reactivar automáticamente (opcional)</span>
                <input
                  type="datetime-local"
                  value={optionDraft.scheduledReactivationAt}
                  onChange={(event) =>
                    setOptionDraft({ ...optionDraft, scheduledReactivationAt: event.target.value })
                  }
                  className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
                />
              </label>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {optionDraft.id ? (
                <button
                  type="button"
                  disabled={!initialData.schemaReady || isPending}
                  onClick={async () => {
                    if (!window.confirm('¿Eliminar esta opción? Si ya existe en pedidos, se archivará.')) return
                    const result = await safeDeleteCatalogOption(optionDraft.id!)
                    if (!result.success) {
                      setNotice({ type: 'error', text: result.error || 'No se pudo eliminar.' })
                      return
                    }
                    setNotice({
                      type: 'success',
                      text: result.archived ? 'La opción se archivó para conservar el historial.' : 'Opción eliminada.',
                    })
                    setOptionDraft(null)
                    refresh()
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 disabled:opacity-35"
                >
                  <Archive className="h-4 w-4" />
                  Eliminar / archivar
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                disabled={!initialData.schemaReady || isPending}
                onClick={() => void saveOption()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A73832] px-5 text-sm font-bold text-white disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {groupDraft && (
        <Modal title={groupDraft.id ? 'Editar personalización' : 'Nueva personalización'} onClose={() => setGroupDraft(null)}>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#6E564F]">Nombre *</span>
              <input
                value={groupDraft.name}
                onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })}
                placeholder="Ej. Elige tus toppings"
                className="h-11 w-full rounded-xl border border-[#E8DCC4] bg-white px-3 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#6E564F]">Descripción</span>
              <textarea
                rows={3}
                value={groupDraft.description}
                onChange={(event) => setGroupDraft({ ...groupDraft, description: event.target.value })}
                className="w-full rounded-xl border border-[#E8DCC4] bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[#E8DCC4] bg-white p-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={groupDraft.isActive}
                onChange={(event) => setGroupDraft({ ...groupDraft, isActive: event.target.checked })}
              />
              Personalización activa
            </label>
            <button
              type="button"
              disabled={!initialData.schemaReady || isPending}
              onClick={() => void saveGroup()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#A73832] px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              Guardar personalización
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
