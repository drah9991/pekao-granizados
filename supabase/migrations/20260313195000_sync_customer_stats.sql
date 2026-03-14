-- Función para sincronizar estadísticas de clientes (Total comprado y fecha última compra)
CREATE OR REPLACE FUNCTION public.sync_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar el nuevo cliente (si existe) en INSERT o UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET 
            total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE customer_id = NEW.customer_id AND status = 'completed'),
            last_order_at = (SELECT MAX(created_at) FROM public.orders WHERE customer_id = NEW.customer_id AND status = 'completed')
        WHERE id = NEW.customer_id;
    END IF;

    -- Si el cliente cambió o se eliminó en una actualización
    IF TG_OP = 'UPDATE' AND OLD.customer_id IS NOT NULL AND (NEW.customer_id IS NULL OR NEW.customer_id <> OLD.customer_id) THEN
        UPDATE public.customers
        SET 
            total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE customer_id = OLD.customer_id AND status = 'completed'),
            last_order_at = (SELECT MAX(created_at) FROM public.orders WHERE customer_id = OLD.customer_id AND status = 'completed')
        WHERE id = OLD.customer_id;
    END IF;

    -- Si se eliminó una orden vinculada a un cliente
    IF TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET 
            total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE customer_id = OLD.customer_id AND status = 'completed'),
            last_order_at = (SELECT MAX(created_at) FROM public.orders WHERE customer_id = OLD.customer_id AND status = 'completed')
        WHERE id = OLD.customer_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ejecutar la sincronización después de cambios en órdenes
DROP TRIGGER IF EXISTS trigger_sync_customer_stats ON public.orders;
CREATE TRIGGER trigger_sync_customer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_stats();

-- Script de sincronización inicial para corregir datos existentes
UPDATE public.customers c
SET 
    total_spent = COALESCE((SELECT SUM(o.total) FROM public.orders o WHERE o.customer_id = c.id AND o.status = 'completed'), 0),
    last_order_at = (SELECT MAX(o.created_at) FROM public.orders o WHERE o.customer_id = c.id AND o.status = 'completed');
