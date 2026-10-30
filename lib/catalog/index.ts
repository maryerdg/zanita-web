import { createClient } from '@/lib/supabase/server';

export type CatalogProductStatus = 'draft' | 'published' | 'sold_out' | 'hidden' | 'archived';

export interface CatalogOption {
  id: string;
  name: string;
  additionalPriceCents: number;
  alwaysCharge: boolean;
  isAvailable: boolean;
  status: 'published' | 'sold_out' | 'hidden' | 'archived';
}

export interface CatalogOptionGroup {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  includedSelections: number;
  allowRepeats: boolean;
  options: CatalogOption[];
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number;
  category: string;
  categoryLabel: string;
  customizationNote: string | null;
  featured: boolean;
  colorAccent: string | null;
  photoSrc: string | null;
  isAvailable: boolean;
  status: CatalogProductStatus;
  scheduledReactivationAt: string | null;
  optionGroups: CatalogOptionGroup[];
}

type DbOption = {
  id: string;
  name: string;
  additional_price_cents: number;
  always_charge: boolean;
  is_active: boolean;
  is_available?: boolean;
  status?: string;
  scheduled_reactivation_at?: string | null;
  display_order: number;
};

type DbGroup = {
  id: string;
  name: string;
  description: string;
  zanita_options: DbOption[];
};

type DbProductOptionGroup = {
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  included_selections: number;
  allow_repeats: boolean;
  display_order: number;
  zanita_option_groups: DbGroup | null;
};

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  base_price_cents: number;
  category: string;
  category_label: string;
  customization_note: string | null;
  featured: boolean;
  color_accent: string | null;
  photo_src: string | null;
  is_active: boolean;
  is_available?: boolean;
  status?: string;
  scheduled_reactivation_at?: string | null;
  zanita_product_option_groups?: DbProductOptionGroup[];
};

function effectiveAvailability(
  status: string | undefined,
  isAvailable: boolean | undefined,
  scheduledReactivationAt: string | null | undefined,
  legacyIsActive: boolean
): boolean {
  if (!status) return legacyIsActive;
  if (status === 'published') return isAvailable !== false;
  if (status === 'sold_out' && scheduledReactivationAt) {
    return new Date(scheduledReactivationAt).getTime() <= Date.now();
  }
  return false;
}

function normalizeStatus(status: string | undefined, legacyIsActive: boolean): CatalogProductStatus {
  if (
    status === 'draft' ||
    status === 'published' ||
    status === 'sold_out' ||
    status === 'hidden' ||
    status === 'archived'
  ) {
    return status;
  }
  return legacyIsActive ? 'published' : 'hidden';
}

function normalizeOptionStatus(status: string | undefined, legacyIsActive: boolean): CatalogOption['status'] {
  if (status === 'published' || status === 'sold_out' || status === 'hidden' || status === 'archived') {
    return status;
  }
  return legacyIsActive ? 'published' : 'hidden';
}

async function loadProductsWithFallback() {
  const supabase = await createClient();

  const modern = await supabase
    .from('zanita_products')
    .select(`
      id, slug, name, tagline, description, base_price_cents, category, category_label,
      customization_note, featured, color_accent, photo_src, is_active, is_available, status,
      scheduled_reactivation_at
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!modern.error) return { products: (modern.data || []) as unknown as DbProduct[], schemaReady: true };

  const legacy = await supabase
    .from('zanita_products')
    .select(`
      id, slug, name, tagline, description, base_price_cents, category, category_label,
      customization_note, featured, color_accent, photo_src, is_active
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (legacy.error) {
    console.error('Error fetching products:', legacy.error);
    return { products: [] as DbProduct[], schemaReady: false };
  }

  return { products: (legacy.data || []) as unknown as DbProduct[], schemaReady: false };
}

export async function getProducts(): Promise<CatalogProduct[]> {
  const { products } = await loadProductsWithFallback();

  return products.map((p) => {
    const status = normalizeStatus(p.status, p.is_active);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      price: p.base_price_cents / 100,
      category: p.category,
      categoryLabel: p.category_label,
      customizationNote: p.customization_note,
      featured: p.featured,
      colorAccent: p.color_accent,
      photoSrc: p.photo_src,
      isAvailable: effectiveAvailability(
        p.status,
        p.is_available,
        p.scheduled_reactivation_at,
        p.is_active
      ),
      status,
      scheduledReactivationAt: p.scheduled_reactivation_at ?? null,
      optionGroups: [],
    };
  });
}

async function loadProductBySlugWithFallback(slug: string) {
  const supabase = await createClient();

  const modern = await supabase
    .from('zanita_products')
    .select(`
      id, slug, name, tagline, description, base_price_cents, category, category_label,
      customization_note, featured, color_accent, photo_src, is_active, is_available, status,
      scheduled_reactivation_at,
      zanita_product_option_groups (
        is_required, min_selections, max_selections, included_selections, allow_repeats, display_order,
        zanita_option_groups (
          id, name, description,
          zanita_options (
            id, name, additional_price_cents, always_charge, is_active, is_available, status,
            scheduled_reactivation_at, display_order
          )
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!modern.error && modern.data) {
    return { product: modern.data as unknown as DbProduct, schemaReady: true };
  }

  const legacy = await supabase
    .from('zanita_products')
    .select(`
      id, slug, name, tagline, description, base_price_cents, category, category_label,
      customization_note, featured, color_accent, photo_src, is_active,
      zanita_product_option_groups (
        is_required, min_selections, max_selections, included_selections, allow_repeats, display_order,
        zanita_option_groups (
          id, name, description,
          zanita_options (
            id, name, additional_price_cents, always_charge, is_active, display_order
          )
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (legacy.error || !legacy.data) {
    console.error('Error fetching product by slug:', legacy.error);
    return { product: null, schemaReady: false };
  }

  return { product: legacy.data as unknown as DbProduct, schemaReady: false };
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const { product } = await loadProductBySlugWithFallback(slug);
  if (!product) return null;

  const productStatus = normalizeStatus(product.status, product.is_active);

  const optionGroups: CatalogOptionGroup[] = (product.zanita_product_option_groups || [])
    .map((pog) => {
      const group = pog.zanita_option_groups;
      if (!group) return null;

      const activeOptions = (group.zanita_options || [])
        .sort((a: DbOption, b: DbOption) => a.display_order - b.display_order)
        .filter((opt: DbOption) => opt.is_active)
        .map((opt: DbOption) => ({
          id: opt.id,
          name: opt.name,
          additionalPriceCents: opt.additional_price_cents,
          alwaysCharge: opt.always_charge,
          isAvailable: effectiveAvailability(
            opt.status,
            opt.is_available,
            opt.scheduled_reactivation_at,
            opt.is_active
          ),
          status: normalizeOptionStatus(opt.status, opt.is_active),
        }));

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        isRequired: pog.is_required,
        minSelections: pog.min_selections,
        maxSelections: pog.max_selections,
        includedSelections: pog.included_selections,
        allowRepeats: pog.allow_repeats,
        options: activeOptions,
      };
    })
    .filter(Boolean) as CatalogOptionGroup[];

  optionGroups.sort((a, b) => {
    const groups = product.zanita_product_option_groups || [];
    const indexA = groups.findIndex((pog) => pog.zanita_option_groups?.id === a.id);
    const indexB = groups.findIndex((pog) => pog.zanita_option_groups?.id === b.id);
    return (groups[indexA]?.display_order || 0) - (groups[indexB]?.display_order || 0);
  });

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    price: product.base_price_cents / 100,
    category: product.category,
    categoryLabel: product.category_label,
    customizationNote: product.customization_note,
    featured: product.featured,
    colorAccent: product.color_accent,
    photoSrc: product.photo_src,
    isAvailable: effectiveAvailability(
      product.status,
      product.is_available,
      product.scheduled_reactivation_at,
      product.is_active
    ),
    status: productStatus,
    scheduledReactivationAt: product.scheduled_reactivation_at ?? null,
    optionGroups,
  };
}
