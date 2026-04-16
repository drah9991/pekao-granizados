-- =====================================================================
-- Flujo de Devolución Completo al Anular Ventas
-- Agrega columna de razón de anulación y crea RPC atómica
-- =====================================================================

-- 1. Agregar columna para razón y quién anuló
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason  text,
  ADD COLUMN IF NOT EXISTS cancelled_by         uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at         timestamptz;

-- 2. RPC: cancel_sale_with_stock_restore
--    Cancela la venta, restaura store_stock + inventory_items (recetas),
--    registra movimientos de devolución en movements, y guarda razón + auditor.
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
BEGIN
    -- Solo admin o manager pueden anular
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    -- Validar que el motivo no esté vacío
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulación es obligatorio.';
    END IF;

    -- Obtener orden y bloquearla para escritura
    SELECT store_id, created_by, status
      INTO v_store_id, v_employee_id, v_status
      FROM public.orders
     WHERE id = p_order_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada: %', p_order_id;
    END IF;

    -- Evitar doble restauración
    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.';
    END IF;

    -- ================================================================
    -- Iterar cada ítem de la orden y restaurar inventario
    -- ================================================================
    FOR item_row IN
        SELECT oi.product_id, oi.qty, oi.name,
               COALESCE(oi.size_multiplier, 1) AS size_multiplier
          FROM public.order_items oi
         WHERE oi.order_id = p_order_id
    LOOP
        -- -----------------------------------------
        -- A. Restaurar store_stock (stock de producto)
        -- -----------------------------------------
        UPDATE public.store_stock
           SET qty        = qty + item_row.qty,
               updated_at = NOW()
         WHERE product_id = item_row.product_id
           AND store_id   = v_store_id;

        -- Movimiento de devolución en kardex
        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
        VALUES (
            item_row.product_id,
            v_store_id,
            'entry',
            item_row.qty,
            'ANULACIÓN #' || substring(p_order_id::text from 1 for 8)
              || ' — ' || item_row.name
              || ' | Motivo: ' || trim(p_reason),
            auth.uid()
        );

        -- -----------------------------------------
        -- B. Restaurar inventory_items (mezclas/recetas)
        --    quantity_required está en la misma unidad que inventory_items.stock
        --    Para granizados: ml. Se aplica el size_multiplier de la venta.
        -- -----------------------------------------
        FOR recipe_row IN
            SELECT r.inventory_item_id, r.quantity_required
              FROM public.recipes r
             WHERE r.product_id = item_row.product_id
        LOOP
            restoration := recipe_row.quantity_required
                           * item_row.qty
                           * item_row.size_multiplier;

            UPDATE public.inventory_items
               SET stock      = stock + restoration,
                   updated_at = NOW()
             WHERE id       = recipe_row.inventory_item_id
               AND store_id = v_store_id;
        END LOOP;
    END LOOP;

    -- ================================================================
    -- Marcar la orden como cancelada con razón y auditor
    -- ================================================================
    UPDATE public.orders
       SET status               = 'cancelled',
           cancellation_reason  = trim(p_reason),
           cancelled_by         = auth.uid(),
           cancelled_at         = NOW(),
           updated_at           = NOW()
     WHERE id = p_order_id;

END;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.cancel_sale_with_stock_restore(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale_with_stock_restore(uuid, text) TO service_role;
