-- 1. Hardening Search Paths (prevent search_path hijacking)
ALTER FUNCTION public.set_inventory_updated_at() SET search_path = public;
ALTER FUNCTION public.update_pricing_rules_updated_at() SET search_path = public;
ALTER FUNCTION public.increment_inventory_stock(uuid, uuid, numeric) SET search_path = public;
ALTER FUNCTION public.check_inventory_stock_trigger() SET search_path = public;
ALTER FUNCTION public.adjust_inventory_item_stock(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public;
ALTER FUNCTION public.cancel_sale_with_stock_restore(uuid, text) SET search_path = public;
ALTER FUNCTION public.sync_inventory_stock_to_machine_tanks() SET search_path = public;
ALTER FUNCTION public.process_sale(jsonb) SET search_path = public;
ALTER FUNCTION public.update_order_with_stock(jsonb) SET search_path = public;

-- 2. Revoking Execute privileges from anonymous public and granting them explicitly
REVOKE EXECUTE ON FUNCTION public.adjust_inventory_item_stock(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_item_stock(uuid, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_sale_with_stock_restore(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_sale_with_stock_restore(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_auth_store_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_store_id() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.increment_inventory_stock(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_inventory_stock(uuid, uuid, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.process_sale(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sync_inventory_stock_to_machine_tanks() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_order_with_stock(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_with_stock(jsonb) TO authenticated, service_role;

-- 3. Fixing RLS Policy on invoices Table (Ensuring secure INSERT)
DROP POLICY IF EXISTS "Staff can create invoices" ON public.invoices;

CREATE POLICY "Staff can create invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE o.id = order_id
      AND o.store_id = p.store_id
      AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'manager') OR
        public.has_role(auth.uid(), 'cashier')
      )
    )
  );

-- 4. Securing Storage branding Bucket SELECT policy to authenticated only (prevent anonymous listing)
DROP POLICY IF EXISTS "Everyone can view branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to branding" ON storage.objects;

CREATE POLICY "Everyone can view branding assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'branding');
