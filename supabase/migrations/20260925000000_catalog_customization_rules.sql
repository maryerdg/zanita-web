-- Agrega soporte para personalización avanzada en el catálogo

-- 1. Modificar tabla zanita_product_option_groups
ALTER TABLE public.zanita_product_option_groups
  ADD COLUMN included_selections integer NOT NULL DEFAULT 0 CHECK (included_selections >= 0),
  ADD COLUMN allow_repeats boolean NOT NULL DEFAULT false;

-- Asegurar que max_selections sea al menos included_selections
ALTER TABLE public.zanita_product_option_groups
  ADD CONSTRAINT check_included_selections CHECK (max_selections >= included_selections);

-- 2. Modificar tabla zanita_options
-- Soporte para toppings premium que siempre cobran (ej. Uvas Forradas)
ALTER TABLE public.zanita_options
  ADD COLUMN always_charge boolean NOT NULL DEFAULT false;

-- Nota para PASS 8C:
-- public.zanita_order_item_options no soporta "quantity" actualmente.
-- Se deberá agregar 'quantity integer NOT NULL DEFAULT 1' en PASS 8C para
-- almacenar repeticiones (ej. 2x Skwinkles) en la orden final.

-- Modificar max_selections para que NULL signifique "sin límite"
ALTER TABLE public.zanita_product_option_groups
  ALTER COLUMN max_selections DROP NOT NULL,
  ALTER COLUMN max_selections DROP DEFAULT;
