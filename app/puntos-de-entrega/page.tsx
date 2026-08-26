import React from 'react';
import { SITE_CONFIG } from '@/config/site';
import { MapPin, Clock, Calendar, AlertCircle, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function PuntosDeEntregaPage() {
  const officialZones = [
    'Alba Roja',
    'Ermita',
    'Las Palmas',
    'Hipódromo',
    'Las Ferias',
    'CETYS',
    'Punto Medio',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F09CA9]/30 text-[#A73832] text-xs font-bold uppercase tracking-wider border border-[#F09CA9]/50 shadow-2xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>Cobertura & Entregas en Tijuana</span>
        </div>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl text-[#261C19]">
          Zonas y Modalidades de Entrega
        </h1>
        <p className="text-sm md:text-base text-[#6E564F] leading-relaxed">
          Consulta la información sobre nuestras zonas de entrega a domicilio, horarios y la condición del punto de recolección (pickup).
        </p>
      </div>

      {/* Step 7: Main Delivery Rules Notice - Refined Soft Pink/Cream with Red Border */}
      <div className="bg-[#FFF9F2] p-6 md:p-8 rounded-2xl border-2 border-[#A73832]/60 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-[#A73832] font-bold text-xs uppercase tracking-wider">
          <Calendar className="w-4 h-4" />
          <span>Regla de Anticipación</span>
        </div>
        <p className="text-base md:text-lg font-serif font-bold text-[#261C19]">
          Todos los pedidos requieren solicitarse con 3 días de anticipación.
        </p>
        <p className="text-xs md:text-sm text-[#6E564F] leading-relaxed">
          Para organizar la preparación de cada pedido y coordinar las entregas disponibles, no se realizan entregas inmediatas de un día para otro.
        </p>
      </div>

      {/* Zones Grid & Tariffs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Official Delivery Zones */}
        <div className="md:col-span-6 bg-[#FFF9F2] p-6 md:p-8 rounded-2xl border border-[#E4D5C1] space-y-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E4D5C1] pb-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#261C19]">Zonas Oficiales ($30 MXN Extra)</h2>
              <p className="text-xs text-[#6E564F]">Entrega a domicilio dentro de estas zonas:</p>
            </div>
            <span className="font-serif font-bold text-xs text-[#A73832] bg-[#A73832]/10 px-3 py-1 rounded-full whitespace-nowrap border border-[#A73832]/20">
              +$30 MXN
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-[#261C19]">
            {officialZones.map((zone) => (
              <div key={zone} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-[#E4D5C1]/70">
                <CheckCircle2 className="w-4 h-4 text-[#4F7942] shrink-0" />
                <span className="text-xs font-bold">{zone}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E4D5C1] space-y-2">
            <h3 className="font-serif font-bold text-sm text-[#D46240]">Otras Zonas de Tijuana</h3>
            <p className="text-xs text-[#6E564F] leading-relaxed">
              Las entregas en ubicaciones fuera del listado oficial requieren cotización de envío, la cual oscila entre <strong>$50 MXN y $100 MXN</strong> según la distancia.
            </p>
          </div>
        </div>

        {/* Schedule & Pickup Rules */}
        <div className="md:col-span-6 space-y-6">
          {/* Pickup Block */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4D5C1] space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[#A73832] font-serif font-bold text-lg">
              <Clock className="w-5 h-5" />
              <h2>Recolección Presencial (Pickup)</h2>
            </div>
            <div className="space-y-3 text-xs md:text-sm text-[#6E564F]">
              <p className="font-bold text-[#261C19] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#A73832] shrink-0" />
                <span>Único punto de pickup disponible: CETYS</span>
              </p>
              <p>
                <strong>Horario:</strong> Lunes a viernes de 4:00 p.m. a 8:00 p.m. (después de las 4:00 p.m. únicamente aplica la opción de pickup en CETYS).
              </p>
              <div className="p-3.5 bg-[#FFF9F2] rounded-xl border border-[#E4D5C1] space-y-1 text-xs text-[#D46240]">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#A73832]" />
                  <span>Sin pickup gratuito</span>
                </div>
                <p className="leading-relaxed text-[#6E564F]">
                  No existe modalidad de pickup gratuito en ningún punto (incluyendo CETYS). El costo o condición específica de la recolección en CETYS está pendiente de confirmación formal por la marca.
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Schedule Block */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4D5C1] space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[#D46240] font-serif font-bold text-lg">
              <Calendar className="w-5 h-5" />
              <h2>Horarios de Entrega a Domicilio</h2>
            </div>
            <ul className="space-y-3 text-xs md:text-sm text-[#6E564F]">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#A73832] shrink-0 mt-1.5" />
                <span><strong>Lunes a viernes (antes de las 2:00 p.m.):</strong> Entregas a domicilio en zonas disponibles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D46240] shrink-0 mt-1.5" />
                <span><strong>Lunes a viernes (después de las 4:00 p.m.):</strong> Únicamente pickup en CETYS (4:00 p.m. a 8:00 p.m.).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4F7942] shrink-0 mt-1.5" />
                <span><strong>Sábados y domingos:</strong> Entregas programadas bajo agenda.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* WhatsApp CTA - Refined Style */}
      <div className="bg-[#FFF9F2] p-8 rounded-2xl border border-[#E4D5C1] text-center space-y-4 shadow-2xs">
        <h2 className="font-serif font-bold text-2xl text-[#261C19]">
          ¿Tienes dudas sobre la entrega de tu pedido?
        </h2>
        <p className="text-xs md:text-sm text-[#6E564F] max-w-xl mx-auto">
          Escríbenos directamente por WhatsApp para consultar la tarifa o zona disponible de tu ubicación.
        </p>
        <a
          href={SITE_CONFIG.whatsapp.urlWithMessage}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-md border border-[#A73832] text-[#A73832] bg-[#F5EBDC] hover:bg-[#A73832] hover:text-[#F5EBDC] transition-all text-xs font-bold uppercase tracking-wider shadow-2xs"
        >
          <MessageSquare className="w-4 h-4 fill-current text-[#4F7942]" />
          <span>Consultar por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
