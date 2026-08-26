'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { SITE_CONFIG } from '@/config/site';
import { MOCK_PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/store/ProductCard';
import { ArrowLeft, MessageSquare, Clock, MapPin, Sparkles } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const product = MOCK_PRODUCTS.find((p) => p.slug === slug);

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

  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category
  ).slice(0, 3);

  const fallbackRelated = relatedProducts.length > 0
    ? relatedProducts
    : MOCK_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

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
        {/* 2. Entire 1:1 Square Container Functions as Single Clean Placeholder */}
        <div className={`relative w-full lg:col-span-6 aspect-square rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8 text-center ${
          product.photoSrc
            ? 'bg-[#FFF9F2] border border-[#E4D5C1] shadow-2xs'
            : 'bg-[#FFF9F2] border-2 border-dashed border-[#E4D5C1]'
        }`}>
          {/* Category Badge - Absolute in Top Left */}
          <div className="absolute top-4 left-4 z-10">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs text-[#A73832] border border-[#A73832]/20 shadow-2xs">
              {product.categoryLabel}
            </span>
          </div>

          {/* Media Content: Real Photo (object-cover) OR Direct Centered "FOTO AQUÍ" Text */}
          {product.photoSrc ? (
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

        {/* Right Info Details Column */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F09CA9]/25 text-[#A73832] text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preparación Bajo Pedido</span>
            </div>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#261C19]">
              {product.name}
            </h1>
            <p className="text-base text-[#6E564F] leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price Box */}
          <div className="p-6 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1] flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#6E564F] block">Precio Total</span>
              <span className="font-serif font-bold text-3xl text-[#A73832]">
                ${product.price} <span className="text-sm font-sans font-normal text-[#6E564F]">MXN</span>
              </span>
            </div>
            <div className="text-right text-xs text-[#6E564F]">
              <span className="block font-semibold">Tijuana, B.C.</span>
              <span>Pedidos con 3 días de anticipación</span>
            </div>
          </div>

          {/* Key Delivery & Notice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#E4D5C1] space-y-2">
              <div className="flex items-center gap-2 text-[#A73832] font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>3 Días de Anticipación</span>
              </div>
              <p className="text-xs text-[#6E564F]">
                Se requiere solicitar con mínimo 3 días para organizar la producción.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E4D5C1] space-y-2">
              <div className="flex items-center gap-2 text-[#D46240] font-bold text-xs">
                <MapPin className="w-4 h-4" />
                <span>Entregas & Pickup</span>
              </div>
              <p className="text-xs text-[#6E564F]">
                Entregas en zonas oficiales (+$30 MXN) y pickup exclusivo en CETYS.
              </p>
            </div>
          </div>

          {/* WhatsApp Primary Order CTA */}
          <div className="pt-2">
            <a
              href={`${SITE_CONFIG.whatsapp.url}?text=Hola%20Zanita%2C%20quiero%20hacer%20un%20pedido%20de%20${encodeURIComponent(product.name)}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-md border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all text-xs font-bold uppercase tracking-wider shadow-2xs"
            >
              <MessageSquare className="w-4.5 h-4.5 fill-current text-[#4F7942]" />
              <span>Pedir {product.name} por WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="pt-12 border-t border-[#E4D5C1]">
        <h2 className="font-serif font-bold text-2xl text-[#261C19] mb-6">
          Más Productos de la Categoría
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {fallbackRelated.map((relProd) => (
            <ProductCard key={relProd.id} product={relProd} />
          ))}
        </div>
      </div>
    </div>
  );
}
