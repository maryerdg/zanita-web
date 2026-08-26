'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { SITE_CONFIG } from '@/config/site';
import { MOCK_PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/store/ProductCard';
import { ArrowLeft, MessageSquare, Clock, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

const getCategoryGraphic = (category: string) => {
  switch (category) {
    case 'manzanas':
      return '/brand/elements/chilli-apple.webp';
    case 'uvas':
      return '/brand/elements/grapes-green.webp';
    case 'charolas':
      return '/brand/elements/gummy-ring-red.webp';
    case 'combos':
      return '/brand/elements/gummy-bear-red.webp';
    case 'snacks':
      return '/brand/elements/worm-gummy.webp';
    default:
      return '/brand/elements/peanut.webp';
  }
};

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

  const elementSrc = getCategoryGraphic(product.category);

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
        {/* Left Image / Graphical Illustration Container */}
        <div className="lg:col-span-6 bg-white p-10 rounded-2xl border border-[#E4D5C1] shadow-2xs flex items-center justify-center relative aspect-square overflow-hidden">
          <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#A73832]/10 text-[#A73832] border border-[#A73832]/20">
            {product.categoryLabel}
          </span>

          <div className="relative w-64 h-64 sm:w-80 sm:h-80">
            <Image
              src={elementSrc}
              alt={product.name}
              fill
              className="object-contain drop-shadow-md"
              priority
              sizes="(max-width: 640px) 256px, 320px"
            />
          </div>
        </div>

        {/* Right Info Details Column */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F09CA9]/25 text-[#A73832] text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preparación Bajo Pedido</span>
            </div>
            <h1 className="font-serif font-bold text-4xl sm:text-5xl text-[#261C19] leading-tight">
              {product.name}
            </h1>
            <p className="text-lg text-[#6E564F] font-serif italic">
              {product.tagline}
            </p>
          </div>

          <div className="p-4 bg-[#FFF9F2] rounded-xl border border-[#E4D5C1] flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#6E564F] block">Precio Oficial</span>
              <span className="font-serif font-bold text-3xl text-[#A73832]">
                ${product.price} <span className="text-sm font-sans font-normal text-[#6E564F]">MXN</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#6E564F] block">Personalización</span>
              <span className="text-xs font-bold text-[#A73832]">{product.customizationNote || 'Opciones por confirmar'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-serif font-bold text-lg text-[#261C19]">Descripción del Producto</h3>
            <p className="text-sm text-[#6E564F] leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Business & Delivery Rules Card */}
          <div className="bg-white p-5 rounded-xl border border-[#E4D5C1] space-y-3 text-xs text-[#6E564F]">
            <div className="flex items-center gap-2 text-[#261C19] font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#4F7942]" />
              <span>Condiciones de Pedido</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#A73832] shrink-0" />
                <span>Solicitar con <strong>3 días de anticipación</strong>.</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D46240] shrink-0" />
                <span>Entregas a domicilio en Tijuana o pickup en CETYS.</span>
              </li>
            </ul>
          </div>

          {/* Primary Action Button */}
          <div>
            <a
              href={`${SITE_CONFIG.whatsapp.url}?text=Hola%20Zanita%2C%20quiero%20hacer%20un%20pedido%20de%3A%20${encodeURIComponent(product.name)}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-md bg-[#4F7942] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3d5e33] transition-colors shadow-md"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Solicitar este producto por WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="pt-12 border-t border-[#E4D5C1] space-y-8">
        <h2 className="font-serif font-bold text-2xl text-[#261C19]">
          También te puede interesar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {fallbackRelated.map((relProduct) => (
            <ProductCard key={relProduct.id} product={relProduct} />
          ))}
        </div>
      </div>
    </div>
  );
}
