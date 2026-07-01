-- Migración de Hardening de Seguridad para Funciones SECURITY DEFINER
-- Añade SET search_path = public de forma explícita para evitar secuestro de esquemas.

-- 1. Función has_role
ALTER FUNCTION public.has_role(user_id uuid, role_name text) SET search_path = public;

-- 2. Función process_sale
ALTER FUNCTION public.process_sale(sale_data jsonb) SET search_path = public;

-- 3. Función update_order_with_stock
ALTER FUNCTION public.update_order_with_stock(order_update_data jsonb) SET search_path = public;

-- 4. Función cancel_sale_with_stock_restore
ALTER FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text) SET search_path = public;

-- 5. Función sync_inventory_stock_to_machine_tanks
ALTER FUNCTION public.sync_inventory_stock_to_machine_tanks() SET search_path = public;
