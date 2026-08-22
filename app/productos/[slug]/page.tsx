'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MOCK_PRODUCTS } from '@/data/products';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { ProductCard } from '@/components/store/ProductCard';
import { ArrowLeft, MessageSquare, Clock, MapPin, Info } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const product = MOCK_PRODUCTS.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif font-bold text-3xl text-[#1F1B12]">Producto No Encontrado</h1>
        <p className="text-sm text-[#57413F]">
          El producto que buscas no está disponible en nuestro catálogo.
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

  const whatsappInquiryUrl = `https://wa.me/526647546738?text=${encodeURIComponent(
    `Hola Zanita, quiero información sobre el producto ${product.name} ($${product.price} MXN).`
  )}`;

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
              category={product.categoryLabel.toUpperCase()}
              colorAccent={product.colorAccent}
              aspectRatio="square"
              className="shadow-md border-2 border-[#DEC0BC]/50"
            />
            <div className="mt-4 flex items-center justify-between text-xs text-[#8B716E] px-1">
              <span>Negocio Local en Tijuana</span>
              <span className="font-bold text-[#87201D]">Preparación Bajo Pedido</span>
            </div>
          </div>
        </div>

        {/* Right Column: Product Specs */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#87201D] bg-[#87201D]/10 px-3 py-1 rounded-full uppercase tracking-wider">
                {product.categoryLabel}
              </span>
              <span className="text-xs font-bold text-[#4F7942] bg-[#4F7942]/10 px-3 py-1 rounded-full">
                3 Días de Anticipación
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
            </div>
          </div>

          <p className="text-sm text-[#57413F] leading-relaxed border-t border-b border-[#DEC0BC]/30 py-4">
            {product.description}
          </p>

          {/* Customization Note */}
          <div className="bg-[#FCF2E3] p-5 rounded-lg border border-[#DEC0BC]/40 space-y-2">
            <div className="flex items-center gap-2 text-[#832709] font-bold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>Personalización & Toppings</span>
            </div>
            <p className="text-xs text-[#57413F] italic">
              {product.customizationNote || 'Opciones por confirmar'}
            </p>
          </div>

          {/* WhatsApp Direct Order CTA */}
          <div className="space-y-4 pt-2">
            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-md font-bold text-sm bg-[#4F7942] text-white hover:bg-[#3d5e33] transition-colors shadow-md"
            >
              <MessageSquare className="w-5 h-5 fill-current" />
              <span>Pedir este producto por WhatsApp</span>
            </a>
            <p className="text-center text-xs text-[#8B716E]">
              Los pedidos se coordinan directamente por WhatsApp con 3 días de anticipación.
            </p>
          </div>

          {/* Delivery & Schedule Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#DEC0BC]/30 text-xs text-[#57413F]">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-[#87201D] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#1F1B12]">Tiempo de Elaboración</strong>
                <span>Mínimo 3 días de anticipación</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#832709] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#1F1B12]">Entrega / Pickup</strong>
                <span>Pickup en CETYS o envío con costo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="pt-12 border-t border-[#DEC0BC]/40 space-y-8">
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-[#1F1B12]">
          Otros productos sugeridos
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
