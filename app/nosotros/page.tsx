import React from 'react';
import Link from 'next/link';
import { Flame, Sparkles, Heart, ShieldCheck } from 'lucide-react';

export default function NosotrosPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#87201D]/10 text-[#87201D] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tradición & Pasión por el Picante</span>
        </div>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl text-[#1F1B12]">
          La Historia de Zanita
        </h1>
        <p className="text-base text-[#57413F] leading-relaxed">
          Zanita nació del deseo de redefinir el snack mexicano artesanal: combinando la frescura y dulzura natural de las frutas con el sazón picante de autor.
        </p>
      </div>

      {/* Main Narrative Card */}
      <div className="bg-[#FCF2E3] p-8 md:p-12 rounded-xl border border-[#DEC0BC]/40 space-y-6 leading-relaxed text-[#57413F] text-sm sm:text-base">
        <h2 className="font-serif font-bold text-2xl text-[#87201D]">
          De la cocina familiar a tu mesa
        </h2>
        <p>
          En Zanita creemos que lo picante no debe enmascarar el sabor de la fruta, sino potenciarlo. Seleccionamos cuidadosamente cosechas de mango Kent, manzana verde, piña miel y fresas de temporada, cortándolas en lajas gruesas para mantener su jugo y fibra original.
        </p>
        <p>
          Nuestro proceso de deshidratación lenta a baja temperatura preserva el valor nutricional y crea una textura crujiente única. Posteriormente, cada lote se sazona manualmente con nuestra mezcla de chiles secos (árbol, piquín y habanero ahumado) y chamoy elaborado con flor de Jamaica natural.
        </p>
      </div>

      {/* Grid of Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded-lg bg-[#FFF8F1] border border-[#DEC0BC]/40 space-y-3">
          <Flame className="w-8 h-8 text-[#87201D]" />
          <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Mezcla de Autor</h3>
          <p className="text-xs text-[#57413F]">
            Sin saborizantes ni colorantes artificiales. El color rojo vibrante proviene 100% de nuestros chiles secos.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-[#FFF8F1] border border-[#DEC0BC]/40 space-y-3">
          <Heart className="w-8 h-8 text-[#8E4A56]" />
          <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Pasión Artesanal</h3>
          <p className="text-xs text-[#57413F]">
            Elaboramos lotes pequeños bajo pedido para garantizar la máxima frescura en cada empaque.
          </p>
        </div>

        <div className="p-6 rounded-lg bg-[#FFF8F1] border border-[#DEC0BC]/40 space-y-3">
          <ShieldCheck className="w-8 h-8 text-[#4F7942]" />
          <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Compromiso Local</h3>
          <p className="text-xs text-[#57413F]">
            Trabajamos de la mano con productores locales para promover la agricultura sustentable.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-8">
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-sm bg-[#87201D] text-white font-bold text-sm hover:bg-[#A73832] transition-colors shadow-md"
        >
          <span>Descubrir Nuestros Sabores</span>
        </Link>
      </div>
    </div>
  );
}
