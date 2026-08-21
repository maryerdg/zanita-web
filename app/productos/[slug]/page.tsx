'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MOCK_PRODUCTS } from '@/data/products';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { SpiceBadge } from '@/components/ui/SpiceBadge';
import { ProductCard } from '@/components/store/ProductCard';
import { ShoppingBag, ArrowLeft, Check } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const product = MOCK_PRODUCTS.find((p) => p.slug === slug);

  const [selectedWeight, setSelectedWeight] = useState<string>(
    product?.weightOptions?.[0] || '250g'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [added, setAdded] = useState<boolean>(false);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif font-bold text-3xl text-[#1F1B12]">Producto No Encontrado</h1>
        <p className="text-sm text-[#57413F]">
          El snack que buscas no está disponible o el enlace no existe.
        </p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#87201D] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>
    );
  }

  const relatedProducts = MOCK_PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 3);

  const handleAddToCart = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumb / Back button */}
      <div>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#87201D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Image Placeholder */}
        <div className="lg:col-span-6 space-y-4">
          <div className="sticky top-28">
            <PlaceholderImage
              title={product.name}
              category={product.category.toUpperCase()}
              colorAccent={product.colorAccent}
              aspectRatio="square"
              className="shadow-md border-2 border-[#DEC0BC]/50"
            />
            <div className="mt-4 flex items-center justify-between text-xs text-[#8B716E] px-1">
              <span>Garantía de Frescura Zanita</span>
              <span className="font-bold text-[#87201D]">Empaque Hermético Reutilizable</span>
            </div>
          </div>
        </div>

        {/* Right Column: Product Specs & Options */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <SpiceBadge level={product.spiceLevel} name={product.spiceName} />
              <span className="text-xs font-bold text-[#4F7942] bg-[#4F7942]/10 px-2.5 py-0.5 rounded-full">
                100% Artesanal
              </span>
            </div>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#1F1B12] leading-tight">
              {product.name}
            </h1>

            <p className="text-sm font-semibold text-[#832709]">
              {product.tagline}
            </p>

            <div className="pt-3 flex items-baseline gap-3">
              <span className="font-serif font-bold text-3xl text-[#87201D]">
                ${product.price} MXN
              </span>
              {product.originalPrice && (
                <span className="text-sm text-[#8B716E] line-through">
                  ${product.originalPrice} MXN
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-[#57413F] leading-relaxed border-t border-b border-[#DEC0BC]/30 py-4">
            {product.description}
          </p>

          {/* Flavor Notes */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B716E] block">
              Notas de CATA / Perfil de Sabor
            </span>
            <div className="flex flex-wrap gap-2">
              {product.flavorNotes.map((note, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-[#F7EDDE] text-[#1F1B12] border border-[#DEC0BC]/40"
                >
                  ✨ {note}
                </span>
              ))}
            </div>
          </div>

          {/* Weight Presentation Selector */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B716E] block">
              Presentación (Gramos)
            </span>
            <div className="flex flex-wrap gap-3">
              {product.weightOptions.map((weight) => (
                <button
                  key={weight}
                  onClick={() => setSelectedWeight(weight)}
                  className={`px-5 py-2.5 text-xs font-bold rounded-md border transition-all ${
                    selectedWeight === weight
                      ? 'bg-[#87201D] text-white border-[#87201D] shadow-xs'
                      : 'bg-[#FFF8F1] text-[#1F1B12] border-[#DEC0BC] hover:bg-[#F7EDDE]'
                  }`}
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity and CTA */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-[#DEC0BC] rounded-md bg-[#FFF8F1]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-sm font-bold text-[#1F1B12] hover:bg-[#F7EDDE]"
                >
                  -
                </button>
                <span className="px-4 text-sm font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 text-sm font-bold text-[#1F1B12] hover:bg-[#F7EDDE]"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-md font-bold text-sm transition-colors shadow-md ${
                  added
                    ? 'bg-[#4F7942] text-white'
                    : 'bg-[#87201D] text-white hover:bg-[#A73832]'
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>¡Agregado al Pedido!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    <span>Agregar al Pedido ({selectedWeight})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ingredients list */}
          <div className="bg-[#FCF2E3] p-5 rounded-lg border border-[#DEC0BC]/40 space-y-2">
            <h3 className="font-serif font-bold text-sm text-[#1F1B12]">Ingredientes Naturales</h3>
            <ul className="grid grid-cols-2 gap-2 text-xs text-[#57413F]">
              {product.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#87201D]" />
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="pt-12 border-t border-[#DEC0BC]/40 space-y-8">
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-[#1F1B12]">
          También te puede gustar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {relatedProducts.map((relProduct) => (
            <ProductCard key={relProduct.id} product={relProduct} />
          ))}
        </div>
      </div>
    </div>
  );
}
