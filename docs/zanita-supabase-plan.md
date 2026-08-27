# Zanita Web - Plan Técnico de Supabase

## 1. Contexto y Arquitectura
- **Proyecto Supabase compartido temporalmente** con MARYER Digital.
- **Preservación total** de las tablas `public.leads` y `public.lead_events`. Estas se consideran datos de producción intocables.
- Todo objeto nuevo usará el prefijo **`zanita_`**.
- La futura separación de Zanita a otro proyecto está contemplada.

## 2. Autenticación y Perfiles
- **Auth compartido**: `auth.users` es global.
- **Sin trigger global**: La creación del perfil en `zanita_profiles` se hará explícitamente desde una Server Action al completar el registro en Zanita.
- **Aislamiento RLS**: La autorización se basa estrictamente en `zanita_profiles.role` (`customer`, `cetys`, `admin`).
- Nunca se confía en `user_metadata` para autorizar roles.
- El usuario solo puede auto-registrarse como `customer`.

## 3. Precios y Reglas de Negocio
- Los precios se manejan estrictamente en **centavos** (ej. $50 MXN = 5000 centavos).
- **Compra mínima**: 15000 centavos ($150 MXN).
- **Anticipación mínima**: 24 horas.
- **Punto de Entrega CETYS**: Oculto y restringido. Solo visible/utilizable por usuarios con rol `cetys` o `admin`.
- **Store Settings**: Protegidas por `is_public`. Solo las operativas esenciales son visibles.

## 4. Pedidos y Transacciones (Fase 2A - PENDIENTE)
- **Estado**: La creación atómica de pedidos *sigue pendiente* y no ha sido implementada en la fase inicial.
- **Estrategia Recomendada**: Se recomienda una función RPC transaccional en PostgreSQL, estrictamente validada, con `SECURITY DEFINER` y `search_path` fijo.
  - Deberá exigir `auth.uid()` para evitar creación de pedidos anónimos.
  - Recalculará los precios leyendo `zanita_products` desde la base de datos (ignorando subtotales enviados por el navegador).
  - Validará disponibilidad de toppings, montos mínimos, restricciones de horarios/anticipación y roles para el punto CETYS.
  - Se le **revocará la ejecución** a `PUBLIC` y a `anon`, concediéndola *exclusivamente* a `authenticated`.
  - **Prohibido**: No usar `service_role` ni cliente privilegiado para esto en el navegador o backend sin demostrar atomicidad.
  - Cualquier alternativa *server-side* externa (ej: transacciones mediante Prisma u otro ORM) deberá demostrar atomicidad real antes de ser aprobada.

## 5. Clientes y Next.js 16
- Se utiliza `@supabase/ssr` como mecanismo vigente (con manejo asíncrono de cookies y `proxy.ts`).
- No se agregará `SUPABASE_SERVICE_ROLE_KEY` por defecto.
- Solo se usarán `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
