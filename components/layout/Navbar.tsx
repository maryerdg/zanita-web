'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SITE_CONFIG } from '@/config/site';
import { Menu, X, ShoppingBag, Flame, MapPin } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/productos', label: 'Catálogo de Productos' },
    { href: '/nosotros', label: 'Nuestra Historia' },
    { href: '/puntos-de-entrega', label: 'Zonas & Entregas' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFF8F1]/95 backdrop-blur-md border-b border-[#DEC0BC]/40 transition-all">
      {/* Top Banner */}
      <div className="bg-[#87201D] text-white text-[11px] font-bold tracking-wider uppercase text-center py-1.5 px-4 flex items-center justify-center gap-2">
        <Flame className="w-3.5 h-3.5 fill-current text-[#FFA9B6]" />
        <span>{SITE_CONFIG.noticeBanner}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-[#1F1B12] hover:bg-[#F7EDDE] focus:outline-hidden"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-full bg-[#87201D] flex items-center justify-center text-white shadow-xs group-hover:bg-[#A73832] transition-colors">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-extrabold text-2xl tracking-tight text-[#87201D] leading-none">
                  Zanita
                </span>
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#8B716E]">
                  Snacks & Chamoy • Tijuana
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#1F1B12] hover:text-[#87201D] transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#87201D] hover:after:w-full after:transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            <Link
              href="/puntos-de-entrega"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#832709] bg-[#F7EDDE] px-3 py-1.5 rounded-full border border-[#DEC0BC]/40 hover:bg-[#EBE1D2] transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Ver Zonas</span>
            </Link>

            <button
              className="relative p-2 text-[#1F1B12] hover:text-[#87201D] transition-colors rounded-full hover:bg-[#F7EDDE]"
              aria-label="Ver carrito"
            >
              <ShoppingBag className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#87201D] text-white text-[10px] font-bold flex items-center justify-center">
                0
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DEC0BC]/40 bg-[#FFF8F1] px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-semibold text-[#1F1B12] hover:bg-[#F7EDDE] hover:text-[#87201D]"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#DEC0BC]/40">
            <Link
              href="/puntos-de-entrega"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full text-sm font-bold text-[#832709] bg-[#F7EDDE] py-2.5 rounded-md border border-[#DEC0BC]/40"
            >
              <MapPin className="w-4 h-4" />
              <span>Zonas & Modalidades de Entrega</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
