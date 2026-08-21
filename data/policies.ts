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
    title: 'Aviso de Privacidad',
    lastUpdated: '21 de Agosto, 2026',
    summary: 'En Zanita respetamos profundamente la privacidad de nuestros clientes y nos comprometemos a proteger sus datos personales.',
    sections: [
      {
        title: '1. Recopilación de Información',
        content: 'Recopilamos información estrictamente necesaria para procesar tus pedidos de snacks artesanales, coordinar entregas y brindar una atención personalizada. Esto incluye nombre, teléfono, dirección de entrega y correo electrónico.',
      },
      {
        title: '2. Uso de los Datos',
        content: 'Tus datos no serán vendidos, cedidos ni compartidos con terceros con fines publicitarios ajenos a Zanita. Únicamente se emplean para la gestión de envíos y comunicación directa de tu pedido.',
      },
      {
        title: '3. Derechos ARCO',
        content: 'Puedes solicitar en cualquier momento la actualización, cancelación o rectificación de tus datos personales enviando una solicitud a hola@zanita.mx.',
      },
    ],
  },
  terminos: {
    id: 'policy-terminos',
    slug: 'terminos-y-condiciones',
    title: 'Términos y Condiciones',
    lastUpdated: '21 de Agosto, 2026',
    summary: 'Condiciones generales de compra, frescura de producto y entrega de nuestros snacks artesanales.',
    sections: [
      {
        title: '1. Producción Artesanal y Frescura',
        content: 'Nuestros productos son elaborados artesanalmente en pequeños lotes con ingredientes naturales y sin conservadores sintéticos. Las características organolépticas pueden variar ligeramente entre lotes debido al origen natural de las frutas y especias.',
      },
      {
        title: '2. Precios y Disponibilidad',
        content: 'Todos los precios están expresados en pesos mexicanos (MXN) e incluyen impuestos correspondientes. La disponibilidad de sabores puede estar sujeta a la temporada de cosecha de fruta.',
      },
      {
        title: '3. Cancelaciones y Cambios',
        content: 'Debido a la naturaleza perecedera de los alimentos artesanales, las cancelaciones son aceptadas hasta 24 horas antes de la fecha programada de elaboración/despacho.',
      },
    ],
  },
  envios: {
    id: 'policy-envios',
    slug: 'politica-de-envios',
    title: 'Política de Envíos y Entregas',
    lastUpdated: '21 de Agosto, 2026',
    summary: 'Información sobre tiempos de preparación, rutas de entrega local y envíos nacionales.',
    sections: [
      {
        title: '1. Tiempos de Elaboración',
        content: 'Dado que deshidratamos y preparamos el chamoy de forma artesanal, cada pedido requiere entre 24 y 48 horas de preparación antes de salir a ruta.',
      },
      {
        title: '2. Puntos de Entrega y Cobertura',
        content: 'Ofrecemos entrega directa en nuestros puntos de distribución autorizados sin costo adicional, así como envío a domicilio con tarifa fija en zona metropolitana.',
      },
      {
        title: '3. Recepción del Pedido',
        content: 'Al recibir tu empaque, verifica que el sello de garantía artesanal esté intacto. En caso de alguna anomalía en el empaque, notifícalo de inmediato con foto a nuestro WhatsApp de soporte.',
      },
    ],
  },
};
