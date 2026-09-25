'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { items, itemCount, subtotal, isHydrated, updateQuantity, removeItem, clearCart } = useCart();

  if (!isHydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-[#6E564F] text-sm">Cargando carrito...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-[#FFF9F2] rounded-full flex items-center justify-center border border-[#E4D5C1]">
          <ShoppingBag className="w-8 h-8 text-[#A73832]" />
        </div>
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#261C19]">Tu carrito</h1>
        <p className="text-sm md:text-base text-[#6E564F]">Tu carrito está vacío.</p>
        <div className="pt-4">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-md bg-[#A73832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#8e2e28] transition-colors shadow-2xs"
          >
            <span>Ver productos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#261C19]">Tu carrito</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (window.confirm('¿Quieres vaciar tu carrito?')) {
                clearCart();
              }
            }}
            className="text-xs font-bold text-[#6E564F] hover:text-[#A73832] transition-colors underline decoration-[#E4D5C1] hover:decoration-[#A73832] underline-offset-4"
          >
            Vaciar carrito
          </button>
          <span className="text-sm font-bold text-[#A73832] bg-[#FFF9F2] px-3 py-1 rounded-full border border-[#E4D5C1]">
            {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div key={item.lineId} className="flex gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs">
              {/* Product Image */}
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1] shrink-0 overflow-hidden flex items-center justify-center">
                {item.photoSrc ? (
                  <Image src={item.photoSrc} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 96px, 128px" />
                ) : (
                  <span className="text-[10px] font-bold text-[#6E564F]/50">FOTO AQUÍ</span>
                )}
              </div>

              {/* Product Details & Controls */}
              <div className="flex flex-col justify-between flex-1 py-1">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <Link href={`/productos/${item.slug}`} className="font-serif font-bold text-lg md:text-xl text-[#261C19] hover:text-[#A73832] transition-colors">
                      {item.name}
                    </Link>
                    <p className="text-sm text-[#A73832] font-bold mt-1">${item.unitPrice} MXN</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.lineId)}
                    className="p-2 text-[#6E564F] hover:text-[#A73832] hover:bg-[#FFF9F2] rounded-md transition-colors"
                    aria-label={`Eliminar ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4">
                  {/* Quantity Selector */}
                  <div className="flex items-center border border-[#E4D5C1] rounded-lg overflow-hidden bg-[#FFF9F2]">
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-2 md:p-2.5 text-[#A73832] hover:bg-[#E4D5C1]/30 disabled:opacity-50 transition-colors"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <span className="w-8 md:w-10 text-center text-xs md:text-sm font-bold text-[#261C19]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                      className="p-2 md:p-2.5 text-[#A73832] hover:bg-[#E4D5C1]/30 transition-colors"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>

                  <p className="font-bold text-[#261C19] text-base md:text-lg">
                    ${item.unitPrice * item.quantity} <span className="text-xs font-normal text-[#6E564F]">MXN</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-6 sticky top-28">
          <h2 className="font-serif font-bold text-xl text-[#261C19]">Resumen</h2>

          <div className="space-y-4 text-sm text-[#6E564F] border-b border-[#E4D5C1] pb-6">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-[#261C19]">${subtotal} MXN</span>
            </div>
            <div className="flex justify-between">
              <span>Costo de envío</span>
              <span className="italic">Por definir</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-lg">
            <span className="font-bold text-[#261C19]">Total estimado</span>
            <span className="font-serif font-bold text-2xl text-[#A73832]">${subtotal} MXN</span>
          </div>

          <p className="text-[11px] text-[#6E564F] leading-tight text-center italic">
            El costo de entrega se definirá al finalizar tu pedido. Precios representativos para presentación del carrito.
          </p>

          <div className="space-y-3 pt-2">
            <button
              disabled
              className="w-full px-6 py-3.5 rounded-md bg-[#A73832] text-white text-xs font-bold uppercase tracking-wider opacity-60 cursor-not-allowed shadow-2xs"
            >
              Continuar con mi pedido
            </button>
            <p className="text-[11px] text-[#A73832] text-center font-bold">
              El checkout estará disponible en el siguiente paso.
            </p>

            <Link
              href="/productos"
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-md border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
