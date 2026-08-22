import React from 'react';
import Link from 'next/link';
import { SITE_CONFIG } from '@/config/site';
import { MOCK_PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/store/ProductCard';
import { Flame, Sparkles, Clock, Calendar, ArrowRight, MapPin, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const featuredProducts = MOCK_PRODUCTS.filter((p) => p.featured).slice(0, 3);

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
                <span>Negocio Local en Tijuana</span>
              </div>

              <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[#1F1B12] leading-[1.1] tracking-tight">
                Manzanas, uvas, charolas y snacks preparados con <span className="text-[#87201D] italic">chamoy</span>.
              </h1>

              <p className="text-base sm:text-lg text-[#57413F] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Cada pedido se programa con anticipación para organizar su preparación y entrega.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href={SITE_CONFIG.whatsapp.urlWithMessage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold rounded-sm bg-[#4F7942] text-white hover:bg-[#3d5e33] transition-colors shadow-md hover:shadow-lg"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>Pedir por WhatsApp</span>
                </a>
                <Link
                  href="/productos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold rounded-sm bg-[#87201D] text-white hover:bg-[#A73832] transition-colors shadow-md"
                >
                  <span>Explorar Catálogo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Notice Badges Bar */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#DEC0BC]/40 max-w-lg mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#87201D]">3 Días</span>
                  <span className="text-xs text-[#57413F]">Anticipación</span>
                </div>
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#87201D]">Tijuana</span>
                  <span className="text-xs text-[#57413F]">Negocio Local</span>
                </div>
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#87201D]">Artesanal</span>
                  <span className="text-xs text-[#57413F]">Chamoy & Toppings</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-[#F7EDDE] p-8 rounded-2xl border border-[#DEC0BC] shadow-xl text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#87201D] flex items-center justify-center text-white shadow-inner">
                  <Flame className="w-10 h-10 fill-current" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#832709]">
                    Producto Destacado
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-[#1F1B12]">
                    Manzanita Verde
                  </h2>
                  <p className="text-xs text-[#57413F] leading-relaxed">
                    Manzanita verde preparada.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#DEC0BC]/50 flex items-center justify-between">
                  <span className="font-serif font-bold text-2xl text-[#87201D]">$50 MXN</span>
                  <Link
                    href="/productos/manzanita-verde"
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
              Productos Destacados
            </h2>
          </div>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#87201D] hover:underline"
          >
            <span>Ver catálogo completo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Delivery Scheduling Explanation Section */}
      <section className="bg-[#F7EDDE] py-16 border-y border-[#DEC0BC]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-[#1F1B12]">
              ¿Cómo funcionan las entregas?
            </h2>
            <p className="text-sm text-[#57413F]">
              Cada pedido se programa con anticipación para organizar su preparación y entrega.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#87201D]/20 text-[#87201D] flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1F1B12]">3 Días de Anticipación</h3>
              <p className="text-xs text-[#57413F] leading-relaxed">
                Todos los pedidos requieren solicitarse con al menos 3 días de anticipación para organizar la preparación.
              </p>
            </div>

            <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#D46240]/20 text-[#832709] flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Zonas Programadas ($30 MXN)</h3>
              <p className="text-xs text-[#57413F] leading-relaxed">
                Entregas en zonas oficiales (Alba Roja, Ermita, Las Palmas, Hipódromo, Las Ferias, CETYS y Punto Medio) con costo de envío de $30 MXN.
              </p>
            </div>

            <div className="bg-[#FFF8F1] p-6 rounded-lg border border-[#DEC0BC]/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#4F7942]/20 text-[#4F7942] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1F1B12]">Pickup en CETYS</h3>
              <p className="text-xs text-[#57413F] leading-relaxed">
                Único punto de recolección presencial disponible en CETYS, de lunes a viernes de 4:00 p.m. a 8:00 p.m.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Banner CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#87201D] text-white rounded-2xl p-8 md:p-12 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold tracking-wider uppercase text-[#FFCDC8]">
              <MapPin className="w-3.5 h-3.5" />
              <span>Programación de Envíos en Tijuana</span>
            </div>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-white">
              Consulta las zonas y horarios de entrega disponibles
            </h2>
            <p className="text-sm text-[#FFCDC8] leading-relaxed">
              Revisa nuestras zonas oficiales de entrega a domicilio y el horario de recolección presencial en CETYS.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/puntos-de-entrega"
              className="px-6 py-3.5 text-sm font-bold rounded-sm bg-white text-[#87201D] hover:bg-[#FFF8F1] transition-colors shadow-md text-center"
            >
              Ver Zonas de Entrega
            </Link>
            <a
              href={SITE_CONFIG.whatsapp.urlWithMessage}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 text-sm font-bold rounded-sm bg-[#4F7942] text-white hover:bg-[#3d5e33] transition-colors shadow-md text-center flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Pedir por WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
