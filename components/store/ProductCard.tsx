'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/data/products';
import { SITE_CONFIG } from '@/config/site';
import { ArrowRight, MessageSquare } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  photoSrc?: string;
}

// Category background palette and abstract decoration style for editorial cards
const getCategoryCardStyle = (product: Product) => {
  if (product.slug === 'manzanita-verde') {
    return {
      bg: 'bg-gradient-to-br from-[#FFF9F2] via-[#4F7942]/15 to-[#F5EBDC]',
      pillBg: 'bg-[#4F7942]/10 text-[#4F7942] border-[#4F7942]/20',
      showApple: false,
      cornerElement: null,
      abstractBadge: 'Verde Gala',
    };
  }
  if (product.slug === 'manzanita-roja-gala') {
    return {
      bg: 'bg-gradient-to-br from-[#FFF9F2] via-[#A73832]/15 to-[#F5EBDC]',
      pillBg: 'bg-[#A73832]/10 text-[#A73832] border-[#A73832]/20',
      showApple: true,
      cornerElement: '/brand/elements/chilli-apple.webp',
      abstractBadge: 'Roja Gala',
    };
  }

  switch (product.category) {
    case 'combos':
      return {
        bg: 'bg-gradient-to-br from-[#FFF9F2] via-[#F09CA9]/25 to-[#F5EBDC]',
        pillBg: 'bg-[#F09CA9]/30 text-[#A73832] border-[#F09CA9]/40',
        showApple: false,
        cornerElement: null,
        abstractBadge: 'Combo',
      };
    case 'charolas':
      return {
        bg: 'bg-gradient-to-br from-[#FFF9F2] via-[#D46240]/15 to-[#F5EBDC]',
        pillBg: 'bg-[#D46240]/10 text-[#D46240] border-[#D46240]/20',
        showApple: false,
        cornerElement: '/brand/elements/gummy-ring-red.webp',
        abstractBadge: 'Charola',
      };
    case 'uvas':
      return {
        bg: 'bg-gradient-to-br from-[#FFF9F2] via-[#4F7942]/15 to-[#F5EBDC]',
        pillBg: 'bg-[#4F7942]/10 text-[#4F7942] border-[#4F7942]/20',
        showApple: false,
        cornerElement: '/brand/elements/grapes-green.webp',
        abstractBadge: 'Uvas',
      };
    case 'snacks':
    default:
      return {
        bg: 'bg-gradient-to-br from-[#FFF9F2] via-[#F09CA9]/20 to-[#F5EBDC]',
        pillBg: 'bg-[#A73832]/10 text-[#A73832] border-[#A73832]/20',
        showApple: false,
        cornerElement: null,
        abstractBadge: 'Snack',
      };
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, photoSrc }) => {
  const cardStyle = getCategoryCardStyle(product);

  return (
    <div className="group bg-white rounded-2xl border border-[#E4D5C1] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-[#F09CA9]">
      {/* Product Card Top Media Container */}
      <div className={`relative aspect-4/3 ${cardStyle.bg} p-6 flex flex-col justify-between overflow-hidden`}>
        {/* Category Pill */}
        <div className="flex items-center justify-between z-10">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cardStyle.pillBg}`}>
            {product.categoryLabel}
          </span>
        </div>

        {/* Media Content: Either Real Photo or Editorial Abstract Brand Card */}
        {photoSrc ? (
          <div className="relative w-full h-full my-auto transition-transform duration-300 group-hover:scale-105">
            <Image
              src={photoSrc}
              alt={product.name}
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 640px) 100vw, 320px"
            />
          </div>
        ) : (
          <div className="my-auto z-10 space-y-1">
            <span className="font-serif italic text-xs text-[#6E564F] block">Zanita Tijuana</span>
            <h4 className="font-serif font-bold text-2xl text-[#261C19] leading-tight group-hover:text-[#A73832] transition-colors">
              {product.name}
            </h4>
          </div>
        )}

        {/* Abstract Circular Graphic Motif in Card Background */}
        {!photoSrc && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-[#E4D5C1]/50 bg-white/30 pointer-events-none" />
        )}

        {/* Corner Decorative Element (Only for Gala, Charolas, Uvas) */}
        {!photoSrc && cardStyle.cornerElement && (
          <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none">
            <Image
              src={cardStyle.cornerElement}
              alt=""
              fill
              className="object-contain"
              sizes="64px"
            />
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-serif font-bold text-lg text-[#261C19] group-hover:text-[#A73832] transition-colors leading-tight">
            {product.name}
          </h3>
          <p className="text-xs text-[#6E564F] leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Price & Actions */}
        <div className="pt-3 border-t border-[#E4D5C1]/50 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#6E564F] block">Precio</span>
            <span className="font-serif font-bold text-xl text-[#A73832]">
              ${product.price} <span className="text-xs font-sans font-normal text-[#6E564F]">MXN</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${SITE_CONFIG.whatsapp.url}?text=Hola%20Zanita%2C%20quiero%20informaci%C3%B3n%20sobre%20el%20producto%20${encodeURIComponent(product.name)}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-colors"
              title="Pedir por WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current text-[#4F7942]" />
            </a>

            <Link
              href={`/productos/${product.slug}`}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-[#A73832] text-white hover:bg-[#8e2e28] transition-colors"
            >
              <span>Ver</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
