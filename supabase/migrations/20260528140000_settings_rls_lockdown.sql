-- Ensure RLS is active on configurations
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_acronyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types_config ENABLE ROW LEVEL SECURITY;

-- 1. STORES: Only Admins can modify store info
DROP POLICY IF EXISTS "stores_admin_update" ON public.stores;
CREATE POLICY "stores_admin_update" 
  ON public.stores FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. ROLES & PERMISSIONS: Strict Admin lockdown
DROP POLICY IF EXISTS "roles_admin_only_write" ON public.roles;
CREATE POLICY "roles_admin_only_write" 
  ON public.roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "role_permissions_admin_only_write" ON public.role_permissions;
CREATE POLICY "role_permissions_admin_only_write"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. RECEIPT TEMPLATES
DROP POLICY IF EXISTS "receipt_templates_admin_only_write" ON public.receipt_templates;
CREATE POLICY "receipt_templates_admin_only_write"
  ON public.receipt_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. SIZES
DROP POLICY IF EXISTS "sizes_admin_only_write" ON public.sizes;
CREATE POLICY "sizes_admin_only_write"
  ON public.sizes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. SKU ACRONYMS
DROP POLICY IF EXISTS "sku_acronyms_admin_only_write" ON public.sku_acronyms;
CREATE POLICY "sku_acronyms_admin_only_write"
  ON public.sku_acronyms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. NOTIFICATION SETTINGS
DROP POLICY IF EXISTS "notification_settings_admin_only_write" ON public.notification_settings;
CREATE POLICY "notification_settings_admin_only_write"
  ON public.notification_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. PRODUCT TYPES CONFIG
DROP POLICY IF EXISTS "product_types_config_admin_only_write" ON public.product_types_config;
CREATE POLICY "product_types_config_admin_only_write"
  ON public.product_types_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
