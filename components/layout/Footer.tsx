'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';
import { POLICIES, Policy } from '@/data/policies';
import { Modal } from '@/components/ui/Modal';
import { MapPin, MessageSquare } from 'lucide-react';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const Footer: React.FC = () => {
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);

  return (
    <footer className="w-full">
      {/* Main Red Brand Footer */}
      <div className="bg-[#A73832] text-[#F5EBDC] pt-14 pb-10 border-t-2 border-[#D46240]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#F09CA9]/30">
            {/* Brand Logo & Info */}
            <div className="space-y-4 md:col-span-1">
              <Link href="/" className="inline-block transition-opacity hover:opacity-90">
                <div className="relative w-40 h-12">
                  <Image
                    src="/brand/logos/logo-horizontal-white.webp"
                    alt="Zanita - Snacks & Chamoy"
                    fill
                    className="object-contain object-left"
                    sizes="160px"
                  />
                </div>
              </Link>
              <p className="text-xs text-[#F09CA9] leading-relaxed max-w-xs font-sans">
                Manzanas, uvas, charolas y snacks preparados con chamoy y toppings. Pedidos bajo programación en Tijuana, B.C.
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 px-3 py-1 rounded-full">
                <span>Negocio Local en Tijuana</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-white">Navegación</h4>
              <ul className="space-y-2.5 text-xs text-[#F09CA9]">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/productos" className="hover:text-white transition-colors">
                    Catálogo de Productos
                  </Link>
                </li>
                <li>
                  <Link href="/nosotros" className="hover:text-white transition-colors">
                    Nuestra Historia
                  </Link>
                </li>
                <li>
                  <Link href="/puntos-de-entrega" className="hover:text-white transition-colors">
                    Zonas & Modalidades de Entrega
                  </Link>
                </li>
              </ul>
            </div>

            {/* Preliminary Legal Policies */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-white">Información & Políticas</h4>
              <ul className="space-y-2.5 text-xs text-[#F09CA9]">
                <li>
                  <button
                    onClick={() => setActivePolicy(POLICIES.privacidad)}
                    className="hover:text-white transition-colors text-left cursor-pointer focus:outline-none focus:underline"
                  >
                    Aviso de Privacidad (Preliminar)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActivePolicy(POLICIES.terminos)}
                    className="hover:text-white transition-colors text-left cursor-pointer focus:outline-none focus:underline"
                  >
                    Términos de Servicio (Preliminar)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActivePolicy(POLICIES.envios)}
                    className="hover:text-white transition-colors text-left cursor-pointer focus:outline-none focus:underline"
                  >
                    Modalidades de Entrega
                  </button>
                </li>
              </ul>
            </div>

            {/* Official Contact */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-white">Contacto Oficial</h4>
              <ul className="space-y-3 text-xs text-[#F09CA9]">
                <li className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4 text-[#F09CA9] shrink-0" />
                  <span>Entregas programadas en Tijuana, B.C.</span>
                </li>
                <li>
                  <a
                    href={SITE_CONFIG.whatsapp.urlWithMessage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white hover:text-[#F09CA9] transition-colors font-semibold"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 fill-current text-[#F09CA9]" />
                    <span>WhatsApp: {SITE_CONFIG.whatsapp.display}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={SITE_CONFIG.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white hover:text-[#F09CA9] transition-colors font-semibold"
                  >
                    <InstagramIcon className="w-4 h-4 shrink-0 text-[#F09CA9]" />
                    <span>Instagram: {SITE_CONFIG.instagram.handle}</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom Rights Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#F09CA9] gap-2">
            <p>© {new Date().getFullYear()} Zanita. Todos los derechos reservados.</p>
            <p>Tijuana, B.C. • Pedidos con 3 días de anticipación</p>
          </div>
        </div>
      </div>

      {/* Global MARYER Digital Signature Bar: 3 Independent Rows */}
      <div className="bg-[#F5EBDC] py-8 sm:py-9 px-12 sm:px-16 border-t border-[#E4D5C1] text-center flex flex-col items-center justify-center">
        {/* Row 1: Isotipo Oficial MD (Desktop 48x48px, Mobile 44x44px) */}
        <div className="mb-3">
          <a
            href="https://www.instagram.com/maryer.digital/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de MARYER Digital"
            className="inline-block transition-transform hover:scale-105"
          >
            <div className="relative w-[44px] h-[44px] sm:w-[48px] sm:h-[48px]">
              <Image
                src="/credits/maryer-digital-isotipo.webp"
                alt="MARYER Digital MD Isotipo"
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>
          </a>
        </div>

        {/* Row 2: WEBSITE BY MARYER DIGITAL (Independent line) */}
        <div className="text-[11px] sm:text-[12px] font-bold tracking-widest uppercase text-[#261C19] font-sans">
          <span>WEBSITE BY </span>
          <a
            href="https://www.instagram.com/maryer.digital/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visitar MARYER Digital en Instagram"
            className="text-[#A73832] hover:text-[#261C19] hover:underline transition-colors font-extrabold"
          >
            MARYER DIGITAL
          </a>
        </div>

        {/* Row 3: @MARYER.DIGITAL (Independent line below with 6-8px top margin) */}
        <div className="mt-2 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase font-sans">
          <a
            href="https://www.instagram.com/maryer.digital/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram @maryer.digital"
            className="text-[#6E564F] hover:text-[#A73832] hover:underline transition-colors"
          >
            @MARYER.DIGITAL
          </a>
        </div>
      </div>

      {/* Policy Modal */}
      {activePolicy && (
        <Modal
          isOpen={!!activePolicy}
          onClose={() => setActivePolicy(null)}
          title={activePolicy.title}
        >
          <div className="space-y-4 text-[#261C19]">
            <p className="text-xs text-[#6E564F] italic">Estado: {activePolicy.lastUpdated}</p>
            <p className="font-semibold text-sm">{activePolicy.summary}</p>
            {activePolicy.sections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <h3 className="font-serif font-bold text-[#A73832] text-base">{section.title}</h3>
                <p className="text-xs sm:text-sm text-[#6E564F] leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </footer>
  );
};
