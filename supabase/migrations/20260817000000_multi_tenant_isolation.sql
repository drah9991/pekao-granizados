-- Migración Fase 1: Multi-Tenant Isolation
-- Esta migración añade store_id (como tenant_id) a las tablas globales para aislar los negocios.

-- 1. Añadir store_id a las tablas globales
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- 2. Migración de Datos Existentes (Separación de los 2 negocios)
-- Para productos: Si un producto tiene stock en una tienda, se le asigna esa tienda.
-- Si tiene stock en ambas, se asignará a la primera que encuentre (podría requerir revisión manual o duplicación si compartían el mismo producto físico, pero para SaaS cada quien debe tener sus propios productos).
UPDATE public.products p
SET store_id = (
    SELECT s.store_id 
    FROM public.store_stock s 
    WHERE s.product_id = p.id 
    LIMIT 1
)
WHERE store_id IS NULL;

-- Para órdenes: Podemos saber a qué tienda pertenece una orden buscando el store_id de los cajeros/turnos o del order_item -> producto -> store_stock. 
-- Como order_items (aún sin store_id) no nos da la tienda directa, buscaremos el store_id del profile que creó la orden si existiera, o a través del producto.
-- Update orders based on the first item in the order.
UPDATE public.orders o
SET store_id = (
    SELECT p.store_id
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = o.id
    LIMIT 1
)
WHERE store_id IS NULL;

-- Para clientes: Los clientes están asociados a órdenes. El cliente pertenece a la tienda de la primera orden que hizo.
UPDATE public.customers c
SET store_id = (
    SELECT o.store_id
    FROM public.orders o
    WHERE o.customer_id = c.id
    LIMIT 1
)
WHERE store_id IS NULL;

-- 3. Hacer que el store_id sea obligatorio en el futuro (después de validar que todo quedó con store_id)
-- OJO: No aplicamos NOT NULL inmediatamente si hay registros huérfanos. 
-- Para este SaaS, asumiremos que los huérfanos se pueden borrar o asignar a un tenant por defecto.
-- Borramos productos que no pudieron asociarse a ningún negocio (basura/pruebas huérfanas)
DELETE FROM public.products WHERE store_id IS NULL;
DELETE FROM public.orders WHERE store_id IS NULL;
DELETE FROM public.customers WHERE store_id IS NULL;

ALTER TABLE public.products ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN store_id SET NOT NULL;

-- 4. Activar Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5. Crear Políticas RLS de Aislamiento (Solo ver lo de su propia tienda/tenant)

-- Productos
CREATE POLICY "Users can view products from their store"
ON public.products FOR SELECT
USING (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert products to their store"
ON public.products FOR INSERT
WITH CHECK (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update products in their store"
ON public.products FOR UPDATE
USING (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete products in their store"
ON public.products FOR DELETE
USING (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Clientes
CREATE POLICY "Users can view customers from their store"
ON public.customers FOR SELECT
USING (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert customers to their store"
ON public.customers FOR INSERT
WITH CHECK (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update customers in their store"
ON public.customers FOR UPDATE
USING (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Órdenes
CREATE POLICY "Users can view orders from their store"
ON public.orders FOR SELECT
USING (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert orders to their store"
ON public.orders FOR INSERT
WITH CHECK (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update orders in their store"
ON public.orders FOR UPDATE
USING (store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Crear Trigger para auto-asignar store_id en inserts
CREATE OR REPLACE FUNCTION set_store_id_from_profile()
RETURNS trigger AS $
BEGIN
  IF NEW.store_id IS NULL THEN
    NEW.store_id := (SELECT store_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_products_set_store_id
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION set_store_id_from_profile();

CREATE TRIGGER tr_customers_set_store_id
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION set_store_id_from_profile();

CREATE TRIGGER tr_orders_set_store_id
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION set_store_id_from_profile();

