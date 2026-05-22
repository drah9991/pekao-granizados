-- Migration: Sync Tanks Triggers and Backfill
-- Description: Creates robust triggers to automatically sync inventory mixtures to machine tanks on insert, update, and delete, and adds an RPC to initialize store tanks.

-- 1. Create or replace trigger function for inventory insert/update
CREATE OR REPLACE FUNCTION public.sync_inventory_to_machine_tanks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.is_mixture = TRUE THEN
        INSERT INTO public.machine_tanks (store_id, name, current_volume_ml, max_capacity_ml, inventory_item_id)
        VALUES (
            NEW.store_id,
            COALESCE(NULLIF(REPLACE(NEW.name, 'Mezcla ', ''), ''), NEW.name),
            NEW.stock,
            12000, -- Default capacity 12 Liters
            NEW.id
        )
        ON CONFLICT (store_id, name) DO UPDATE
        SET inventory_item_id = EXCLUDED.inventory_item_id,
            current_volume_ml = EXCLUDED.current_volume_ml,
            updated_at = NOW();
    ELSE
        -- If it was a mixture but is no longer, remove the tank
        DELETE FROM public.machine_tanks WHERE inventory_item_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Create or replace trigger function for inventory delete
CREATE OR REPLACE FUNCTION public.sync_inventory_delete_to_machine_tanks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.machine_tanks WHERE inventory_item_id = OLD.id;
    RETURN OLD;
END;
$$;

-- 3. Setup triggers on inventory_items
DROP TRIGGER IF EXISTS trg_sync_inventory_stock_to_machine_tanks ON public.inventory_items;
DROP TRIGGER IF EXISTS trg_sync_inventory_to_machine_tanks ON public.inventory_items;

CREATE TRIGGER trg_sync_inventory_to_machine_tanks
AFTER INSERT OR UPDATE OF stock, name, is_mixture, store_id ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_to_machine_tanks();

DROP TRIGGER IF EXISTS trg_sync_inventory_delete_to_machine_tanks ON public.inventory_items;

CREATE TRIGGER trg_sync_inventory_delete_to_machine_tanks
AFTER DELETE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_delete_to_machine_tanks();

-- 4. Create function to manually/programmatically initialize store tanks
CREATE OR REPLACE FUNCTION public.initialize_store_tanks(p_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_item record;
BEGIN
    -- Backfill from existing mixture items for this store
    FOR v_item IN 
        SELECT id, name, stock 
        FROM public.inventory_items 
        WHERE store_id = p_store_id AND is_mixture = TRUE
    LOOP
        INSERT INTO public.machine_tanks (store_id, name, current_volume_ml, max_capacity_ml, inventory_item_id)
        VALUES (
            p_store_id,
            COALESCE(NULLIF(REPLACE(v_item.name, 'Mezcla ', ''), ''), v_item.name),
            v_item.stock,
            12000,
            v_item.id
        )
        ON CONFLICT (store_id, name) DO UPDATE
        SET inventory_item_id = EXCLUDED.inventory_item_id,
            current_volume_ml = EXCLUDED.current_volume_ml,
            updated_at = NOW();
            
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.initialize_store_tanks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_store_tanks(uuid) TO service_role;

-- 5. Perform instant backfill for all stores
SELECT public.initialize_store_tanks(id) FROM public.stores;
