import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getProductBySlug, getProducts } from '@/lib/catalog';
import { isComboProduct, COMBO_METADATA, getRelatedProducts } from '@/lib/catalog/presentation';
import { ProductCard } from '@/components/store/ProductCard';
import { ComboSplitImage } from '@/components/store/ComboSplitImage';
import { ProductCustomizer } from '@/components/store/ProductCustomizer';
import { ArrowLeft, Clock, MapPin, Sparkles } from 'lucide-react';

export const revalidate = 0;

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <h1 className="font-serif font-bold text-3xl text-[#261C19]">Producto No Encontrado</h1>
        <p className="text-sm text-[#6E564F]">El producto que buscas no existe o ha sido movido.</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#A73832] text-white text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>
    );
  }

  const isCombo = isComboProduct(product);
  const displayName = isCombo ? COMBO_METADATA.name : product.name;
  const displayDescription = isCombo ? COMBO_METADATA.detailDescription : product.description;

  const allProducts = await getProducts();
  const { products: relatedProducts, sectionTitle: relatedTitle } = getRelatedProducts(allProducts, product);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Breadcrumb / Back Link */}
      <div>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A73832] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Product Image */}
        <div className={`relative w-full lg:col-span-6 aspect-square rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8 text-center ${
          isCombo || product.photoSrc
            ? 'bg-[#FFF9F2] border border-[#E4D5C1] shadow-2xs'
            : 'bg-[#FFF9F2] border-2 border-dashed border-[#E4D5C1]'
        }`}>
          {/* Category Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs text-[#A73832] border border-[#A73832]/20 shadow-2xs">
              {product.categoryLabel}
            </span>
          </div>

          {isCombo ? (
            <ComboSplitImage priority sizes="(max-width: 1024px) 100vw, 600px" />
          ) : product.photoSrc ? (
            <Image
              src={product.photoSrc}
              alt={product.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 600px"
            />
          ) : (
            <span className="text-sm sm:text-base font-bold uppercase tracking-widest text-[#6E564F]/60 select-none">
              FOTO AQUÍ
            </span>
          )}
        </div>

        {/* Right Info + Customizer Column */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F09CA9]/25 text-[#A73832] text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preparación Bajo Pedido</span>
            </div>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#261C19]">
              {displayName}
            </h1>
            <p className="text-base text-[#6E564F] leading-relaxed">
              {displayDescription}
            </p>
          </div>

          {/* Price Box */}
          <div className="p-6 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1] flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#6E564F] block">Precio Base</span>
              <span className="font-serif font-bold text-3xl text-[#A73832]">
                ${product.price} <span className="text-sm font-sans font-normal text-[#6E564F]">MXN</span>
              </span>
            </div>
            <div className="text-right text-xs text-[#6E564F]">
              <span className="block font-semibold">Tijuana, B.C.</span>
              <span>Pedidos con mínimo 24 horas de anticipación</span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#E4D5C1] space-y-2">
              <div className="flex items-center gap-2 text-[#A73832] font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>24 Horas de Anticipación</span>
              </div>
              <p className="text-xs text-[#6E564F]">
                Se requiere realizar el pedido con al menos 24 horas de anticipación para organizar la producción.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E4D5C1] space-y-2">
              <div className="flex items-center gap-2 text-[#D46240] font-bold text-xs">
                <MapPin className="w-4 h-4" />
                <span>Entregas & Pickup</span>
              </div>
              <p className="text-xs text-[#6E564F]">
                Consulta los puntos y opciones disponibles al finalizar tu pedido.
              </p>
            </div>
          </div>

          {/* Combo Size Selector — compact, shown before COMPOSICIÓN DE MANZANITAS */}
          {isCombo && (
            <div className="space-y-2.5 p-4 sm:p-5 rounded-2xl bg-[#FFF9F2] border border-[#E4D5C1] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A73832]">
                  Elige tu combo
                </span>
                <span className="text-[11px] text-[#6E564F] font-medium">
                  {product.slug === 'combo-6-manzanitas-chamoy-jumbo' ? '6 piezas seleccionadas' : '12 piezas seleccionadas'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {COMBO_METADATA.sizes.map((sizeOpt) => {
                  const isSelected = sizeOpt.slug === product.slug;

                  if (isSelected) {
                    return (
                      <div
                        key={sizeOpt.slug}
                        className="p-3 sm:p-3.5 rounded-xl border-2 border-[#A73832] bg-white shadow-xs flex flex-col justify-between cursor-default transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-bold text-[#A73832]">
                            {sizeOpt.size} manzanitas
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full bg-[#A73832]" />
                        </div>
                        <span className="text-xs sm:text-sm font-serif font-bold text-[#261C19] mt-1.5">
                          ${sizeOpt.price} <span className="text-[10px] sm:text-xs font-sans font-normal text-[#6E564F]">MXN</span>
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={sizeOpt.slug}
                      href={`/productos/${sizeOpt.slug}`}
                      className="p-3 sm:p-3.5 rounded-xl border border-[#E4D5C1] bg-white/80 hover:bg-white hover:border-[#A73832]/60 hover:shadow-xs transition-all flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium text-[#6E564F] group-hover:text-[#261C19]">
                          {sizeOpt.size} manzanitas
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full border border-[#E4D5C1] group-hover:border-[#A73832]" />
                      </div>
                      <span className="text-xs sm:text-sm font-serif font-bold text-[#6E564F] group-hover:text-[#A73832] mt-1.5">
                        ${sizeOpt.price} <span className="text-[10px] sm:text-xs font-sans font-normal text-[#6E564F]">MXN</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Customizer (Client Component) */}
          <ProductCustomizer
            product={product}
            optionGroups={product.optionGroups}
          />
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="pt-12 border-t border-[#E4D5C1]">
          <h2 className="font-serif font-bold text-2xl text-[#261C19] mb-6">
            {relatedTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedProducts.map((relProd) => (
              <ProductCard key={relProd.id} product={relProd} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
