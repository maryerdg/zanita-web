import React from 'react';
import Link from 'next/link';
import { MOCK_PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/store/ProductCard';
import { Flame, Sparkles, ShieldCheck, HeartHandshake, ArrowRight, MapPin } from 'lucide-react';

export default function HomePage() {
  const featuredProducts = MOCK_PRODUCTS.filter((p) => p.featured);

  return (
    <div className="space-y-16 md:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FCF2E3] to-[#FFF8F1] py-16 md:py-24 border-b border-[#DEC0BC]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#87201D]/10 text-[#87201D] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sabor Editorial & Artesanal</span>
              </div>

              <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[#1F1B12] leading-[1.1] tracking-tight">
                El equilibrio perfecto entre <span className="text-[#87201D] italic">fruta fresca</span> y el sazón artesanal.
              </h1>

              <p className="text-base sm:text-lg text-[#57413F] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Lajas de frutas seleccionadas deshidratadas lentamente a baja temperatura, sazonadas con nuestra mezcla secreta de chiles secos, flor de sal y chamoy de la casa.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/productos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold rounded-sm bg-[#87201D] text-white hover:bg-[#A73832] transition-colors shadow-md hover:shadow-lg"
                >
                  <span>Explorar Catálogo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/nosotros"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold rounded-sm bg-[#F7EDDE] text-[#87201D] border border-[#DEC0BC] hover:bg-[#EBE1D2] transition-colors"
                >
                  <span>Conoce el Proceso</span>
                </Link>
              </div>

              {/* Badges bar */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#DEC0BC]/40 max-w-lg mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#87201D]">100%</span>
                  <span className="text-xs text-[#57413F]">Fruta Natural</span>
                </div>
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#87201D]">Sin</span>
                  <span className="text-xs text-[#57413F]">Conservadores</span>
                </div>
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#87201D]">Artesanal</span>
                  <span className="text-xs text-[#57413F]">Lotes Pequeños</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic Component */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-[#F7EDDE] p-8 rounded-2xl border border-[#DEC0BC] shadow-xl text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#87201D] flex items-center justify-center text-white shadow-inner">
                  <Flame className="w-10 h-10 fill-current" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#832709]">
                    Insignia de la Casa
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-[#1F1B12]">
                    Manzanita Verde Enchilada
                  </h2>
                  <p className="text-xs text-[#57413F] leading-relaxed">
                    Crujiente manzana verde marinada en limonada deshidratada con chile piquín y sal de mar.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#DEC0BC]/50 flex items-center justify-between">
                  <span className="font-serif font-bold text-2xl text-[#87201D]">$85 MXN</span>
                  <Link
                    href="/productos/manzanita-verde-enchilada"
                    className="px-4 py-2 text-xs font-bold rounded bg-[#87201D] text-white hover:bg-[#A73832] transition-colors"
                  >
                    Ver Producto
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#87201D] block mb-1">
              Selección Especial
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-[#1F1B12]">
              Favoritos de la Casa
            </h2>
          </div>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#87201D] hover:underline"
          >
            <span>Ver todos los productos</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Values / Why Zanita Section */}
      <section className="bg-[#F7EDDE] py-16 border-y border-[#DEC0BC]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-[#1F1B12]">
              La Filosofía Zanita
            </h2>
            <p className="text-sm text-[#57413F]">
              Cuidamos cada detalle desde la selección del cultivo hasta la entrega en tus manos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FFA9B6]/30 text-[#87201D] flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Deshidratación Lenta</h3>
              <p className="text-xs text-[#57413F] leading-relaxed">
                Conservamos la fructosa natural, textura crujiente y nutrientes de la fruta fresca mediante secado controlado.
              </p>
            </div>

            <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#D46240]/20 text-[#832709] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Chiles 100% Seleccionados</h3>
              <p className="text-xs text-[#57413F] leading-relaxed">
                Tostamos y molemos a piedra nuestros propios chiles secos (árbol, piquín, habanero) sin añadidos artificiales.
              </p>
            </div>

            <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#4F7942]/20 text-[#4F7942] flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Producción Local</h3>
              <p className="text-xs text-[#57413F] leading-relaxed">
                Apoyamos a agricultores locales e impulsamos un modelo de entregas programadas con desperdicio cero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Points Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#87201D] text-white rounded-2xl p-8 md:p-12 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold tracking-wider uppercase text-[#FFCDC8]">
              <MapPin className="w-3.5 h-3.5" />
              <span>Puntos de Entrega Autorizados</span>
            </div>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-white">
              ¿Quieres recoger tus productos sin costo de envío?
            </h2>
            <p className="text-sm text-[#FFCDC8] leading-relaxed">
              Ubica nuestros puntos de distribución asociados en la ciudad para recoger tu pedido recién preparado.
            </p>
          </div>

          <Link
            href="/puntos-de-entrega"
            className="px-8 py-4 text-sm font-bold rounded-sm bg-white text-[#87201D] hover:bg-[#FFF8F1] transition-colors shadow-md whitespace-nowrap"
          >
            Ver Ubicaciones
          </Link>
        </div>
      </section>
    </div>
  );
}
