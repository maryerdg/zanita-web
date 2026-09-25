'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Minus, ShoppingBag, Check, MessageSquare } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { SITE_CONFIG } from '@/config/site';

interface AddToCartControlsProps {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    photoSrc?: string;
  };
}

export function AddToCartControls({ product }: AddToCartControlsProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPrice: product.price,
      quantity,
      photoSrc: product.photoSrc
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

  return (
    <div className="pt-2 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Quantity Selector */}
        <div className="flex items-center border border-[#A73832] rounded-md overflow-hidden bg-white shrink-0">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="p-3 md:p-4 text-[#A73832] hover:bg-[#F5EBDC] disabled:opacity-50 transition-colors"
            aria-label="Disminuir cantidad"
          >
            <Minus className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <span className="w-12 md:w-16 text-center text-sm md:text-base font-bold text-[#261C19]">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            className="p-3 md:p-4 text-[#A73832] hover:bg-[#F5EBDC] transition-colors"
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Primary Add CTA */}
        <button
          onClick={handleAddToCart}
          disabled={justAdded}
          className={`flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-md text-white transition-all text-xs font-bold uppercase tracking-wider shadow-2xs ${
            justAdded ? 'bg-[#4F7942]' : 'bg-[#A73832] hover:bg-[#8e2e28]'
          }`}
          aria-label={`Agregar ${product.name} al carrito`}
        >
          {justAdded ? (
            <>
              <Check className="w-4.5 h-4.5" />
              <span>¡Agregado al carrito!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>Agregar al carrito</span>
            </>
          )}
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E4D5C1]">
        <Link
          href="/carrito"
          className="text-sm font-bold text-[#A73832] hover:underline"
          aria-label="Ver carrito"
        >
          Ver carrito
        </Link>

        <a
          href={`${SITE_CONFIG.whatsapp.url}?text=Hola%20Zanita%2C%20tengo%20una%20duda%20sobre%20${encodeURIComponent(product.name)}.`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-[#6E564F] hover:text-[#A73832] transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>¿Dudas? Contáctanos por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
