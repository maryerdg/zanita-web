'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { POLICIES, Policy } from '@/data/policies';
import { Modal } from '@/components/ui/Modal';
import { Flame, Heart, Mail, MapPin, Phone } from 'lucide-react';

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
              Snacks artesanales deshidratados con chile de la casa, elaborados con frutas seleccionadas y procesos tradicionales sin químicos ni conservadores.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#FFA9B6]">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Sabor Mexicano 100% Artesanal</span>
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
                  Puntos de Entrega
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Policies */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-[#FFCDC8]">Políticas y Garantía</h4>
            <ul className="space-y-2 text-xs text-[#DEC0BC]">
              <li>
                <button
                  onClick={() => setActivePolicy(POLICIES.privacidad)}
                  className="hover:text-white transition-colors text-left"
                >
                  Aviso de Privacidad
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicy(POLICIES.terminos)}
                  className="hover:text-white transition-colors text-left"
                >
                  Términos y Condiciones
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicy(POLICIES.envios)}
                  className="hover:text-white transition-colors text-left"
                >
                  Política de Envíos
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase text-[#FFCDC8]">Contacto</h4>
            <ul className="space-y-2 text-xs text-[#DEC0BC]">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#FFA9B6]" />
                <span>Puntos autorizados & envíos a domicilio</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#FFA9B6]" />
                <span>hola@zanita.mx</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#FFA9B6]" />
                <span>Atención a Clientes via WhatsApp</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8B716E] gap-4">
          <p>© {new Date().getFullYear()} Zanita. Todos los derechos reservados.</p>
          <p className="font-mono">Desarrollo Artesanal E-Commerce</p>
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
            <p className="text-xs text-[#8B716E] italic">Última actualización: {activePolicy.lastUpdated}</p>
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
