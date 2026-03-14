-- Migration to create notifications system
CREATE TYPE public.notification_type AS ENUM ('inventory_low', 'system_event', 'order_event');
CREATE TYPE public.notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type public.notification_type DEFAULT 'system_event',
    priority public.notification_priority DEFAULT 'medium',
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for store and unread status
CREATE INDEX idx_notifications_store_read ON public.notifications(store_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view notifications for their store" 
ON public.notifications FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their store notifications as read" 
ON public.notifications FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

-- TRIGGER for Low Stock Notifications
CREATE OR REPLACE FUNCTION public.check_inventory_stock_trigger()
RETURNS trigger AS $$
BEGIN
    -- Only create notification if stock is below min_stock and it wasn't already below it (avoid spam)
    IF (NEW.stock <= NEW.min_stock) AND (OLD.stock > NEW.min_stock OR OLD.stock IS NULL) THEN
        INSERT INTO public.notifications (store_id, title, message, type, priority, metadata)
        VALUES (
            NEW.store_id,
            'Inventario Bajo: ' || NEW.name,
            'El artículo "' || NEW.name || '" tiene un stock de ' || NEW.stock || ' ' || NEW.unit_of_measure || '. El mínimo es ' || NEW.min_stock || '.',
            'inventory_low',
            'high',
            jsonb_build_object('item_id', NEW.id, 'current_stock', NEW.stock, 'min_stock', NEW.min_stock)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_inventory_stock_change') THEN
        CREATE TRIGGER on_inventory_stock_change
        AFTER UPDATE ON public.inventory_items
        FOR EACH ROW
        EXECUTE FUNCTION public.check_inventory_stock_trigger();
    END IF;
END $$;
