/**
 * lib/catalog/presentation.ts
 *
 * Presentation layer for catalog and product displays.
 * Unifies sibling products (such as Combo 6 and Combo 12) visually into a single
 * catalog experience without modifying database schema, seed, pricing, or cart logic.
 */

import type { CatalogProduct } from '@/lib/catalog';

// ---------------------------------------------------------------------------
// Combos Presentation Config
// ---------------------------------------------------------------------------

export const COMBO_SLUGS = [
  'combo-6-manzanitas-chamoy-jumbo',
  'combo-12-manzanitas-chamoy-jumbo',
] as const;

export type ComboSlug = (typeof COMBO_SLUGS)[number];

export const COMBO_ENTRY_SLUG: ComboSlug = 'combo-6-manzanitas-chamoy-jumbo';

export interface ComboSizeOption {
  size: number;
  slug: ComboSlug;
  label: string;
  longLabel: string;
  price: number;
}

export const COMBO_METADATA = {
  name: 'Combo de Manzanitas',
  description: '6 o 12 manzanitas + Chamoy Jumbo.',
  detailDescription: 'Arma tu combo con manzanitas verdes, rojas o mixtas.',
  priceDisplay: 'Desde $310 MXN',
  basePrice: 310,
  category: 'combos',
  categoryLabel: 'Combos & Paquetes',
  sizes: [
    {
      size: 6,
      slug: 'combo-6-manzanitas-chamoy-jumbo' as ComboSlug,
      label: '6 manzanitas · $310',
      longLabel: '6 manzanitas + Chamoy Jumbo',
      price: 310,
    },
    {
      size: 12,
      slug: 'combo-12-manzanitas-chamoy-jumbo' as ComboSlug,
      label: '12 manzanitas · $600',
      longLabel: '12 manzanitas + Chamoy Jumbo',
      price: 600,
    },
  ] as ComboSizeOption[],
  splitImages: {
    leftSrc: '/products/manzanita-verde.webp',
    leftAlt: 'Manzanita Verde',
    rightSrc: '/products/manzanita-roja-gala.webp',
    rightAlt: 'Manzanita Roja Gala',
    alt: 'Combo de manzanitas verdes y rojas',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether a given slug belongs to the unified combo family.
 */
export function isComboSlug(slug: string): slug is ComboSlug {
  return COMBO_SLUGS.includes(slug as ComboSlug);
}

/**
 * Checks whether a product belongs to the unified combo family.
 */
export function isComboProduct(product: { slug: string }): boolean {
  return isComboSlug(product.slug);
}

export interface CardPresentation {
  title: string;
  description: string;
  pricePrefix: string;
  priceValue: number;
  priceDisplay: string;
  isSplitImage: boolean;
  href: string;
  categoryLabel: string;
  photoSrc: string | null;
}

/**
 * Derives visual presentation properties for a ProductCard.
 * Combos are mapped to the unified card data, while all other products preserve their standard fields.
 */
export function getCardPresentation(product: CatalogProduct): CardPresentation {
  if (isComboProduct(product)) {
    return {
      title: COMBO_METADATA.name,
      description: COMBO_METADATA.description,
      pricePrefix: 'Desde',
      priceValue: COMBO_METADATA.basePrice,
      priceDisplay: COMBO_METADATA.priceDisplay,
      isSplitImage: true,
      href: `/productos/${COMBO_ENTRY_SLUG}`,
      categoryLabel: COMBO_METADATA.categoryLabel,
      photoSrc: null,
    };
  }

  return {
    title: product.name,
    description: product.description || '',
    pricePrefix: 'Precio',
    priceValue: product.price,
    priceDisplay: `$${product.price} MXN`,
    isSplitImage: false,
    href: `/productos/${product.slug}`,
    categoryLabel: product.categoryLabel,
    photoSrc: product.photoSrc,
  };
}

/**
 * Filters the product list for catalog display.
 * When multiple combos exist in the dataset, only the primary entry product (Combo 6)
 * is displayed so it appears as a single unified card in the catalog grid.
 */
export function getDisplayCatalogProducts(products: CatalogProduct[]): CatalogProduct[] {
  return products.filter((p) => {
    // Hide secondary combo from catalog card list
    if (p.slug === 'combo-12-manzanitas-chamoy-jumbo') {
      return false;
    }
    return true;
  });
}

/**
 * Computes related products for a product detail page, ensuring:
 * 1. When viewing a combo, the sibling combo is never shown redundantly.
 * 2. When viewing non-combos, combos are collapsed so at most one combo card appears.
 */
export function getRelatedProducts(
  allProducts: CatalogProduct[],
  currentProduct: CatalogProduct,
  limit = 3
): { products: CatalogProduct[]; sectionTitle: string } {
  const isCurrentCombo = isComboProduct(currentProduct);

  if (isCurrentCombo) {
    // Exclude all combos to avoid showing the sibling combo
    const otherProducts = allProducts.filter((p) => !isComboProduct(p));
    return {
      products: otherProducts.slice(0, limit),
      sectionTitle: 'Otros Productos de Nuestro Menú',
    };
  }

  // Non-combo product: Try same category first, collapsed
  const sameCategory = allProducts.filter(
    (p) => p.id !== currentProduct.id && p.category === currentProduct.category
  );

  const displaySameCategory = getDisplayCatalogProducts(sameCategory);

  if (displaySameCategory.length > 0) {
    return {
      products: displaySameCategory.slice(0, limit),
      sectionTitle: 'Más Productos de la Categoría',
    };
  }

  // Fallback to other categories
  const fallback = allProducts.filter((p) => p.id !== currentProduct.id);
  const displayFallback = getDisplayCatalogProducts(fallback);

  return {
    products: displayFallback.slice(0, limit),
    sectionTitle: 'Más Productos de la Categoría',
  };
}
