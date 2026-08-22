export interface Policy {
  id: string;
  slug: string;
  title: string;
  lastUpdated: string;
  summary: string;
  sections: { title: string; content: string }[];
}

export const POLICIES: Record<string, Policy> = {
  privacidad: {
    id: 'policy-privacidad',
    slug: 'aviso-de-privacidad',
    title: 'Aviso de Privacidad (Preliminar - Pendiente de Aprobación)',
    lastUpdated: 'Borrador preliminar en revisión por la marca',
    summary: 'Información preliminar sobre el manejo de datos para la recepción y coordinación de pedidos en Tijuana.',
    sections: [
      {
        title: '1. Estado Preliminar',
        content: 'Este documento es un borrador informativo preliminar. El aviso de privacidad definitivo se publicará una vez aprobado formalmente por la marca.',
      },
      {
        title: '2. Recepción de Pedidos',
        content: 'Los datos compartidos voluntariamente por los clientes mediante WhatsApp o Instagram son utilizados exclusivamente para la atención y coordinación de sus pedidos locales.',
      },
    ],
  },
  terminos: {
    id: 'policy-terminos',
    slug: 'terminos-y-condiciones',
    title: 'Términos de Servicio (Preliminar - Pendiente de Aprobación)',
    lastUpdated: 'Borrador preliminar en revisión por la marca',
    summary: 'Borrador informativo sobre la modalidad de pedidos programados y condiciones de entrega.',
    sections: [
      {
        title: '1. Anticipación de Pedidos',
        content: 'Todos los pedidos deben realizarse con un mínimo de 3 días de anticipación para organizar la preparación y las rutas disponibles.',
      },
      {
        title: '2. Estado de los Términos',
        content: 'Las condiciones definitivas de venta se actualizarán formalmente al concretar los lineamientos operativos de la marca.',
      },
    ],
  },
  envios: {
    id: 'policy-envios',
    slug: 'politica-de-envios',
    title: 'Zonas y Modalidades de Entrega (Preliminar)',
    lastUpdated: 'Borrador preliminar en revisión por la marca',
    summary: 'Información sobre tarifas de entrega por zona, horarios de recolección en CETYS y condiciones.',
    sections: [
      {
        title: '1. Entregas en Zonas Oficiales ($30 MXN Extra)',
        content: 'Las entregas en Alba Roja, Ermita, Las Palmas, Hipódromo, Las Ferias, CETYS y Punto Medio tienen un costo adicional de $30 MXN. De lunes a viernes antes de las 2:00 p.m. se realiza la entrega a domicilio en estas zonas. Los sábados y domingos se manejan entregas programadas.',
      },
      {
        title: '2. Otras Zonas de Tijuana',
        content: 'Para ubicaciones fuera del listado oficial se requiere cotización previa de envío, la cual oscila entre $50 MXN y $100 MXN según la distancia.',
      },
      {
        title: '3. Condición de Pickup en CETYS',
        content: 'El único lugar disponible para recolección presencial es en CETYS, de lunes a viernes de 4:00 p.m. a 8:00 p.m. No existe modalidad de pickup gratuito (incluyendo CETYS). El costo o condición específica del pickup en CETYS se encuentra actualmente pendiente de confirmación formal por la marca.',
      },
    ],
  },
};
