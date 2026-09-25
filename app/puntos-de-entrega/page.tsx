import { Calendar, MapPin, CheckCircle2, MessageSquare } from 'lucide-react';
import { SITE_CONFIG } from '@/config/site';
import { createClient } from '@/lib/supabase/server';

const officialZones = [
  'Alba Roja',
  'Ermita',
  'Las Palmas',
  'Hipódromo',
  'Las Ferias',
  'Punto Medio'
];

export default async function DeliveryPointsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let cetysPickupEnabled = false;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('cetys_pickup_enabled')
      .eq('id', user.id)
      .single();
    if (profile?.cetys_pickup_enabled) {
      cetysPickupEnabled = true;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 space-y-12">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-[#261C19]">
          Entregas & Ubicaciones
        </h1>
        <p className="text-sm md:text-base text-[#6E564F] max-w-2xl mx-auto leading-relaxed">
          Consulta la información sobre nuestros puntos oficiales de entrega, horarios y posibilidades de cotizar envíos a otras ubicaciones. Ten en cuenta que algunas opciones pueden variar según tu cuenta.
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
          <div className="border-b border-[#E4D5C1] pb-4">
            <h2 className="font-serif font-bold text-xl text-[#261C19]">Puntos oficiales de entrega</h2>
            <p className="text-xs text-[#6E564F] mt-1">Selecciona uno de nuestros puntos disponibles al finalizar tu pedido.</p>
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
            <h3 className="font-serif font-bold text-sm text-[#D46240]">Otras ubicaciones</h3>
            <p className="text-xs text-[#6E564F] leading-relaxed">
              Las entregas en ubicaciones fuera del listado oficial requieren cotización de envío, la cual oscila entre <strong>$50 MXN y $100 MXN</strong> según la distancia.
            </p>
          </div>
        </div>

        {/* Schedule & Pickup Rules */}
        <div className="md:col-span-6 space-y-6">
          {/* Pickup CETYS - ONLY VISIBLE IF cetys_pickup_enabled is true */}
          {cetysPickupEnabled && (
            <div className="bg-white p-6 rounded-2xl border border-[#E4D5C1] space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-[#A73832] font-serif font-bold text-lg">
                <MapPin className="w-5 h-5" />
                <h2>Pickup CETYS</h2>
              </div>
              <div className="space-y-3 text-xs md:text-sm text-[#6E564F]">
                <p>
                  <strong>Disponible de lunes a viernes, de 4:00 p.m. a 8:00 p.m.</strong>
                </p>
                <div className="p-3.5 bg-[#FFF9F2] rounded-xl border border-[#E4D5C1] space-y-1 text-xs text-[#D46240]">
                  <p className="leading-relaxed text-[#6E564F]">
                    Esta opción estará disponible al finalizar tu pedido.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Schedule Block */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4D5C1] space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[#D46240] font-serif font-bold text-lg">
              <Calendar className="w-5 h-5" />
              <h2>Horarios y modalidades de entrega</h2>
            </div>
            <ul className="space-y-3 text-xs md:text-sm text-[#6E564F]">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#A73832] shrink-0 mt-1.5" />
                <span><strong>Lunes a viernes (antes de las 2:00 p.m.):</strong> Entregas programadas en los puntos oficiales disponibles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4F7942] shrink-0 mt-1.5" />
                <span><strong>Sábados y domingos:</strong> Entregas programadas bajo agenda y disponibilidad.</span>
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
