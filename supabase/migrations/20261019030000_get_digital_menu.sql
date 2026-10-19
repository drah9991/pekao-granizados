-- =============================================================================
-- Menú digital público: RPC get_digital_menu
--
-- /digital-menu (sin sesión) leía directamente products (select *),
-- store_stock, machine_tanks y recipes como anon. Eso choca con los permisos
-- por columna de products (20261019000000) y con activar RLS en el resto: anon
-- no debe leer stock, recetas ni tanques.
--
-- Esta función calcula en el servidor la misma disponibilidad que hacía
-- useDigitalMenu y devuelve solo lo que muestra la carta pública:
--   [{ code, label, emoji_icon, items: [{ id, name, description, price, images,
--      is_starred, available_qty, min_qty, stock_status }] }]
--
-- Las columnas de product_types_config y machine_tanks se leen con
-- to_jsonb(fila)->>'columna' porque staging tiene una versión antigua de esas
-- tablas: si falta una columna, el valor es NULL en lugar de un error.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_digital_menu(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_default_min_qty constant numeric := 10;   -- igual que el cliente: min_qty || 10
  c_low_tank_ml constant numeric := 1000;     -- tanque por debajo de 1 L = pocas unidades
  v_has_low_tank boolean;
  v_menu jsonb;
BEGIN
  IF p_store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = p_store_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.machine_tanks t
    WHERE t.store_id = p_store_id
      AND (to_jsonb(t)->>'current_volume_ml')::numeric <= c_low_tank_ml
  ) INTO v_has_low_tank;

  WITH configs AS (
    SELECT
      to_jsonb(c)->>'code' AS code,
      to_jsonb(c)->>'label' AS label,
      to_jsonb(c)->>'emoji_icon' AS emoji_icon,
      coalesce((to_jsonb(c)->>'track_mixture_inventory')::boolean, false) AS tracks_mixture
    FROM public.product_types_config c
    WHERE coalesce((to_jsonb(c)->>'active')::boolean, false)
      AND (to_jsonb(c)->>'store_id' IS NULL OR (to_jsonb(c)->>'store_id')::uuid = p_store_id)
  ),
  items AS (
    SELECT
      p.id, p.name, p.description, p.price, p.images, p.is_starred, p.type::text AS type,
      s.product_id IS NOT NULL AS has_stock_row,
      coalesce(nullif(s.min_qty, 0), c_default_min_qty) AS min_qty,
      -- Igual que el cliente: qty de store_stock; si no hay, el stock del primer insumo de la receta.
      coalesce(
        s.qty,
        (SELECT i.stock
           FROM public.recipes r
           JOIN public.inventory_items i ON i.id = r.inventory_item_id
          WHERE r.product_id = p.id
          ORDER BY r.id
          LIMIT 1),
        0
      ) AS available_qty
    FROM public.products p
    LEFT JOIN public.store_stock s ON s.product_id = p.id AND s.store_id = p_store_id
    WHERE p.active = true
      AND p.is_public = true
      AND (p.store_id = p_store_id OR p.store_id IS NULL)
  ),
  categories AS (
    SELECT
      c.label,
      jsonb_build_object(
        'code', c.code,
        'label', c.label,
        'emoji_icon', c.emoji_icon,
        'items', jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'description', i.description,
            'price', i.price,
            'images', coalesce(i.images, '{}'::text[]),
            'is_starred', coalesce(i.is_starred, false),
            'available_qty', i.available_qty,
            'min_qty', i.min_qty,
            'stock_status', CASE
              WHEN c.tracks_mixture THEN
                CASE
                  WHEN i.available_qty <= 0 AND i.has_stock_row THEN 'out_of_stock'
                  WHEN v_has_low_tank THEN 'low_stock'
                  ELSE 'available'
                END
              WHEN i.available_qty <= 0 THEN 'out_of_stock'
              WHEN i.available_qty <= i.min_qty THEN 'low_stock'
              ELSE 'available'
            END
          )
          ORDER BY i.name
        )
      ) AS category
    FROM configs c
    JOIN items i ON i.type = c.code
    GROUP BY c.code, c.label, c.emoji_icon, c.tracks_mixture
  )
  SELECT coalesce(jsonb_agg(category ORDER BY label), '[]'::jsonb) INTO v_menu FROM categories;

  RETURN v_menu;
END;
$$;

REVOKE ALL ON FUNCTION public.get_digital_menu(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_digital_menu(uuid) TO anon, authenticated;
