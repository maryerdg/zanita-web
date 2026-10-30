'use server'

import { revalidatePath } from 'next/cache'
import { verifyAdminCaller } from './admin'

export type ProductStatus = 'draft' | 'published' | 'sold_out' | 'hidden' | 'archived'
export type OptionStatus = 'published' | 'sold_out' | 'hidden' | 'archived'

export type AdminCatalogProduct = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  basePriceCents: number
  category: string
  categoryLabel: string
  photoSrc: string | null
  featured: boolean
  displayOrder: number
  status: ProductStatus
  isActive: boolean
  isAvailable: boolean
  scheduledReactivationAt: string | null
}

export type AdminCatalogOption = {
  id: string
  groupId: string
  name: string
  additionalPriceCents: number
  alwaysCharge: boolean
  displayOrder: number
  status: OptionStatus
  isActive: boolean
  isAvailable: boolean
  scheduledReactivationAt: string | null
}

export type AdminCatalogGroup = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  options: AdminCatalogOption[]
}

export type AdminProductGroupAssignment = {
  productId: string
  groupId: string
  isRequired: boolean
  minSelections: number
  maxSelections: number | null
  includedSelections: number
  allowRepeats: boolean
  displayOrder: number
}

export type AdminCatalogData = {
  products: AdminCatalogProduct[]
  groups: AdminCatalogGroup[]
  assignments: AdminProductGroupAssignment[]
  categories: Array<{ id: string; label: string }>
  schemaReady: boolean
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max)
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function effectiveAvailability(
  status: string,
  isAvailable: boolean,
  scheduledReactivationAt: string | null
) {
  if (status === 'published' && isAvailable) return true
  if (status !== 'sold_out' || !scheduledReactivationAt) return false
  return new Date(scheduledReactivationAt).getTime() <= Date.now()
}

function publicFlagsForProduct(status: ProductStatus) {
  return {
    is_active: status === 'published' || status === 'sold_out',
    is_available: status === 'published',
  }
}

function publicFlagsForOption(status: OptionStatus) {
  return {
    is_active: status === 'published' || status === 'sold_out',
    is_available: status === 'published',
  }
}

async function catalogSchemaReady(supabase: Awaited<ReturnType<typeof verifyAdminCaller>>['supabase']) {
  if (!supabase) return false
  const { error } = await supabase
    .from('zanita_products')
    .select('status,is_available,scheduled_reactivation_at')
    .limit(1)

  return !error
}

function revalidateCatalog() {
  revalidatePath('/admin')
  revalidatePath('/admin/catalogo')
  revalidatePath('/productos')
  revalidatePath('/')
}

export async function getAdminCatalogData(): Promise<{ data?: AdminCatalogData; error?: string }> {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { error: auth.error || 'No autorizado' }
  const supabase = auth.supabase

  const schemaReady = await catalogSchemaReady(supabase)

  const productFields = schemaReady
    ? 'id,slug,name,tagline,description,base_price_cents,category,category_label,photo_src,featured,display_order,is_active,is_available,status,scheduled_reactivation_at'
    : 'id,slug,name,tagline,description,base_price_cents,category,category_label,photo_src,featured,display_order,is_active'

  const optionFields = schemaReady
    ? 'id,group_id,name,additional_price_cents,always_charge,display_order,is_active,is_available,status,scheduled_reactivation_at'
    : 'id,group_id,name,additional_price_cents,always_charge,display_order,is_active'

  const [productRes, groupRes, optionRes, assignmentRes] = await Promise.all([
    supabase
      .from('zanita_products')
      .select(productFields)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('zanita_option_groups')
      .select('id,name,description,is_active')
      .order('created_at', { ascending: true }),
    supabase
      .from('zanita_options')
      .select(optionFields)
      .order('group_id', { ascending: true })
      .order('display_order', { ascending: true }),
    supabase
      .from('zanita_product_option_groups')
      .select('product_id,group_id,is_required,min_selections,max_selections,included_selections,allow_repeats,display_order')
      .order('display_order', { ascending: true }),
  ])

  const firstError = productRes.error || groupRes.error || optionRes.error || assignmentRes.error
  if (firstError) {
    console.error('getAdminCatalogData error:', firstError)
    return { error: 'No se pudo cargar el catálogo administrativo.' }
  }

  const productRows = (productRes.data || []) as unknown as Record<string, unknown>[]
  const optionRows = (optionRes.data || []) as unknown as Record<string, unknown>[]
  const groupRows = (groupRes.data || []) as unknown as Record<string, unknown>[]
  const assignmentRows = (assignmentRes.data || []) as unknown as Record<string, unknown>[]

  const products: AdminCatalogProduct[] = productRows.map((row) => {
    const status = (schemaReady
      ? String(row.status || (row.is_active ? 'published' : 'hidden'))
      : row.is_active
        ? 'published'
        : 'hidden') as ProductStatus
    const scheduled = schemaReady ? (row.scheduled_reactivation_at as string | null) : null
    const availableRaw = schemaReady ? Boolean(row.is_available) : Boolean(row.is_active)

    return {
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      tagline: (row.tagline as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      basePriceCents: Number(row.base_price_cents || 0),
      category: String(row.category || 'otros'),
      categoryLabel: String(row.category_label || row.category || 'Otros'),
      photoSrc: (row.photo_src as string | null) ?? null,
      featured: Boolean(row.featured),
      displayOrder: Number(row.display_order || 0),
      status,
      isActive: Boolean(row.is_active),
      isAvailable: effectiveAvailability(status, availableRaw, scheduled),
      scheduledReactivationAt: scheduled,
    }
  })

  const options: AdminCatalogOption[] = optionRows.map((row) => {
    const status = (schemaReady
      ? String(row.status || (row.is_active ? 'published' : 'hidden'))
      : row.is_active
        ? 'published'
        : 'hidden') as OptionStatus
    const scheduled = schemaReady ? (row.scheduled_reactivation_at as string | null) : null
    const availableRaw = schemaReady ? Boolean(row.is_available) : Boolean(row.is_active)

    return {
      id: String(row.id),
      groupId: String(row.group_id),
      name: String(row.name),
      additionalPriceCents: Number(row.additional_price_cents || 0),
      alwaysCharge: Boolean(row.always_charge),
      displayOrder: Number(row.display_order || 0),
      status,
      isActive: Boolean(row.is_active),
      isAvailable: effectiveAvailability(status, availableRaw, scheduled),
      scheduledReactivationAt: scheduled,
    }
  })

  const groups: AdminCatalogGroup[] = groupRows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    isActive: Boolean(row.is_active),
    options: options.filter((option) => option.groupId === String(row.id)),
  }))

  const assignments: AdminProductGroupAssignment[] = assignmentRows.map((row) => ({
    productId: String(row.product_id),
    groupId: String(row.group_id),
    isRequired: Boolean(row.is_required),
    minSelections: Number(row.min_selections || 0),
    maxSelections: row.max_selections === null ? null : Number(row.max_selections),
    includedSelections: Number(row.included_selections || 0),
    allowRepeats: Boolean(row.allow_repeats),
    displayOrder: Number(row.display_order || 0),
  }))

  const categoryMap = new Map<string, string>()
  for (const product of products) {
    if (!categoryMap.has(product.category)) {
      categoryMap.set(product.category, product.categoryLabel)
    }
  }

  return {
    data: {
      products,
      groups,
      assignments,
      categories: Array.from(categoryMap, ([id, label]) => ({ id, label })),
      schemaReady,
    },
  }
}

export type ProductGroupInput = {
  groupId: string
  isRequired: boolean
  minSelections: number
  maxSelections: number | null
  includedSelections: number
  allowRepeats: boolean
  displayOrder: number
}

export type SaveProductInput = {
  id?: string
  name: string
  tagline?: string | null
  description?: string | null
  basePriceCents: number
  category: string
  categoryLabel: string
  photoSrc?: string | null
  featured?: boolean
  status: ProductStatus
  scheduledReactivationAt?: string | null
  groupAssignments?: ProductGroupInput[]
}

function validateAssignments(assignments: ProductGroupInput[]) {
  for (const assignment of assignments) {
    if (assignment.minSelections < 0) return 'El mínimo de selecciones no puede ser negativo.'
    if (assignment.maxSelections !== null && assignment.maxSelections < assignment.minSelections) {
      return 'El máximo de selecciones no puede ser menor al mínimo.'
    }
    if (assignment.maxSelections !== null && assignment.includedSelections > assignment.maxSelections) {
      return 'Las selecciones incluidas no pueden superar el máximo.'
    }
  }
  return null
}

export async function saveCatalogProduct(input: SaveProductInput) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  const supabase = auth.supabase

  if (!(await catalogSchemaReady(supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada. Esta vista está en modo Preview.' }
  }

  const name = cleanText(input.name, 120)
  const description = cleanText(input.description, 1200)
  const tagline = cleanText(input.tagline, 180)
  const categoryLabel = cleanText(input.categoryLabel, 80)
  const categoryBase = cleanText(input.category, 80)
  const category = slugify(categoryBase || categoryLabel)
  const basePriceCents = Math.round(Number(input.basePriceCents))

  if (!name) return { success: false, error: 'El nombre del producto es obligatorio.' }
  if (!category || !categoryLabel) return { success: false, error: 'Selecciona o crea una categoría.' }
  if (!Number.isFinite(basePriceCents) || basePriceCents < 0) {
    return { success: false, error: 'El precio debe ser válido y mayor o igual a $0.' }
  }

  const assignments = input.groupAssignments || []
  const assignmentError = validateAssignments(assignments)
  if (assignmentError) return { success: false, error: assignmentError }

  if (input.status === 'published') {
    for (const assignment of assignments) {
      if (assignment.isRequired && assignment.minSelections <= 0) {
        return { success: false, error: 'Un grupo requerido debe tener al menos 1 selección mínima.' }
      }
    }
  }

  const flags = publicFlagsForProduct(input.status)
  const productPayload = {
    name,
    tagline: tagline || null,
    description: description || null,
    base_price_cents: basePriceCents,
    category,
    category_label: categoryLabel,
    photo_src: input.photoSrc || null,
    featured: Boolean(input.featured),
    status: input.status,
    is_active: flags.is_active,
    is_available: flags.is_available,
    scheduled_reactivation_at:
      input.status === 'sold_out' && input.scheduledReactivationAt
        ? input.scheduledReactivationAt
        : null,
  }

  let productId = input.id || null

  if (productId) {
    const { error } = await supabase
      .from('zanita_products')
      .update(productPayload)
      .eq('id', productId)

    if (error) {
      console.error('saveCatalogProduct update:', error)
      return { success: false, error: 'No se pudo actualizar el producto.' }
    }
  } else {
    let slug = slugify(name) || 'producto'
    const { data: existing } = await supabase
      .from('zanita_products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`

    const { data, error } = await supabase
      .from('zanita_products')
      .insert({ ...productPayload, slug })
      .select('id')
      .single()

    if (error || !data) {
      console.error('saveCatalogProduct insert:', error)
      return { success: false, error: 'No se pudo crear el producto.' }
    }
    productId = data.id
  }

  if (productId) {
    const { error: deleteError } = await supabase
      .from('zanita_product_option_groups')
      .delete()
      .eq('product_id', productId)

    if (deleteError) {
      console.error('saveCatalogProduct assignment delete:', deleteError)
      return { success: false, error: 'El producto se guardó, pero no se pudieron actualizar sus grupos.' }
    }

    if (assignments.length > 0) {
      const rows = assignments.map((assignment) => ({
        product_id: productId,
        group_id: assignment.groupId,
        is_required: assignment.isRequired,
        min_selections: assignment.minSelections,
        max_selections: assignment.maxSelections,
        included_selections: assignment.includedSelections,
        allow_repeats: assignment.allowRepeats,
        display_order: assignment.displayOrder,
      }))

      const { error: insertError } = await supabase
        .from('zanita_product_option_groups')
        .insert(rows)

      if (insertError) {
        console.error('saveCatalogProduct assignment insert:', insertError)
        return { success: false, error: 'El producto se guardó, pero sus grupos necesitan revisión.' }
      }
    }
  }

  revalidateCatalog()
  return { success: true, productId }
}

export async function setCatalogProductStatus(
  productId: string,
  status: ProductStatus,
  scheduledReactivationAt?: string | null
) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  if (!(await catalogSchemaReady(auth.supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada.' }
  }

  const flags = publicFlagsForProduct(status)
  const { error } = await auth.supabase
    .from('zanita_products')
    .update({
      status,
      is_active: flags.is_active,
      is_available: flags.is_available,
      scheduled_reactivation_at:
        status === 'sold_out' && scheduledReactivationAt ? scheduledReactivationAt : null,
    })
    .eq('id', productId)

  if (error) {
    console.error('setCatalogProductStatus:', error)
    return { success: false, error: 'No se pudo cambiar el estado del producto.' }
  }

  revalidateCatalog()
  return { success: true }
}

export type SaveOptionInput = {
  id?: string
  groupId: string
  name: string
  additionalPriceCents: number
  alwaysCharge?: boolean
  displayOrder?: number
  status: OptionStatus
  scheduledReactivationAt?: string | null
}

export async function saveCatalogOption(input: SaveOptionInput) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  if (!(await catalogSchemaReady(auth.supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada.' }
  }

  const name = cleanText(input.name, 120)
  const additionalPriceCents = Math.round(Number(input.additionalPriceCents))
  if (!name) return { success: false, error: 'El nombre de la opción es obligatorio.' }
  if (!Number.isFinite(additionalPriceCents) || additionalPriceCents < 0) {
    return { success: false, error: 'El precio extra no es válido.' }
  }

  const flags = publicFlagsForOption(input.status)
  const payload = {
    group_id: input.groupId,
    name,
    additional_price_cents: additionalPriceCents,
    always_charge: Boolean(input.alwaysCharge),
    display_order: Number(input.displayOrder || 0),
    status: input.status,
    is_active: flags.is_active,
    is_available: flags.is_available,
    scheduled_reactivation_at:
      input.status === 'sold_out' && input.scheduledReactivationAt
        ? input.scheduledReactivationAt
        : null,
  }

  const query = input.id
    ? auth.supabase.from('zanita_options').update(payload).eq('id', input.id)
    : auth.supabase.from('zanita_options').insert(payload)

  const { error } = await query
  if (error) {
    console.error('saveCatalogOption:', error)
    return { success: false, error: 'No se pudo guardar el ingrediente/opción.' }
  }

  revalidateCatalog()
  return { success: true }
}

export async function setCatalogOptionStatus(
  optionId: string,
  status: OptionStatus,
  scheduledReactivationAt?: string | null
) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  if (!(await catalogSchemaReady(auth.supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada.' }
  }

  const flags = publicFlagsForOption(status)
  const { error } = await auth.supabase
    .from('zanita_options')
    .update({
      status,
      is_active: flags.is_active,
      is_available: flags.is_available,
      scheduled_reactivation_at:
        status === 'sold_out' && scheduledReactivationAt ? scheduledReactivationAt : null,
    })
    .eq('id', optionId)

  if (error) {
    console.error('setCatalogOptionStatus:', error)
    return { success: false, error: 'No se pudo cambiar el estado de la opción.' }
  }

  revalidateCatalog()
  return { success: true }
}

export async function saveCatalogOptionGroup(input: {
  id?: string
  name: string
  description?: string | null
  isActive?: boolean
}) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  if (!(await catalogSchemaReady(auth.supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada.' }
  }

  const name = cleanText(input.name, 120)
  if (!name) return { success: false, error: 'El nombre del grupo es obligatorio.' }

  const payload = {
    name,
    description: cleanText(input.description, 500) || null,
    is_active: input.isActive ?? true,
  }

  const query = input.id
    ? auth.supabase.from('zanita_option_groups').update(payload).eq('id', input.id)
    : auth.supabase.from('zanita_option_groups').insert(payload)

  const { error } = await query
  if (error) {
    console.error('saveCatalogOptionGroup:', error)
    return { success: false, error: 'No se pudo guardar el grupo de opciones.' }
  }

  revalidateCatalog()
  return { success: true }
}

export async function safeDeleteCatalogProduct(productId: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  if (!(await catalogSchemaReady(auth.supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada.' }
  }

  const { count, error: countError } = await auth.supabase
    .from('zanita_order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)

  if (countError) return { success: false, error: 'No se pudo verificar el historial del producto.' }

  if ((count || 0) > 0) {
    const { error } = await auth.supabase
      .from('zanita_products')
      .update({ status: 'archived', is_active: false, is_available: false, scheduled_reactivation_at: null })
      .eq('id', productId)

    if (error) return { success: false, error: 'No se pudo archivar el producto.' }
    revalidateCatalog()
    return { success: true, archived: true }
  }

  const { error } = await auth.supabase.from('zanita_products').delete().eq('id', productId)
  if (error) return { success: false, error: 'No se pudo eliminar el producto.' }

  revalidateCatalog()
  return { success: true, archived: false }
}

export async function safeDeleteCatalogOption(optionId: string) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  if (!(await catalogSchemaReady(auth.supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada.' }
  }

  const { count, error: countError } = await auth.supabase
    .from('zanita_order_item_options')
    .select('id', { count: 'exact', head: true })
    .eq('option_id', optionId)

  if (countError) return { success: false, error: 'No se pudo verificar el historial de la opción.' }

  if ((count || 0) > 0) {
    const { error } = await auth.supabase
      .from('zanita_options')
      .update({ status: 'archived', is_active: false, is_available: false, scheduled_reactivation_at: null })
      .eq('id', optionId)

    if (error) return { success: false, error: 'No se pudo archivar la opción.' }
    revalidateCatalog()
    return { success: true, archived: true }
  }

  const { error } = await auth.supabase.from('zanita_options').delete().eq('id', optionId)
  if (error) return { success: false, error: 'No se pudo eliminar la opción.' }

  revalidateCatalog()
  return { success: true, archived: false }
}

export async function uploadCatalogImage(formData: FormData) {
  const auth = await verifyAdminCaller()
  if (auth.error || !auth.supabase) return { success: false, error: auth.error || 'No autorizado' }
  if (!(await catalogSchemaReady(auth.supabase))) {
    return { success: false, error: 'La migración de Catálogo todavía no está aplicada.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return { success: false, error: 'Selecciona una imagen.' }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
  if (!allowed.has(file.type)) {
    return { success: false, error: 'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'La imagen no puede pesar más de 5 MB.' }
  }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `products/${crypto.randomUUID()}.${extension}`
  const body = Buffer.from(await file.arrayBuffer())

  const { error } = await auth.supabase.storage
    .from('catalog')
    .upload(path, body, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('uploadCatalogImage:', error)
    return { success: false, error: 'No se pudo subir la foto.' }
  }

  const { data } = auth.supabase.storage.from('catalog').getPublicUrl(path)
  return { success: true, url: data.publicUrl }
}
