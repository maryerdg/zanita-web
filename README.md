# Zanita Web

Sitio web y catálogo de pedidos programados para Zanita, negocio local de Tijuana especializado en manzanas, uvas, charolas y snacks preparados con chamoy y toppings.

## Estado del proyecto

El proyecto se encuentra en fase activa de desarrollo frontend e implementación de marca.

Las funcionalidades completas de carrito interactivo, cuentas de usuario, procesamiento de pagos en línea, inventario en tiempo real y panel operativo se implementarán gradualmente en fases posteriores. Actualmente, la plataforma opera como una vitrina digital y catálogo informativo orientado a la recepción y coordinación de pedidos mediante canales oficiales.

## Identidad visual

El sistema de diseño refleja la personalidad de la marca mediante la paleta cromática oficial y tipografías seleccionadas:

Paleta oficial:
- Rojo: #A73832
- Rosa: #F09CA9
- Crema: #F5EBDC
- Terracota: #D46240

Tipografías web seleccionadas para la implementación:
- Cormorant Garamond: títulos editoriales
- Birthstone: acentos decorativos
- Manrope: contenido e interfaz

El logotipo e imagotipos de Zanita se integran mediante assets gráficos oficiales procesados en formato WebP con transparencia.

## Información confirmada

- Pedidos solicitados con un mínimo de 3 días de anticipación.
- Entregas a domicilio programadas en Tijuana, B.C.
- Zonas oficiales de entrega (Alba Roja, Ermita, Las Palmas, Hipódromo, Las Ferias, CETYS y Punto Medio) con costo adicional de $30 MXN.
- Envíos a otras zonas de Tijuana sujetos a cotización personalizada entre $50 MXN y $100 MXN según distancia.
- Único punto de recolección presencial (pickup) disponible en CETYS, de lunes a viernes de 4:00 p.m. a 8:00 p.m.
- No existe modalidad de pickup gratuito en ningún punto.
- Atención y coordinación de pedidos mediante WhatsApp e Instagram.

## Rutas actuales

- `/` (Home con hero editorial, categorías principales, productos destacados e información de pedidos)
- `/productos` (Catálogo completo de productos estructurado por categorías)
- `/productos/[slug]` (Vista de detalle individual por producto)
- `/nosotros` (Información sobre la historia y operación por Ximena en Tijuana)
- `/puntos-de-entrega` (Detalle de zonas de entrega, tarifas y condiciones de pickup)

## Tecnologías

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Lucide React
- Vercel

## Desarrollo local

1. Clonar el repositorio e instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor local de desarrollo:
```bash
npm run dev
```

3. Ejecutar la revisión de linter:
```bash
npm run lint
```

4. Generar la compilación de producción:
```bash
npm run build
```

## Seguridad

- No se incluyen API keys, access tokens ni credenciales en el código fuente.
- Los archivos de variables de entorno `.env` y `.env.local` se encuentran excluidos mediante `.gitignore`.
- Se proporciona únicamente `.env.example` como plantilla de referencia para configuraciones futuras.
- Todas las integraciones con servicios externos permanecen desactivadas hasta su configuración por variables de entorno.

## Contacto oficial

- Instagram: https://www.instagram.com/zanita.tj/
- WhatsApp: https://wa.me/526647546738

## Desarrollo

Diseñado y desarrollado por [MARYER Digital](https://www.instagram.com/maryer.digital/).
