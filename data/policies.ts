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
        content: 'Los datos compartidos voluntariamente por los clientes durante el proceso de pedido o atención son utilizados exclusivamente para la atención y coordinación de sus pedidos locales.',
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
        content: 'Por regla general, los pedidos requieren un mínimo de 24 horas de anticipación. Algunas modalidades, fechas o puntos especiales pueden habilitar tiempos distintos según disponibilidad.',
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
        title: '1. Entregas en Zonas Oficiales',
        content: 'Las entregas a domicilio en zonas oficiales se programan según la disponibilidad del servicio y la ubicación indicada durante el proceso de pedido.',
      },
      {
        title: '2. Otras Zonas de Tijuana',
        content: 'Para ubicaciones fuera del listado oficial, la cotización de entrega se determina según la ubicación indicada durante el proceso de pedido.',
      },
      {
        title: '3. Puntos de Entrega Especiales',
        content: 'Los puntos de entrega especiales (pickup) están disponibles únicamente para clientes autorizados. Las condiciones u horarios específicos se habilitarán directamente en el perfil del cliente.',
      },
    ],
  },
};
