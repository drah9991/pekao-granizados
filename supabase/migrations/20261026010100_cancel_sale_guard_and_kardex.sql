-- =============================================================================
-- cancel_sale_with_stock_restore: guarda de sede y de estado, y kardex.
--
-- Antes (producción y staging):
--   - el rol se comprobaba con has_role, que es global: un gerente anulaba
--     ventas de cualquier sede;
--   - no miraba el estado: anular dos veces devolvía el stock dos veces, y
--     anular un pedido que nunca descontó stock lo sumaba igual;
--   - devolvía stock sin dejar movimiento: en el kardex la venta anulada
--     quedaba como una salida sin su devolución.
--
-- Ahora:
--   - admin/superadmin en cualquier sede; gerente solo en la suya
--     (rls_can_manage_store, de 20261026010000);
--   - una venta ya anulada no se vuelve a anular;
--   - solo las ventas "completed" (las que crea process_sale y descuentan stock)
--     devuelven stock, y cada devolución registra un movimiento "entry";
--   - la devolución de unidades y mezcla es la misma de antes y simétrica a la
--     venta: process_sale_unchecked, en staging y en producción, decide la mezcla
--     solo por product_types_config (no por categoría, como dice 20260714140000,
--     que nunca se aplicó así).
-- Misma firma y retorno: los clientes (useSales, usePrintCenter, app móvil) no cambian.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_service boolean := coalesce(auth.role(), '') = 'service_role';
    v_store_id uuid;
    v_status text;
    v_short_id text := substring(p_order_id::text from 1 for 8);
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
    v_base_vol numeric;
BEGIN
    IF NOT v_is_service
       AND NOT (public.rls_is_superadmin()
                OR public.rls_has_any_role(ARRAY['super_admin', 'admin', 'manager', 'store_manager'])) THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.' USING ERRCODE = '42501';
    END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulación es obligatorio.';
    END IF;

    SELECT store_id, status::text INTO v_store_id, v_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    IF NOT v_is_service AND NOT public.rls_can_manage_store(v_store_id) THEN
        RAISE EXCEPTION 'No puedes anular ventas de esta sede' USING ERRCODE = '42501';
    END IF;
    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'La venta ya está anulada';
    END IF;

    -- Solo una venta completada descontó stock en process_sale.
    IF v_status = 'completed' THEN
        FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY product_id ASC NULLS LAST
        LOOP
            IF item_row.product_id IS NOT NULL THEN
                SELECT COALESCE(pt.track_mixture_inventory, false)
                  INTO v_is_tracked_mixture
                  FROM public.products p
                    LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
                 WHERE p.id = item_row.product_id;
                SELECT COALESCE(base_volume, 4)
                  INTO v_base_vol
                  FROM public.products
                 WHERE id = item_row.product_id;
                -- Restaurar Unidades
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
                WHERE product_id = item_row.product_id AND store_id = v_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
                -- movements.user_id es NOT NULL en staging: con service_role se usa quien vendió.
                VALUES (item_row.product_id, v_store_id, 'entry', item_row.qty,
                        'Anulación venta #' || v_short_id || ' - ' || item_row.name,
                        COALESCE(auth.uid(), (SELECT o.created_by FROM public.orders o WHERE o.id = p_order_id)));
                -- Restaurar Mezcla
                IF v_is_tracked_mixture THEN
                    FOR recipe_row IN
                        SELECT r.inventory_item_id, r.quantity_required, ii.unit
                        FROM public.recipes r
                        JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                        WHERE r.product_id = item_row.product_id
                        ORDER BY r.inventory_item_id ASC
                    LOOP
                        SELECT stock INTO v_current_stock
                        FROM public.inventory_items
                        WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                        FOR UPDATE;
                        IF recipe_row.unit = 'ml' THEN
                            v_val := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.qty;
                        ELSE
                            v_val := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                        END IF;
                        UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                        WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                    END LOOP;
                END IF;
            END IF;
        END LOOP;
    END IF;

    UPDATE public.orders
       SET status = 'cancelled', cancellation_reason = p_reason, cancelled_by = auth.uid(),
           cancelled_at = NOW(), updated_at = NOW()
     WHERE id = p_order_id;
END;
$$;
