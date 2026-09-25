'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';
import { Menu, X, MessageSquare, User, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export const Navbar: React.FC<{ isLoggedIn?: boolean, userRole?: string | null }> = ({ isLoggedIn, userRole }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount, isHydrated } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  const navLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Catálogo de Productos', href: '/productos' },
    { name: 'Nuestra Historia', href: '/nosotros' },
    { name: 'Zonas & Entregas', href: '/puntos-de-entrega' },
  ];

  const authLinks = [
    ...(userRole === 'admin' ? [{ name: 'Panel Admin', href: '/admin' }] : []),
    ...(isLoggedIn ? [{ name: 'Mi Cuenta', href: '/mi-cuenta' }] : [{ name: 'Iniciar Sesión', href: '/iniciar-sesion' }])
  ];

  const showBadge = mounted && isHydrated && itemCount > 0;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F5EBDC] border-b border-[#E4D5C1]">
      <div className="bg-[#A73832] text-white text-center py-2 px-4 text-xs font-semibold tracking-wide">
        <p className="max-w-7xl mx-auto">
          Pedidos con mínimo 24 horas de anticipación · Entregas programadas en Tijuana
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
            <div className="relative w-44 sm:w-48 h-12">
              <Image
                src="/brand/logos/logo-horizontal-red.webp"
                alt="Zanita - Snacks & Chamoy"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 640px) 176px, 192px"
              />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-bold uppercase tracking-wider text-[#261C19] hover:text-[#A73832] transition-colors py-2 focus:outline-none focus:ring-2 focus:ring-[#A73832]/30 rounded-xs"
              >
                {link.name}
              </Link>
            ))}
            <div className="w-px h-4 bg-[#E4D5C1] mx-2"></div>
            {authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-bold uppercase tracking-wider text-[#A73832] hover:text-[#8e2e28] transition-colors py-2 flex items-center gap-1"
              >
                <User className="w-3.5 h-3.5" />
                {link.name}
              </Link>
            ))}
            <Link
              href="/carrito"
              className="relative p-2 text-[#A73832] hover:text-[#8e2e28] transition-colors flex items-center"
              aria-label="Ver carrito"
            >
              <ShoppingBag className="w-5 h-5" />
              {showBadge && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-[#D46240] rounded-full min-w-[1.25rem]">
                  {itemCount}
                </span>
              )}
            </Link>
          </nav>

          <div className="hidden sm:flex items-center gap-4 lg:hidden">
            {/* Desktop-only view of WhatsApp is hidden on LG where it gets cluttered, replaced by cart */}
            {/* Wait, the prompt says "Revisar si el CTA grande de WhatsApp en desktop compite... No eliminar WhatsApp automáticamente. Acomodar jerarquía". */}
            <a
              href={SITE_CONFIG.whatsapp.urlWithMessage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all text-xs font-bold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#A73832]/40"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current text-[#4F7942] group-hover:text-[#F5EBDC]" />
              <span className="hidden xl:inline">Contactar por WhatsApp</span>
              <span className="xl:hidden">WhatsApp</span>
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-4">
             <a
              href={SITE_CONFIG.whatsapp.urlWithMessage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all text-xs font-bold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#A73832]/40"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current text-[#4F7942] group-hover:text-[#F5EBDC]" />
              <span className="hidden xl:inline">Contactar por WhatsApp</span>
              <span className="xl:hidden">WhatsApp</span>
            </a>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/carrito"
              className="relative p-2.5 rounded-md text-[#A73832] hover:bg-[#A73832]/10 transition-colors focus:outline-none"
              aria-label="Ver carrito"
            >
              <ShoppingBag className="w-6 h-6" />
              {showBadge && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-[#D46240] rounded-full min-w-[1.25rem]">
                  {itemCount}
                </span>
              )}
            </Link>
            {!mobileMenuOpen && (
              <Link href={isLoggedIn ? '/mi-cuenta' : '/iniciar-sesion'} className="p-2.5 rounded-md text-[#A73832] hover:bg-[#A73832]/10 transition-colors focus:outline-none">
                <User className="w-6 h-6" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-md text-[#A73832] hover:bg-[#A73832]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A73832]"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E4D5C1] bg-[#F5EBDC] px-4 pt-4 pb-6 space-y-4 shadow-sm animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold uppercase tracking-wider text-[#261C19] hover:text-[#A73832] py-2 border-b border-[#E4D5C1]/40"
              >
                {link.name}
              </Link>
            ))}
            {authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold uppercase tracking-wider text-[#A73832] hover:text-[#8e2e28] py-2 border-b border-[#E4D5C1]/40 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-2">
            <a
              href={SITE_CONFIG.whatsapp.urlWithMessage}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-[#A73832] text-[#A73832] bg-white hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all text-xs font-bold shadow-2xs"
            >
              <MessageSquare className="w-4 h-4 fill-current text-[#4F7942]" />
              <span>Pedir por WhatsApp ({SITE_CONFIG.whatsapp.display})</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
