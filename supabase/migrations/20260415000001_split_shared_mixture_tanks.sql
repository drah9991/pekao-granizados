-- =====================================================================
-- Separar tanques compartidos: un insumo de mezcla por cada granizado
-- =====================================================================
-- PROBLEMA: Todos los granizados comparten el mismo inventory_item_id 
-- en la tabla recipes. Al vaciar o preparar uno, se afectan todos.
--
-- SOLUCIÓN: Para cada producto granizado que comparte un insumo:
--   1. Crear un inventory_item nuevo con nombre "Mezcla {nombre_producto}"
--   2. Copiar las propiedades del insumo original (store_id, unit, is_mixture, etc.)
--   3. Actualizar la fila de recipes para apuntar al nuevo insumo
--   4. El stock del nuevo insumo inicia en 0 (se debe registrar preparación individual)
--
-- NOTA: El insumo original se conserva vinculado al PRIMER producto encontrado.
--       Los demás productos reciben insumos nuevos independientes.
-- =====================================================================

DO $$
DECLARE
    shared_item RECORD;
    product_rec RECORD;
    is_first BOOLEAN;
    new_inv_id UUID;
    v_original_name TEXT;
    v_original_store_id UUID;
    v_original_sku TEXT;
    v_original_unit TEXT;
    v_original_min_stock NUMERIC;
    v_original_cost NUMERIC;
    v_original_qty_required NUMERIC;
    v_recipe_unit TEXT;
BEGIN
    -- Encontrar inventory_items compartidos por más de un producto
    FOR shared_item IN
        SELECT r.inventory_item_id, COUNT(*) AS product_count
        FROM public.recipes r
        JOIN public.inventory_items ii ON ii.id = r.inventory_item_id
        WHERE ii.is_mixture = TRUE
        GROUP BY r.inventory_item_id
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE '🔧 Insumo compartido: % (usado por % productos)', 
            shared_item.inventory_item_id, shared_item.product_count;

        -- Obtener datos del insumo original
        SELECT name, store_id, sku, unit_of_measure, min_stock, cost_per_unit
        INTO v_original_name, v_original_store_id, v_original_sku, 
             v_original_unit, v_original_min_stock, v_original_cost
        FROM public.inventory_items
        WHERE id = shared_item.inventory_item_id;

        is_first := TRUE;

        -- Iterar cada producto vinculado a este insumo
        FOR product_rec IN
            SELECT r.id AS recipe_id, r.product_id, r.quantity_required,
                   COALESCE(r.unit, 'oz') AS recipe_unit,
                   p.name AS product_name
            FROM public.recipes r
            JOIN public.products p ON p.id = r.product_id
            WHERE r.inventory_item_id = shared_item.inventory_item_id
            ORDER BY p.name ASC
        LOOP
            IF is_first THEN
                -- El primer producto conserva el insumo original (renombrándolo)
                UPDATE public.inventory_items
                SET name = 'Mezcla ' || product_rec.product_name,
                    updated_at = NOW()
                WHERE id = shared_item.inventory_item_id;

                RAISE NOTICE '  ✅ Producto "%": conserva insumo original (renombrado a "Mezcla %")', 
                    product_rec.product_name, product_rec.product_name;

                is_first := FALSE;
            ELSE
                -- Los demás productos reciben un insumo NUEVO
                INSERT INTO public.inventory_items (
                    store_id, name, sku, unit_of_measure, stock, 
                    min_stock, cost_per_unit, is_mixture
                ) VALUES (
                    v_original_store_id,
                    'Mezcla ' || product_rec.product_name,
                    CASE WHEN v_original_sku IS NOT NULL 
                         THEN v_original_sku || '-' || LEFT(REPLACE(product_rec.product_name, ' ', ''), 6)
                         ELSE NULL 
                    END,
                    v_original_unit,
                    0,  -- Stock inicia en 0, se debe registrar preparación
                    v_original_min_stock,
                    v_original_cost,
                    TRUE
                )
                RETURNING id INTO new_inv_id;

                -- Actualizar la receta para apuntar al nuevo insumo
                UPDATE public.recipes
                SET inventory_item_id = new_inv_id
                WHERE id = product_rec.recipe_id;

                RAISE NOTICE '  🆕 Producto "%": nuevo insumo "Mezcla %" (id: %)', 
                    product_rec.product_name, product_rec.product_name, new_inv_id;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ Migración completada. Cada granizado ahora tiene su propio tanque de mezcla.';
END;
$$;
