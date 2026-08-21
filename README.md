# Zanita E-Commerce (Web App)

Plataforma e-commerce y sistema de gestión de pedidos para **Zanita**, marca de snacks artesanales picantes y deshidratados elaborados a base de frutas y especias naturales.

## 🎨 Sistema de Diseño
* **Tipografía**:
  * Títulos y Encabezados: `Playfair Display` (Serif editorial)
  * Cuerpo e Interfaz: `Manrope` (Sans-serif funcional)
* **Paleta de Colores**:
  * Primary (Deep Apple Red): `#87201d`
  * Primary Container: `#a73832`
  * Surface (Warm Cream): `#fff8f1`
  * Surface Container: `#f7edde`
  * Secondary (Soft Pink Accent): `#8e4a56` / `#ffa9b6`
  * Terracotta: `#832709`

## 🚀 Tecnologías
* **Framework**: Next.js (App Router)
* **Lenguaje**: TypeScript
* **Estilos**: Tailwind CSS (CSS-First Token Configuration)
* **Iconos**: `lucide-react`
* **Despliegue Objetivo**: Vercel

## 📂 Estructura de Rutas (Fase 1)
* `/`: Inicio / Home con productos destacados, historias y llamada a la acción.
* `/productos`: Catálogo completo de snacks artesanales con filtros por nivel de picante y tipo.
* `/productos/[slug]`: Detalle de producto con selector de peso/presentación, ingrediente y picante.
* `/nosotros`: Historia de la marca y artesanía.
* `/puntos-de-entrega`: Información de cobertura y puntos de distribución.

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar linters
npm run lint

# Compilar para producción
npm run build
```

## 🔒 Variables de Entorno
Copia `.env.example` a `.env.local` si requiere variables locales. Nunca commitear secretos ni credenciales reales.
