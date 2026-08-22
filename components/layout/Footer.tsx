'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SITE_CONFIG } from '@/config/site';
import { POLICIES, Policy } from '@/data/policies';
import { Modal } from '@/components/ui/Modal';
import { Flame, Heart, MapPin, MessageSquare } from 'lucide-react';

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
    <footer className="bg-[#1F1B12] text-[#FAEFE0] pt-12 pb-8 border-t-4 border-[#87201D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#57413F]/40">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#87201D] flex items-center justify-center text-white">
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <span className="font-serif font-bold text-2xl text-[#FAEFE0]">Zanita</span>
            </Link>
            <p className="text-xs text-[#DEC0BC] leading-relaxed">
              {SITE_CONFIG.tagline}. Elaborados bajo programación artesanal en Tijuana, B.C.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#FFA9B6]">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Negocio Local en Tijuana</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-[#FFCDC8]">Navegación</h4>
            <ul className="space-y-2 text-xs text-[#DEC0BC]">
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

          {/* Legal / Policies */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-[#FFCDC8]">Información & Políticas</h4>
            <ul className="space-y-2 text-xs text-[#DEC0BC]">
              <li>
                <button
                  onClick={() => setActivePolicy(POLICIES.privacidad)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Aviso de Privacidad (Preliminar)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicy(POLICIES.terminos)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Términos de Servicio (Preliminar)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicy(POLICIES.envios)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Modalidades de Entrega
                </button>
              </li>
            </ul>
          </div>

          {/* Official Contact */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-[#FFCDC8]">Contacto Oficial</h4>
            <ul className="space-y-3 text-xs text-[#DEC0BC]">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FFA9B6] shrink-0" />
                <span>Entregas programadas en Tijuana, B.C.</span>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.whatsapp.urlWithMessage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#FFA9B6] hover:underline font-semibold"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>WhatsApp: {SITE_CONFIG.whatsapp.display}</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#FFA9B6] hover:underline font-semibold"
                >
                  <InstagramIcon className="w-4 h-4 shrink-0" />
                  <span>Instagram: {SITE_CONFIG.instagram.handle}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8B716E] gap-4">
          <p>© {new Date().getFullYear()} Zanita. Todos los derechos reservados.</p>
          <p className="font-mono">Tijuana, B.C. • Pedidos con 3 días de anticipación</p>
        </div>
      </div>

      {/* Policy Modal */}
      {activePolicy && (
        <Modal
          isOpen={!!activePolicy}
          onClose={() => setActivePolicy(null)}
          title={activePolicy.title}
        >
          <div className="space-y-4">
            <p className="text-xs text-[#8B716E] italic">Estado: {activePolicy.lastUpdated}</p>
            <p className="font-semibold">{activePolicy.summary}</p>
            {activePolicy.sections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <h3 className="font-serif font-bold text-[#87201D] text-base">{section.title}</h3>
                <p className="text-sm text-[#57413F] leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </footer>
  );
};
