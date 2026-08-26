import React from 'react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';
import { Sparkles, MessageSquare, Heart, Clock, UserCheck } from 'lucide-react';

export default function NosotrosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F09CA9]/30 text-[#A73832] text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/50 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Negocio Local en Tijuana</span>
        </div>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl text-[#261C19]">
          Nuestra Historia
        </h1>
      </div>

      {/* Main Confirmed Narrative Card with Subtle Brand Element Decorations */}
      <div className="relative bg-[#FFF9F2] p-8 md:p-12 rounded-3xl border border-[#E4D5C1] space-y-6 text-[#261C19] text-base md:text-lg leading-relaxed font-serif shadow-xs overflow-hidden">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-4 right-4 w-16 h-16 opacity-20 pointer-events-none -rotate-12">
          <Image
            src="/brand/elements/chilli-apple.webp"
            alt=""
            fill
            className="object-contain"
            sizes="64px"
          />
        </div>
        <div className="absolute bottom-4 left-4 w-16 h-16 opacity-20 pointer-events-none rotate-12">
          <Image
            src="/brand/elements/grapes-green.webp"
            alt=""
            fill
            className="object-contain"
            sizes="64px"
          />
        </div>

        <p className="relative z-10 first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-[#A73832] first-letter:mr-2">
          Zanita es un negocio local de Tijuana creado y operado por Ximena. Ella recibe los pedidos, prepara cada producto, lo empaqueta y coordina personalmente su entrega. Cada pedido se trabaja bajo programación para organizar su preparación y entrega.
        </p>
      </div>

      {/* Key Principles Grid - Step 5: Card titles updated to Atención directa, Pedidos programados, Preparado por Ximena */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E4D5C1] space-y-3 shadow-2xs">
          <Heart className="w-7 h-7 text-[#A73832]" />
          <h3 className="font-serif font-bold text-lg text-[#261C19]">Atención Directa</h3>
          <p className="text-xs text-[#6E564F] leading-relaxed">
            Ximena atiende cada solicitud directamente para coordinar los detalles de tu pedido.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E4D5C1] space-y-3 shadow-2xs">
          <Clock className="w-7 h-7 text-[#D46240]" />
          <h3 className="font-serif font-bold text-lg text-[#261C19]">Pedidos Programados</h3>
          <p className="text-xs text-[#6E564F] leading-relaxed">
            Solicitudes con 3 días de anticipación para organizar la preparación de cada entrega.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E4D5C1] space-y-3 shadow-2xs">
          <UserCheck className="w-7 h-7 text-[#4F7942]" />
          <h3 className="font-serif font-bold text-lg text-[#261C19]">Preparado por Ximena</h3>
          <p className="text-xs text-[#6E564F] leading-relaxed">
            Ximena elabora, empaqueta y coordina personalmente la entrega de cada orden.
          </p>
        </div>
      </div>

      {/* CTA WhatsApp - Refined Red/Cream Button */}
      <div className="text-center pt-4">
        <a
          href={SITE_CONFIG.whatsapp.urlWithMessage}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all text-xs font-bold uppercase tracking-wider shadow-2xs"
        >
          <MessageSquare className="w-4 h-4 fill-current text-[#4F7942]" />
          <span>Contactar a Ximena por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
