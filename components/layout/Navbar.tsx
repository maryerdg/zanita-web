'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';
import { Menu, X, MessageSquare } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Catálogo de Productos', href: '/productos' },
    { name: 'Nuestra Historia', href: '/nosotros' },
    { name: 'Zonas & Entregas', href: '/puntos-de-entrega' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F5EBDC] border-b border-[#E4D5C1]">
      {/* 1. Compact Top Banner */}
      <div className="bg-[#A73832] text-white text-center py-2 px-4 text-xs font-semibold tracking-wide">
        <p className="max-w-7xl mx-auto">
          Pedidos con 3 días de anticipación · Entregas programadas en Tijuana
        </p>
      </div>

      {/* 2. Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Step 8: Logo horizontal increased to 180px */}
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

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-bold uppercase tracking-wider text-[#261C19] hover:text-[#A73832] transition-colors py-2 focus:outline-none focus:ring-2 focus:ring-[#A73832]/30 rounded-xs"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Step 3: Refined WhatsApp CTA - Cream/Transparent bg, Red border & text, small green icon accent */}
          <div className="hidden sm:flex items-center gap-4">
            <a
              href={SITE_CONFIG.whatsapp.urlWithMessage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all text-xs font-bold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#A73832]/40"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current text-[#4F7942] group-hover:text-[#F5EBDC]" />
              <span>Contactar por WhatsApp</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center">
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

      {/* Mobile Drawer Menu */}
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
