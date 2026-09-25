'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CatalogProduct } from '@/lib/catalog';
import { ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: CatalogProduct;
  photoSrc?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, photoSrc }) => {
  const activePhoto = photoSrc || product.photoSrc;

  return (
    <div className="group bg-white rounded-xl sm:rounded-2xl border border-[#E4D5C1] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-[#F09CA9]">
      {/* 1. Entire Top 4:5 Container Functions as Single Clean Placeholder */}
      <div className={`relative aspect-[4/5] overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 text-center ${
        activePhoto ? 'bg-[#FFF9F2]' : 'bg-[#FFF9F2] border-b-2 border-dashed border-[#E4D5C1]'
      }`}>
        {/* Category Badge - Absolute in Top Left Corner */}
        <div className="absolute top-2 left-2 sm:top-3.5 sm:left-3.5 z-10">
          <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide sm:tracking-wider px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/80 backdrop-blur-xs text-[#A73832] border border-[#A73832]/20 shadow-2xs">
            {product.categoryLabel}
          </span>
        </div>

        {/* Media Content: Real Photo (object-cover) OR Direct Centered "FOTO AQUÍ" Text */}
        {activePhoto ? (
          <Image
            src={activePhoto}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 519px) 50vw, (max-width: 639px) 33vw, (max-width: 1279px) 25vw, 320px"
          />
        ) : (
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#6E564F]/60 select-none">
            FOTO AQUÍ
          </span>
        )}
      </div>

      {/* Content Body */}
      <div className="p-2 sm:p-3 lg:p-5 flex-1 flex flex-col justify-between gap-1.5 sm:gap-3 lg:gap-4">
        <div className="space-y-0.5 sm:space-y-1 lg:space-y-1.5">
          <h3 className="font-serif font-bold text-[11px] sm:text-xs lg:text-lg leading-tight text-[#261C19] group-hover:text-[#A73832] transition-colors leading-tight">
            {product.name}
          </h3>
          <p className="text-[9px] sm:text-[10px] lg:text-xs text-[#6E564F] leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Price & Actions */}
        <div className="pt-1.5 sm:pt-2 lg:pt-3 border-t border-[#E4D5C1]/50 flex items-end justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[9px] lg:text-[10px] uppercase tracking-wider text-[#6E564F] block">Precio</span>
            <span className="font-serif font-bold text-[13px] sm:text-base lg:text-xl leading-none text-[#A73832] whitespace-nowrap">
              ${product.price} <span className="hidden lg:inline text-xs font-sans font-normal text-[#6E564F]">MXN</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={`/productos/${product.slug}`}
              className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 lg:py-2 min-h-[32px] sm:min-h-[36px] lg:min-h-[40px] text-[9px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wide sm:tracking-wider rounded-md bg-[#A73832] text-white hover:bg-[#8e2e28] transition-colors w-full justify-center"
              aria-label={`Ver ${product.name}`}
            >
              <span>Ver</span>
              <ArrowRight className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
