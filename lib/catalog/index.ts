import { createClient } from '@/lib/supabase/server';

export interface CatalogOption {
  id: string;
  name: string;
  additionalPriceCents: number;
  alwaysCharge: boolean;
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
  optionGroups: CatalogOptionGroup[];
}


type DbOption = {
  id: string;
  name: string;
  additional_price_cents: number;
  always_charge: boolean;
  is_active: boolean;
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

export async function getProducts(): Promise<CatalogProduct[]> {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('zanita_products')
    .select(`
      id, slug, name, tagline, description, base_price_cents, category, category_label, customization_note, featured, color_accent, photo_src
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return products.map(p => ({
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
    optionGroups: []
  }));
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('zanita_products')
    .select(`
      id, slug, name, tagline, description, base_price_cents, category, category_label, customization_note, featured, color_accent, photo_src,
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

  if (error || !product) {
    console.error('Error fetching product by slug:', error);
    return null;
  }

  const optionGroups: CatalogOptionGroup[] = (product.zanita_product_option_groups as unknown as DbProductOptionGroup[])
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
          alwaysCharge: opt.always_charge
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
        options: activeOptions
      };
    })
    .filter(Boolean) as CatalogOptionGroup[];

  optionGroups.sort((a, b) => {
    const indexA = (product.zanita_product_option_groups as unknown as DbProductOptionGroup[]).findIndex(pog => pog.zanita_option_groups?.id === a.id);
    const indexB = (product.zanita_product_option_groups as unknown as DbProductOptionGroup[]).findIndex(pog => pog.zanita_option_groups?.id === b.id);
    const pogA = (product.zanita_product_option_groups as unknown as DbProductOptionGroup[])[indexA];
    const pogB = (product.zanita_product_option_groups as unknown as DbProductOptionGroup[])[indexB];
    return (pogA?.display_order || 0) - (pogB?.display_order || 0);
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
    optionGroups
  };
}
