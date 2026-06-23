-- Migration to add store_stock trigger for low stock notifications
CREATE OR REPLACE FUNCTION public.check_store_stock_trigger()
RETURNS trigger AS $$
DECLARE
    product_name TEXT;
BEGIN
    -- Only create notification if stock is below min_qty and it wasn't already below it (avoid spam)
    IF (NEW.qty <= NEW.min_qty) AND (OLD.qty IS NULL OR OLD.qty > NEW.min_qty) THEN
        -- Get product name
        SELECT name INTO product_name FROM public.products WHERE id = NEW.product_id;
        
        -- Prevent duplicate unread notifications for the same product and store
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE store_id = NEW.store_id 
              AND type = 'inventory_low' 
              AND is_read = false 
              AND (metadata->>'product_id')::uuid = NEW.product_id
        ) THEN
            INSERT INTO public.notifications (store_id, title, message, type, priority, metadata)
            VALUES (
                NEW.store_id,
                'Stock de Producto Bajo: ' || COALESCE(product_name, 'Producto Desconocido'),
                'El producto "' || COALESCE(product_name, 'Desconocido') || '" tiene un stock de ' || NEW.qty || '. El mínimo establecido es ' || NEW.min_qty || '.',
                'inventory_low',
                'high',
                jsonb_build_object('product_id', NEW.product_id, 'current_stock', NEW.qty, 'min_qty', NEW.min_qty)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_store_stock_change') THEN
        CREATE TRIGGER on_store_stock_change
        AFTER UPDATE OR INSERT ON public.store_stock
        FOR EACH ROW
        EXECUTE FUNCTION public.check_store_stock_trigger();
    END IF;
END $$;
