import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';
import { MOCK_PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/store/ProductCard';
import { ArrowRight, MessageSquare, Clock, MapPin, Calendar, Sparkles } from 'lucide-react';

export default function HomePage() {
  const featuredProducts = MOCK_PRODUCTS.filter((p) => p.featured).slice(0, 4);

  const categories = [
    {
      id: 'manzanas',
      name: 'Manzanitas',
      description: 'Verde y Gala preparadas con cubierta y chamoy.',
      href: '/productos',
      element: '/brand/elements/chilli-apple.webp',
      bgAccent: 'bg-[#F09CA9]/20',
      textAccent: 'text-[#A73832]',
    },
    {
      id: 'charolas',
      name: 'Charolas',
      description: 'Individual, Mediana, Grande y Jumbo con toppings.',
      href: '/productos',
      element: '/brand/elements/gummy-ring-red.webp',
      bgAccent: 'bg-[#D46240]/15',
      textAccent: 'text-[#D46240]',
    },
    {
      id: 'uvas',
      name: 'Uvas y Snacks',
      description: 'Uvas forradas, Mix de frutas y Munxie Tacos.',
      href: '/productos',
      element: '/brand/elements/grapes-green.webp',
      bgAccent: 'bg-[#4F7942]/15',
      textAccent: 'text-[#4F7942]',
    },
    {
      id: 'combos',
      name: 'Combos',
      description: 'Paquetes de 6 y 12 manzanitas con chamoy jumbo.',
      href: '/productos',
      element: '/brand/elements/gummy-bear-red.webp',
      bgAccent: 'bg-[#F09CA9]/25',
      textAccent: 'text-[#A73832]',
    },
  ];

  return (
    <div className="space-y-16 md:space-y-24 pb-16">
      {/* 2. Refined Collage Hero Section Inspired by Zanita's Instagram Feed */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5EBDC] via-[#F09CA9]/20 to-[#F5EBDC] py-14 md:py-24 border-b border-[#E4D5C1]">
        {/* Soft Background Circular Accents */}
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 rounded-full bg-[#F09CA9]/35 blur-2xl pointer-events-none" />
        <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-[#A73832]/5 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F09CA9]/30 text-[#A73832] text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/50 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Negocio Local en Tijuana</span>
              </div>

              {/* Headline: Literal confirmed text "Tu momento dulce, simple y natural." */}
              <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[#261C19] leading-[1.18] tracking-tight">
                Tu momento{' '}
                <span className="font-script text-5xl sm:text-6xl lg:text-7xl text-[#A73832] font-normal px-2 inline-block -rotate-2 transform hover:rotate-0 transition-transform">
                  dulce
                </span>
                , simple y natural.
              </h1>

              {/* Tagline: Literal confirmed text */}
              <p className="text-base sm:text-lg text-[#6E564F] leading-relaxed max-w-xl mx-auto lg:mx-0 font-sans">
                Manzanas, uvas, charolas y snacks preparados con chamoy y toppings.
              </p>

              {/* CTAs - Refined Red/Cream WhatsApp CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/productos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-wider rounded-md bg-[#A73832] text-white hover:bg-[#8e2e28] transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#A73832]"
                >
                  <span>Ver productos</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href={SITE_CONFIG.whatsapp.urlWithMessage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-xs font-bold uppercase tracking-wider rounded-md border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#A73832]/40"
                >
                  <MessageSquare className="w-4 h-4 fill-current text-[#4F7942] group-hover:text-[#F5EBDC]" />
                  <span>Pedir por WhatsApp</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#E4D5C1]/70 max-w-lg mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#A73832]">3 Días</span>
                  <span className="text-[11px] uppercase tracking-wider text-[#6E564F]">Anticipación</span>
                </div>
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#A73832]">Tijuana</span>
                  <span className="text-[11px] uppercase tracking-wider text-[#6E564F]">Negocio Local</span>
                </div>
                <div className="text-center lg:text-left">
                  <span className="block font-serif font-bold text-xl text-[#A73832]">Bajo pedido</span>
                  <span className="text-[11px] uppercase tracking-wider text-[#6E564F]">Preparación programada</span>
                </div>
              </div>
            </div>

            {/* Right Rich Collage-Style Editorial Brand Frame */}
            <div className="lg:col-span-5 relative flex justify-center py-6">
              <div className="relative w-full max-w-md aspect-square bg-[#FFF9F2] p-8 rounded-3xl border-2 border-[#F09CA9]/70 shadow-md flex flex-col items-center justify-between">
                {/* Layered Decorative Circles (Pink & Terracotta) */}
                <div className="absolute top-6 left-6 w-20 h-20 rounded-full bg-[#F09CA9]/35 pointer-events-none -z-0" />
                <div className="absolute bottom-8 right-8 w-24 h-24 rounded-full bg-[#D46240]/20 pointer-events-none -z-0" />

                {/* Central Emblem */}
                <div className="relative w-36 h-36 my-auto z-10 transition-transform duration-500 hover:scale-105">
                  <Image
                    src="/brand/logos/logo-vertical-red.webp"
                    alt="Zanita Emblem"
                    fill
                    className="object-contain"
                    sizes="144px"
                  />
                </div>

                {/* Overlapping Collage Graphic Accents (Overstepping the border naturally) */}
                <div className="absolute -top-5 -right-4 w-20 h-20 z-20 -rotate-12 transition-transform duration-300 hover:scale-110">
                  <Image
                    src="/brand/elements/chilli-apple.webp"
                    alt="Manzana Element"
                    fill
                    className="object-contain drop-shadow-xs"
                    sizes="80px"
                  />
                </div>

                <div className="absolute -bottom-4 -left-4 w-20 h-20 z-20 rotate-12 transition-transform duration-300 hover:scale-110">
                  <Image
                    src="/brand/elements/grapes-green.webp"
                    alt="Uvas Element"
                    fill
                    className="object-contain drop-shadow-xs"
                    sizes="80px"
                  />
                </div>

                <div className="absolute top-8 left-2 w-14 h-14 z-10 rotate-45 opacity-90">
                  <Image
                    src="/brand/elements/gummy-bear-red.webp"
                    alt="Gomita Element"
                    fill
                    className="object-contain"
                    sizes="56px"
                  />
                </div>

                <div className="absolute bottom-10 right-2 w-16 h-16 z-10 -rotate-45 opacity-90">
                  <Image
                    src="/brand/elements/gummy-ring-red.webp"
                    alt="Topping Ring Element"
                    fill
                    className="object-contain"
                    sizes="64px"
                  />
                </div>

                <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-12 h-12 z-10 rotate-12 opacity-80 hidden sm:block">
                  <Image
                    src="/brand/elements/peanut.webp"
                    alt="Cacahuate Element"
                    fill
                    className="object-contain"
                    sizes="48px"
                  />
                </div>

                <div className="w-full pt-4 border-t border-[#E4D5C1]/60 text-center z-10">
                  <span className="text-xs font-serif italic text-[#A73832]">
                    Preparaciones bajo pedido para organizar su producción
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Categorías */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A73832] block">
            Explora Nuestro Menú
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-[#261C19]">
            Categorías Principales
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="group bg-white p-6 rounded-2xl border border-[#E4D5C1] hover:border-[#F09CA9] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className={`w-16 h-16 rounded-2xl ${cat.bgAccent} flex items-center justify-center p-2 transition-transform duration-300 group-hover:scale-105`}>
                  <div className="relative w-12 h-12">
                    <Image
                      src={cat.element}
                      alt={cat.name}
                      fill
                      className="object-contain"
                      sizes="48px"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className={`font-serif font-bold text-xl ${cat.textAccent}`}>
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#6E564F] leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E4D5C1]/40 flex items-center justify-between text-xs font-bold text-[#A73832]">
                <span>Ver productos</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Productos Destacados */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#A73832] block mb-1">
              Productos en Menú
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-[#261C19]">
              Productos Destacados
            </h2>
          </div>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A73832] hover:underline"
          >
            <span>Ver catálogo completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. Información de Pedidos */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FFF9F2] rounded-2xl border border-[#E4D5C1] p-8 md:p-12 space-y-8 shadow-2xs">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D46240]">
              Condiciones de Servicio
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-[#261C19]">
              Información de Pedidos & Entregas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 3 Days Notice */}
            <div className="bg-white p-6 rounded-xl border border-[#E4D5C1]/70 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#A73832]/10 text-[#A73832] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#261C19]">3 Días de Anticipación</h3>
              <p className="text-xs text-[#6E564F] leading-relaxed">
                Todos los pedidos requieren solicitarse con un mínimo de 3 días de anticipación para organizar la producción.
              </p>
            </div>

            {/* Delivery Zones */}
            <div className="bg-white p-6 rounded-xl border border-[#E4D5C1]/70 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#D46240]/10 text-[#D46240] flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#261C19]">Entregas por Zona</h3>
              <p className="text-xs text-[#6E564F] leading-relaxed">
                Entregas a domicilio en zonas oficiales (+$30 MXN extra) de lunes a viernes antes de 2:00 p.m., y sábados/domingos programados.
              </p>
            </div>

            {/* CETYS Pickup */}
            <div className="bg-white p-6 rounded-xl border border-[#E4D5C1]/70 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#4F7942]/10 text-[#4F7942] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#261C19]">Pickup en CETYS</h3>
              <p className="text-xs text-[#6E564F] leading-relaxed">
                Único punto de recolección en CETYS de lunes a viernes de 4:00 p.m. a 8:00 p.m. Condición o costo de pickup sujeto a confirmación.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/puntos-de-entrega"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#A73832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#8e2e28] transition-colors"
            >
              <span>Ver Zonas & Modalidades de Entrega</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Cierre de Home */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#A73832] text-white rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="space-y-4 max-w-xl text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold tracking-wider uppercase text-[#F09CA9]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Atención Personal por Ximena</span>
            </div>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white leading-tight">
              ¿Listo para coordinar tu pedido?
            </h2>
            <p className="text-xs sm:text-sm text-[#F09CA9] leading-relaxed">
              Escríbenos directamente por WhatsApp para solicitar tu fecha de entrega o consultar detalles.
            </p>
          </div>

          <div className="z-10 w-full sm:w-auto">
            <a
              href={SITE_CONFIG.whatsapp.urlWithMessage}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-md border border-white text-white bg-[#A73832] hover:bg-white hover:text-[#A73832] transition-colors text-xs font-bold uppercase tracking-wider shadow-md"
            >
              <MessageSquare className="w-4 h-4 fill-current text-[#4F7942]" />
              <span>Pedir por WhatsApp</span>
            </a>
          </div>

          {/* Background Decorative Accent */}
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 opacity-10 pointer-events-none">
            <Image
              src="/brand/logos/logo-vertical-white.webp"
              alt="Background emblem"
              fill
              className="object-contain"
              sizes="256px"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
