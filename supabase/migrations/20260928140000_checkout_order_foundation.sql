-- =================================================================================
-- MIGRATION: 20260928140000_checkout_order_foundation.sql
-- PASS 8C.1A.1 — CHECKOUT BACKEND FOUNDATION (HARDENED)
--
-- 1. Agregar quantity a public.zanita_order_item_options.
-- 2. Eliminar default falso de 50% en public.zanita_orders.deposit_required_pct.
-- 3. Agregar idempotency_key e índice único parcial a public.zanita_orders.
-- 4. Crear función transaccional public.submit_order con SECURITY DEFINER y search_path = ''.
-- 5. Configurar permisos estrictos de ejecución (authenticated únicamente).
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. OPTION QUANTITY
-- ---------------------------------------------------------------------------------
ALTER TABLE public.zanita_order_item_options
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0);

-- ---------------------------------------------------------------------------------
-- 2. ELIMINAR DEFAULT FALSO DE 50% EN DEPOSIT_REQUIRED_PCT
-- ---------------------------------------------------------------------------------
ALTER TABLE public.zanita_orders
  ALTER COLUMN deposit_required_pct DROP NOT NULL,
  ALTER COLUMN deposit_required_pct DROP DEFAULT;

-- ---------------------------------------------------------------------------------
-- 3. IDEMPOTENCY KEY E ÍNDICE ÚNICO PARCIAL
-- ---------------------------------------------------------------------------------
ALTER TABLE public.zanita_orders
  ADD COLUMN IF NOT EXISTS idempotency_key uuid NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_zanita_orders_user_idempotency
  ON public.zanita_orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------------
-- 4. FUNCIÓN TRANSACCIONAL SUBMIT_ORDER
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_order(
  p_idempotency_key    uuid,
  p_customer_name      text,
  p_customer_phone     text,
  p_customer_email     text,
  p_requested_date     date,
  p_requested_time     time,
  p_delivery_point_id  uuid,
  p_delivery_address   text,
  p_notes              text,
  p_items              jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id                   uuid;
  v_existing_order            record;
  v_dp                        record;
  v_cetys_enabled             boolean;
  v_delivery_fee_cents        integer;
  v_delivery_quote_status     text;
  v_delivery_address          text;

  -- Store settings source-of-truth variables
  v_store_timezone            text;
  v_min_anticipation_hours    integer;
  v_cetys_schedule            jsonb;
  v_cetys_days                integer[];
  v_cetys_start               time;
  v_cetys_end                 time;
  v_tz_now                    timestamp without time zone;
  v_min_anticipation_interval interval;

  -- Sanitized customer inputs
  v_customer_name             text;
  v_customer_phone            text;
  v_customer_email            text;

  -- Item iteration & validation variables (bigint for safe accumulation)
  v_item                      jsonb;
  v_prod_id                   uuid;
  v_item_qty                  integer;
  v_item_qty_num              numeric;
  v_prod                      record;
  v_item_options              jsonb;
  v_item_extras_cents         bigint;
  v_base_unit_price_cents     bigint;
  v_final_unit_price_cents    bigint;
  v_item_subtotal_cents       bigint;
  v_products_subtotal_cents   bigint := 0;
  v_total_amount_cents        bigint;

  -- Option groups validation
  v_pog                       record;
  v_opt_elem                  jsonb;
  v_opt_id                    uuid;
  v_opt_qty                   integer;
  v_opt_qty_num               numeric;
  v_opt                       record;
  v_normal_qty                integer;
  v_always_charge_qty         integer;
  v_always_charge_cents       bigint;
  v_group_normal_cents        bigint;
  v_group_normal_unit_price   integer;
  v_excess_normal_qty         integer;
  v_matched_options_count     integer;

  -- Data collections for atomic persistence
  v_validated_items           jsonb := '[]'::jsonb;
  v_item_data                 jsonb;
  v_opt_data                  jsonb;
  v_validated_item_options    jsonb;
  v_seen_options              text[];

  -- Result handles
  v_order_id                  uuid;
  v_order_number              text;
  v_order_item_id             uuid;
BEGIN
  -- -------------------------------------------------------------------------------
  -- A. VALIDACIÓN DE AUTORIDAD (USUARIO AUTENTICADO)
  -- -------------------------------------------------------------------------------
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado. Debes iniciar sesión para realizar un pedido.' USING ERRCODE = 'P0001';
  END IF;

  -- -------------------------------------------------------------------------------
  -- B. IDEMPOTENCIA OBLIGATORIA (FAST PATH & NULL PROTECTION)
  -- -------------------------------------------------------------------------------
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'La clave de idempotencia (idempotency_key) es obligatoria.' USING ERRCODE = 'P0001';
  END IF;

  SELECT
    id,
    order_number,
    status,
    products_subtotal_cents,
    delivery_fee_cents,
    total_amount_cents,
    delivery_quote_status
  INTO v_existing_order
  FROM public.zanita_orders
  WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id',                v_existing_order.id,
      'order_number',            v_existing_order.order_number,
      'status',                  v_existing_order.status,
      'products_subtotal_cents', v_existing_order.products_subtotal_cents,
      'delivery_fee_cents',      v_existing_order.delivery_fee_cents,
      'total_amount_cents',      v_existing_order.total_amount_cents,
      'delivery_quote_status',   v_existing_order.delivery_quote_status,
      'is_idempotent_replay',    true
    );
  END IF;

  -- -------------------------------------------------------------------------------
  -- C. LECTURA DE STORE SETTINGS (SOURCE OF TRUTH)
  -- -------------------------------------------------------------------------------
  SELECT trim(both '"' from value::text) INTO v_store_timezone
  FROM public.zanita_store_settings
  WHERE key = 'timezone';

  IF v_store_timezone IS NULL OR length(v_store_timezone) = 0 THEN
    RAISE EXCEPTION 'Configuración de tienda no encontrada: timezone.' USING ERRCODE = 'P0030';
  END IF;

  SELECT (value::text)::integer INTO v_min_anticipation_hours
  FROM public.zanita_store_settings
  WHERE key = 'min_anticipation_hours';

  IF v_min_anticipation_hours IS NULL OR v_min_anticipation_hours < 0 THEN
    RAISE EXCEPTION 'Configuración de tienda no encontrada o inválida: min_anticipation_hours.' USING ERRCODE = 'P0031';
  END IF;

  SELECT value INTO v_cetys_schedule
  FROM public.zanita_store_settings
  WHERE key = 'cetys_pickup_schedule';

  IF v_cetys_schedule IS NULL THEN
    RAISE EXCEPTION 'Configuración de tienda no encontrada: cetys_pickup_schedule.' USING ERRCODE = 'P0032';
  END IF;

  -- -------------------------------------------------------------------------------
  -- D. VALIDACIÓN DE DATOS DEL CLIENTE Y LÍMITES DE ENTRADA
  -- -------------------------------------------------------------------------------
  v_customer_name  := trim(COALESCE(p_customer_name, ''));
  v_customer_phone := trim(COALESCE(p_customer_phone, ''));
  v_customer_email := trim(COALESCE(p_customer_email, ''));

  IF length(v_customer_name) = 0 OR length(v_customer_name) > 100 THEN
    RAISE EXCEPTION 'El nombre del cliente es obligatorio y no debe exceder 100 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF length(v_customer_phone) = 0 OR length(v_customer_phone) > 30 THEN
    RAISE EXCEPTION 'El teléfono de contacto es obligatorio y no debe exceder 30 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF length(v_customer_email) = 0 OR length(v_customer_email) > 150 THEN
    RAISE EXCEPTION 'El correo electrónico es obligatorio y no debe exceder 150 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF v_customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'El formato del correo electrónico es inválido.' USING ERRCODE = 'P0002';
  END IF;

  IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'Las notas del pedido no deben exceder 1000 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF p_delivery_address IS NOT NULL AND length(p_delivery_address) > 500 THEN
    RAISE EXCEPTION 'La dirección de entrega no debe exceder 500 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  -- -------------------------------------------------------------------------------
  -- E. REGLA DE ANTICIPACIÓN (STORE SETTINGS + TIMEZONE SEGURO)
  -- -------------------------------------------------------------------------------
  IF p_requested_date IS NULL OR p_requested_time IS NULL THEN
    RAISE EXCEPTION 'La fecha y hora solicitadas son obligatorias.' USING ERRCODE = 'P0003';
  END IF;

  v_tz_now := (now() AT TIME ZONE v_store_timezone);
  v_min_anticipation_interval := (v_min_anticipation_hours || ' hours')::interval;

  IF (p_requested_date + p_requested_time) < (v_tz_now + v_min_anticipation_interval) THEN
    RAISE EXCEPTION 'Los pedidos requieren solicitarse con al menos % horas de anticipación.', v_min_anticipation_hours USING ERRCODE = 'P0003';
  END IF;

  -- -------------------------------------------------------------------------------
  -- F. VALIDACIÓN DE PUNTO DE ENTREGA
  -- -------------------------------------------------------------------------------
  IF p_delivery_point_id IS NULL THEN
    RAISE EXCEPTION 'Debes seleccionar un punto o modalidad de entrega.' USING ERRCODE = 'P0004';
  END IF;

  SELECT * INTO v_dp
  FROM public.zanita_delivery_points
  WHERE id = p_delivery_point_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El punto de entrega seleccionado no existe o no está activo.' USING ERRCODE = 'P0004';
  END IF;

  -- Caso 1: CETYS (requiere permiso especial y horario de store_settings)
  IF v_dp.requires_special_pickup_permission THEN
    SELECT cetys_pickup_enabled INTO v_cetys_enabled
    FROM public.profiles
    WHERE id = v_user_id;

    IF COALESCE(v_cetys_enabled, false) = false THEN
      RAISE EXCEPTION 'No tienes autorización para seleccionar entrega en CETYS.' USING ERRCODE = 'P0005';
    END IF;

    -- Extraer días y horarios dinámicos desde store_settings
    BEGIN
      v_cetys_days  := ARRAY(SELECT jsonb_array_elements_text(v_cetys_schedule->'days')::integer);
      v_cetys_start := (v_cetys_schedule->>'start')::time;
      v_cetys_end   := (v_cetys_schedule->>'end')::time;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Error de formato en configuración de horario CETYS.' USING ERRCODE = 'P0032';
    END;

    IF NOT (EXTRACT(ISODOW FROM p_requested_date)::integer = ANY(v_cetys_days)) THEN
      RAISE EXCEPTION 'La entrega en CETYS solo está disponible de lunes a viernes.' USING ERRCODE = 'P0006';
    END IF;

    IF p_requested_time < v_cetys_start OR p_requested_time > v_cetys_end THEN
      RAISE EXCEPTION 'El horario de entrega en CETYS debe ser entre % y %.', v_cetys_start, v_cetys_end USING ERRCODE = 'P0007';
    END IF;

    v_delivery_fee_cents    := 0;
    v_delivery_quote_status := 'not_required';
    v_delivery_address      := v_dp.address;

  -- Caso 2: Otra ubicación (domicilio fuera de puntos oficiales)
  ELSIF v_dp.type = 'other' THEN
    IF length(trim(COALESCE(p_delivery_address, ''))) = 0 THEN
      RAISE EXCEPTION 'Debes proporcionar la dirección de entrega para la cotización de envío.' USING ERRCODE = 'P0008';
    END IF;

    v_delivery_fee_cents    := NULL;
    v_delivery_quote_status := 'pending';
    v_delivery_address      := trim(p_delivery_address);

  -- Caso 3: Puntos oficiales estándar (Alba Roja, Ermita, etc.)
  ELSE
    -- Regla de negocio confirmada: Mena cotiza manualmente el envío
    v_delivery_fee_cents    := NULL;
    v_delivery_quote_status := 'pending';
    v_delivery_address      := v_dp.address;
  END IF;

  -- -------------------------------------------------------------------------------
  -- G. VALIDACIÓN DE ITEMS Y OPCIONES CON CÁLCULO AUTORITATIVO DE PRECIOS
  -- -------------------------------------------------------------------------------
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío.' USING ERRCODE = 'P0009';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Estructura de ítem inválida en el carrito.' USING ERRCODE = 'P0010';
    END IF;

    BEGIN
      v_prod_id  := (v_item->>'product_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Identificador de producto inválido en el carrito.' USING ERRCODE = 'P0010';
    END;

    IF jsonb_typeof(v_item->'quantity') <> 'number' THEN
      RAISE EXCEPTION 'La cantidad del producto debe ser un número entero.' USING ERRCODE = 'P0010';
    END IF;

    v_item_qty_num := (v_item->>'quantity')::numeric;
    IF v_item_qty_num <> trunc(v_item_qty_num) OR v_item_qty_num <= 0 THEN
      RAISE EXCEPTION 'La cantidad del producto debe ser un entero positivo.' USING ERRCODE = 'P0010';
    END IF;
    v_item_qty := v_item_qty_num::integer;

    SELECT id, name, base_price_cents INTO v_prod
    FROM public.zanita_products
    WHERE id = v_prod_id AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado o inactivo en el catálogo.' USING ERRCODE = 'P0011';
    END IF;

    -- Validar options array
    IF v_item ? 'options' AND jsonb_typeof(v_item->'options') <> 'array' THEN
      RAISE EXCEPTION 'Estructura de opciones inválida para el producto "%".', v_prod.name USING ERRCODE = 'P0010';
    END IF;

    v_item_options := COALESCE(v_item->'options', '[]'::jsonb);

    -- Validar unicidad y tipos de opciones dentro del ítem
    v_seen_options := ARRAY[]::text[];
    FOR v_opt_elem IN SELECT * FROM jsonb_array_elements(v_item_options)
    LOOP
      IF jsonb_typeof(v_opt_elem) <> 'object' THEN
        RAISE EXCEPTION 'Estructura de opción inválida en el producto "%".', v_prod.name USING ERRCODE = 'P0010';
      END IF;

      BEGIN
        v_opt_id := (v_opt_elem->>'option_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Identificador de opción inválido en el producto "%".', v_prod.name USING ERRCODE = 'P0010';
      END;

      IF jsonb_typeof(v_opt_elem->'quantity') <> 'number' THEN
        RAISE EXCEPTION 'La cantidad de la opción debe ser un número entero.' USING ERRCODE = 'P0010';
      END IF;

      v_opt_qty_num := (v_opt_elem->>'quantity')::numeric;
      IF v_opt_qty_num <> trunc(v_opt_qty_num) OR v_opt_qty_num <= 0 THEN
        RAISE EXCEPTION 'La cantidad de cada opción seleccionada debe ser mayor a 0.' USING ERRCODE = 'P0010';
      END IF;
      v_opt_qty := v_opt_qty_num::integer;

      -- Defensa contra opciones duplicadas enviadas en líneas separadas
      IF v_opt_id::text = ANY(v_seen_options) THEN
        RAISE EXCEPTION 'Opción duplicada: la opción con ID % debe enviarse en una sola línea con su cantidad total.', v_opt_id USING ERRCODE = 'P0014';
      END IF;
      v_seen_options := array_append(v_seen_options, v_opt_id::text);

      -- Validar existencia y estado activo de la opción
      -- Reserved for future per-product option overrides (zanita_product_options).
      -- MVP validation uses product-group association + active group options.
      SELECT o.id, o.group_id, o.name, o.additional_price_cents, o.always_charge, o.is_active
      INTO v_opt
      FROM public.zanita_options o
      WHERE o.id = v_opt_id;

      IF NOT FOUND OR v_opt.is_active = false THEN
        RAISE EXCEPTION 'Una de las opciones seleccionadas no existe o está inactiva.' USING ERRCODE = 'P0015';
      END IF;

      -- Verificar que el grupo de esta opción esté realmente asociado al producto
      IF NOT EXISTS (
        SELECT 1
        FROM public.zanita_product_option_groups pog
        JOIN public.zanita_option_groups og ON og.id = pog.group_id
        WHERE pog.product_id = v_prod.id AND pog.group_id = v_opt.group_id AND og.is_active = true
      ) THEN
        RAISE EXCEPTION 'La opción "%" no pertenece a ningún grupo disponible para "%".', v_opt.name, v_prod.name USING ERRCODE = 'P0016';
      END IF;
    END LOOP;

    -- Validar TODOS los grupos de opciones configurados para este producto (incluso si no enviaron opciones)
    v_item_extras_cents      := 0;
    v_matched_options_count  := 0;
    v_validated_item_options := '[]'::jsonb;

    FOR v_pog IN
      SELECT
        pog.group_id,
        pog.is_required,
        pog.min_selections,
        pog.max_selections,
        pog.included_selections,
        pog.allow_repeats,
        og.name AS group_name
      FROM public.zanita_product_option_groups pog
      JOIN public.zanita_option_groups og ON og.id = pog.group_id
      WHERE pog.product_id = v_prod.id AND og.is_active = true
      ORDER BY pog.display_order ASC
    LOOP
      v_normal_qty              := 0;
      v_always_charge_qty       := 0;
      v_always_charge_cents     := 0;
      v_group_normal_cents      := 0;
      v_group_normal_unit_price := NULL;

      FOR v_opt_elem IN SELECT * FROM jsonb_array_elements(v_item_options)
      LOOP
        v_opt_id  := (v_opt_elem->>'option_id')::uuid;
        v_opt_qty := (v_opt_elem->>'quantity')::integer;

        SELECT id, group_id, name, additional_price_cents, always_charge
        INTO v_opt
        FROM public.zanita_options
        WHERE id = v_opt_id AND group_id = v_pog.group_id;

        IF FOUND THEN
          v_matched_options_count := v_matched_options_count + 1;

          IF v_pog.allow_repeats = false AND v_opt_qty > 1 THEN
            RAISE EXCEPTION 'El grupo "%" del producto "%" no permite seleccionar opciones repetidas.', v_pog.group_name, v_prod.name USING ERRCODE = 'P0017';
          END IF;

          IF v_opt.always_charge THEN
            v_always_charge_qty   := v_always_charge_qty + v_opt_qty;
            v_always_charge_cents := v_always_charge_cents + (v_opt_qty::bigint * v_opt.additional_price_cents);
          ELSE
            v_normal_qty := v_normal_qty + v_opt_qty;

            IF v_pog.included_selections > 0 THEN
              -- Regla 21: Toppings normales con included_selections deben tener precio homogéneo
              IF v_group_normal_unit_price IS NULL THEN
                v_group_normal_unit_price := v_opt.additional_price_cents;
              ELSIF v_group_normal_unit_price <> v_opt.additional_price_cents THEN
                RAISE EXCEPTION 'Configuración de precios heterogénea no soportada en el grupo "%".', v_pog.group_name USING ERRCODE = 'P0018';
              END IF;
            ELSE
              v_group_normal_cents := v_group_normal_cents + (v_opt_qty::bigint * v_opt.additional_price_cents);
            END IF;
          END IF;

          -- Registrar snapshot de la opción para persistencia
          v_validated_item_options := v_validated_item_options || jsonb_build_object(
            'option_id',               v_opt.id,
            'option_name',             v_opt.name,
            'group_name',              v_pog.group_name,
            'additional_price_cents',  v_opt.additional_price_cents,
            'quantity',                v_opt_qty
          );
        END IF;
      END LOOP;

      -- Validar requerimientos del grupo (aplica aunque el cliente no haya enviado opciones de este grupo)
      IF v_pog.is_required AND v_normal_qty < v_pog.min_selections THEN
        RAISE EXCEPTION 'Faltan opciones en el grupo "%" de "%": mínimo % requerido(s), seleccionado(s) %.',
          v_pog.group_name, v_prod.name, v_pog.min_selections, v_normal_qty USING ERRCODE = 'P0019';
      END IF;

      IF v_pog.max_selections IS NOT NULL AND v_normal_qty > v_pog.max_selections THEN
        RAISE EXCEPTION 'El grupo "%" de "%" excede el máximo permitido de % (seleccionado(s) %).',
          v_pog.group_name, v_prod.name, v_pog.max_selections, v_normal_qty USING ERRCODE = 'P0020';
      END IF;

      -- Calcular excedente si tiene selecciones incluidas
      IF v_pog.included_selections > 0 THEN
        v_excess_normal_qty  := GREATEST(0, v_normal_qty - v_pog.included_selections);
        v_group_normal_cents := v_excess_normal_qty::bigint * COALESCE(v_group_normal_unit_price, 0);
      END IF;

      v_item_extras_cents := v_item_extras_cents + v_always_charge_cents + v_group_normal_cents;
    END LOOP;

    -- Verificar que no haya opciones huérfanas que no pertenezcan a los grupos del producto
    IF v_matched_options_count <> jsonb_array_length(v_item_options) THEN
      RAISE EXCEPTION 'Una o más opciones enviadas no pertenecen a los grupos de opciones de "%".', v_prod.name USING ERRCODE = 'P0021';
    END IF;

    -- Cálculos monetarios seguros del ítem
    v_base_unit_price_cents   := v_prod.base_price_cents;
    v_final_unit_price_cents  := v_base_unit_price_cents + v_item_extras_cents;
    v_item_subtotal_cents     := v_final_unit_price_cents * v_item_qty;
    v_products_subtotal_cents := v_products_subtotal_cents + v_item_subtotal_cents;

    v_validated_items := v_validated_items || jsonb_build_object(
      'product_id',        v_prod.id,
      'product_name',      v_prod.name,
      'base_price_cents',  v_base_unit_price_cents,
      'final_price_cents', v_final_unit_price_cents,
      'quantity',          v_item_qty,
      'subtotal_cents',    v_item_subtotal_cents,
      'options',           v_validated_item_options
    );
  END LOOP;

  -- -------------------------------------------------------------------------------
  -- H. CÁLCULO DE TOTALES Y VALIDACIÓN DE RANGO INTEGER
  -- -------------------------------------------------------------------------------
  v_total_amount_cents := v_products_subtotal_cents + COALESCE(v_delivery_fee_cents, 0);

  IF v_total_amount_cents > 2147483647 THEN
    RAISE EXCEPTION 'El monto total del pedido excede el límite del sistema.' USING ERRCODE = 'P0035';
  END IF;

  -- -------------------------------------------------------------------------------
  -- I. INSERCIÓN ATÓMICA DE LA ORDEN (CON CAPTURA ROBUSTA DE IDEMPOTENCY VIOLATION)
  -- -------------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.zanita_orders (
      user_id,
      idempotency_key,
      customer_name_snapshot,
      customer_phone_snapshot,
      customer_email_snapshot,
      status,
      products_subtotal_cents,
      delivery_fee_cents,
      total_amount_cents,
      deposit_required_pct,
      amount_paid_cents,
      requested_date,
      requested_time,
      delivery_point_id,
      delivery_name_snapshot,
      delivery_type_snapshot,
      delivery_address_snapshot,
      delivery_requires_quote_snapshot,
      delivery_quote_status,
      notes
    ) VALUES (
      v_user_id,
      p_idempotency_key,
      v_customer_name,
      v_customer_phone,
      v_customer_email,
      'pending_approval',
      v_products_subtotal_cents::integer,
      v_delivery_fee_cents,
      v_total_amount_cents::integer,
      NULL,
      0,
      p_requested_date,
      p_requested_time,
      p_delivery_point_id,
      v_dp.name,
      v_dp.type,
      v_delivery_address,
      v_dp.requires_quote,
      v_delivery_quote_status,
      p_notes
    )
    RETURNING id, order_number INTO v_order_id, v_order_number;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT
        id,
        order_number,
        status,
        products_subtotal_cents,
        delivery_fee_cents,
        total_amount_cents,
        delivery_quote_status
      INTO v_existing_order
      FROM public.zanita_orders
      WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'order_id',                v_existing_order.id,
          'order_number',            v_existing_order.order_number,
          'status',                  v_existing_order.status,
          'products_subtotal_cents', v_existing_order.products_subtotal_cents,
          'delivery_fee_cents',      v_existing_order.delivery_fee_cents,
          'total_amount_cents',      v_existing_order.total_amount_cents,
          'delivery_quote_status',   v_existing_order.delivery_quote_status,
          'is_idempotent_replay',    true
        );
      ELSE
        -- Si la violación de unicidad no fue por idempotency_key, relanzar el error original
        RAISE;
      END IF;
  END;

  -- -------------------------------------------------------------------------------
  -- J. INSERCIÓN DE ORDER ITEMS Y ORDER ITEM OPTIONS
  -- -------------------------------------------------------------------------------
  FOR v_item_data IN SELECT * FROM jsonb_array_elements(v_validated_items)
  LOOP
    INSERT INTO public.zanita_order_items (
      order_id,
      product_id,
      product_name_snapshot,
      base_unit_price_snapshot_cents,
      final_unit_price_snapshot_cents,
      quantity,
      subtotal_cents
    ) VALUES (
      v_order_id,
      (v_item_data->>'product_id')::uuid,
      v_item_data->>'product_name',
      (v_item_data->>'base_price_cents')::integer,
      (v_item_data->>'final_price_cents')::integer,
      (v_item_data->>'quantity')::integer,
      (v_item_data->>'subtotal_cents')::integer
    )
    RETURNING id INTO v_order_item_id;

    FOR v_opt_data IN SELECT * FROM jsonb_array_elements(v_item_data->'options')
    LOOP
      INSERT INTO public.zanita_order_item_options (
        order_item_id,
        option_id,
        option_name_snapshot,
        group_name_snapshot,
        additional_price_snapshot_cents,
        quantity
      ) VALUES (
        v_order_item_id,
        (v_opt_data->>'option_id')::uuid,
        v_opt_data->>'option_name',
        v_opt_data->>'group_name',
        (v_opt_data->>'additional_price_cents')::integer,
        (v_opt_data->>'quantity')::integer
      );
    END LOOP;
  END LOOP;

  -- -------------------------------------------------------------------------------
  -- K. RESPUESTA EXITOSA
  -- -------------------------------------------------------------------------------
  RETURN jsonb_build_object(
    'order_id',                v_order_id,
    'order_number',            v_order_number,
    'status',                  'pending_approval',
    'products_subtotal_cents', v_products_subtotal_cents::integer,
    'delivery_fee_cents',      v_delivery_fee_cents,
    'total_amount_cents',      v_total_amount_cents::integer,
    'delivery_quote_status',   v_delivery_quote_status,
    'is_idempotent_replay',    false
  );
END;
$$;

-- ---------------------------------------------------------------------------------
-- 5. PERMISOS ESTRICTOS DE EJECUCIÓN (TABLAS PERMANECEN CERRADAS)
-- ---------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.submit_order(uuid, text, text, text, date, time, uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_order(uuid, text, text, text, date, time, uuid, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_order(uuid, text, text, text, date, time, uuid, text, text, jsonb) TO authenticated;
