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

export const ProductCard: React.FC<ProductCardProps> = ({ product, photoSrc }) => {
  const activePhoto = photoSrc || product.photoSrc;

  return (
    <div className="group bg-white rounded-2xl border border-[#E4D5C1] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-[#F09CA9]">
      {/* 1. Entire Top 4:5 Container Functions as Single Clean Placeholder */}
      <div className={`relative aspect-[4/5] overflow-hidden flex flex-col items-center justify-center p-4 text-center ${
        activePhoto ? 'bg-[#FFF9F2]' : 'bg-[#FFF9F2] border-b-2 border-dashed border-[#E4D5C1]'
      }`}>
        {/* Category Badge - Absolute in Top Left Corner */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-xs text-[#A73832] border border-[#A73832]/20 shadow-2xs">
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
            sizes="(max-width: 640px) 100vw, 320px"
          />
        ) : (
          <span className="text-xs font-bold uppercase tracking-widest text-[#6E564F]/60 select-none">
            FOTO AQUÍ
          </span>
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
