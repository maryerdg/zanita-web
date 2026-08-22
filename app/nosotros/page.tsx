import React from 'react';
import { SITE_CONFIG } from '@/config/site';
import { Sparkles, MessageSquare, Heart, Clock, UserCheck } from 'lucide-react';

export default function NosotrosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#87201D]/10 text-[#87201D] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Negocio Local en Tijuana</span>
        </div>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl text-[#1F1B12]">
          Nuestra Historia
        </h1>
      </div>

      {/* Main Confirmed Narrative Card */}
      <div className="bg-[#FCF2E3] p-8 md:p-12 rounded-xl border border-[#DEC0BC]/40 space-y-6 text-[#1F1B12] text-base md:text-lg leading-relaxed font-serif shadow-xs">
        <p className="first-letter:text-4xl first-letter:font-bold first-letter:text-[#87201D] first-letter:mr-1">
          Zanita es un negocio local de Tijuana creado y operado por Ximena. Ella recibe los pedidos, prepara cada producto, lo empaqueta y coordina personalmente su entrega. Cada pedido se trabaja bajo programación para mantener la calidad y organizar la producción.
        </p>
      </div>

      {/* Key Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg bg-[#FFF8F1] border border-[#DEC0BC]/40 space-y-3">
          <Heart className="w-7 h-7 text-[#87201D]" />
          <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Atención Personal</h3>
          <p className="text-xs text-[#57413F] leading-relaxed">
            Ximena atiende cada solicitud directamente para coordinar los detalles de tu pedido.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-[#FFF8F1] border border-[#DEC0BC]/40 space-y-3">
          <Clock className="w-7 h-7 text-[#832709]" />
          <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Bajo Programación</h3>
          <p className="text-xs text-[#57413F] leading-relaxed">
            Pedidos con 3 días de anticipación para organizar la preparación de cada entrega.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-[#FFF8F1] border border-[#DEC0BC]/40 space-y-3">
          <UserCheck className="w-7 h-7 text-[#4F7942]" />
          <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Preparación Personal</h3>
          <p className="text-xs text-[#57413F] leading-relaxed">
            Ximena prepara, empaqueta y coordina personalmente la entrega de cada orden.
          </p>
        </div>
      </div>

      {/* CTA WhatsApp */}
      <div className="text-center pt-6">
        <a
          href={SITE_CONFIG.whatsapp.urlWithMessage}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-sm bg-[#4F7942] text-white font-bold text-sm hover:bg-[#3d5e33] transition-colors shadow-md"
        >
          <MessageSquare className="w-5 h-5 fill-current" />
          <span>Contactar a Ximena por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
