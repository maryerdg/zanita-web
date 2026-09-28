import React from 'react';
import Image from 'next/image';
import { Sparkles, Clock, UserCheck } from 'lucide-react';

export default function NosotrosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F09CA9]/30 text-[#A73832] text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/50 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Negocio Local en Tijuana</span>
        </div>
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#261C19]">
          Nuestra Historia
        </h1>
      </div>

      {/* Main Narrative Card */}
      <div className="relative bg-[#FFF9F2] p-6 md:p-8 rounded-2xl border border-[#E4D5C1] text-[#261C19] text-sm md:text-base leading-relaxed font-serif shadow-xs overflow-hidden">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-4 right-4 w-12 h-12 opacity-20 pointer-events-none -rotate-12">
          <Image
            src="/brand/elements/chilli-apple.webp"
            alt=""
            fill
            className="object-contain"
            sizes="48px"
          />
        </div>
        <div className="absolute bottom-4 left-4 w-12 h-12 opacity-20 pointer-events-none rotate-12">
          <Image
            src="/brand/elements/grapes-green.webp"
            alt=""
            fill
            className="object-contain"
            sizes="48px"
          />
        </div>

        <p className="relative z-10 first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:text-[#A73832] first-letter:mr-1.5">
          Zanita es un negocio local de Tijuana creado y operado por Ximena. Cada producto se prepara bajo pedido y cada entrega se coordina de forma programada para cuidar la preparación de cada orden.
        </p>
      </div>

      {/* Key Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
        <div className="p-5 rounded-2xl bg-white border border-[#E4D5C1] space-y-2.5 shadow-2xs text-center md:text-left">
          <Clock className="w-6 h-6 text-[#D46240] mx-auto md:mx-0" />
          <h3 className="font-serif font-bold text-base text-[#261C19]">Pedidos Programados</h3>
          <p className="text-xs text-[#6E564F] leading-relaxed">
            Los pedidos se realizan con mínimo 24 horas de anticipación para organizar la preparación y entrega de cada orden.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E4D5C1] space-y-2.5 shadow-2xs text-center md:text-left">
          <UserCheck className="w-6 h-6 text-[#4F7942] mx-auto md:mx-0" />
          <h3 className="font-serif font-bold text-base text-[#261C19]">Preparado por Ximena</h3>
          <p className="text-xs text-[#6E564F] leading-relaxed">
            Ximena prepara, empaca y coordina personalmente cada pedido de Zanita.
          </p>
        </div>
      </div>
    </div>
  );
}
