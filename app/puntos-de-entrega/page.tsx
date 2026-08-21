import React from 'react';
import Link from 'next/link';
import { MapPin, Clock, Phone, CheckCircle2 } from 'lucide-react';

export default function PuntosDeEntregaPage() {
  const pickupPoints = [
    {
      id: 'pt-1',
      name: 'Punto Zanita Centro Histórico',
      address: 'Calle Hidalgo #240, Col. Centro',
      hours: 'Lunes a Sábado: 10:00 am - 7:00 pm',
      phone: '+52 55 1234 5678',
      status: 'Disponible para recolección',
    },
    {
      id: 'pt-2',
      name: 'Punto Zanita Zona Norte / Boutique Orgánica',
      address: 'Av. Las Palmas #512, Plaza Jardín',
      hours: 'Martes a Domingo: 11:00 am - 8:00 pm',
      phone: '+52 55 8765 4321',
      status: 'Disponible para recolección',
    },
    {
      id: 'pt-3',
      name: 'Punto Zanita Sur / Mercado Gourmet',
      address: 'Insurgentes Sur #1840, Col. Florida',
      hours: 'Lunes a Viernes: 9:00 am - 6:00 pm',
      phone: '+52 55 9988 7766',
      status: 'Disponible para recolección',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#832709]/10 text-[#832709] text-xs font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          <span>Cobertura & Recolección Local</span>
        </div>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl text-[#1F1B12]">
          Puntos de Entrega Autorizados
        </h1>
        <p className="text-sm md:text-base text-[#57413F] leading-relaxed">
          Recoge tu pedido sin costo adicional de envío en nuestros puntos aliados. Selecciona tu ubicación más cercana al programar tu orden.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pickupPoints.map((point) => (
          <div
            key={point.id}
            className="bg-[#FCF2E3] p-6 rounded-xl border border-[#DEC0BC]/50 flex flex-col justify-between space-y-6 shadow-xs hover:border-[#87201D]/40 transition-all"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-[#87201D] text-white flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F7942] bg-[#4F7942]/10 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Activo</span>
                </span>
              </div>

              <h3 className="font-serif font-bold text-lg text-[#1F1B12] leading-tight">
                {point.name}
              </h3>

              <div className="space-y-2 text-xs text-[#57413F]">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#87201D] shrink-0 mt-0.5" />
                  <span>{point.address}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#832709] shrink-0 mt-0.5" />
                  <span>{point.hours}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-[#8B716E] shrink-0 mt-0.5" />
                  <span>{point.phone}</span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#DEC0BC]/40">
              <Link
                href="/productos"
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-sm bg-[#87201D] text-white text-xs font-bold hover:bg-[#A73832] transition-colors"
              >
                Hacer Pedido para este Punto
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
