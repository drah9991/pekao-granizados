-- Create storage bucket for logos and branding assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
);

-- Storage policies for branding bucket
CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Everyone can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Update stores table config to support branding settings
-- The config JSONB field will store:
-- {
--   "branding": {
--     "logo_url": "url_to_logo",
--     "primary_color": "#hsl_value",
--     "receipt_template": {...}
--   },
--   "business": {
--     "address": "...",
--     "phone": "...",
--     "email": "...",
--     "social_media": {...}
--   }
-- }

-- Create table for receipt templates
CREATE TABLE IF NOT EXISTS public.receipt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{
    "header": {
      "show_logo": true,
      "show_store_name": true,
      "show_address": true,
      "show_phone": true
    },
    "body": {
      "show_date": true,
      "show_order_number": true,
      "show_cashier": true,
      "show_items": true,
      "show_totals": true
    },
    "footer": {
      "message": "¡Gracias por tu compra!",
      "show_social_media": false,
      "show_qr_survey": false,
      "qr_survey_url": ""
    }
  }'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage receipt templates
CREATE POLICY "Admins and managers can manage receipt templates"
ON public.receipt_templates FOR ALL
USING (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
);

-- Staff can view receipt templates from their store
CREATE POLICY "Staff can view receipt templates"
ON public.receipt_templates FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (
    store_id IN (
      SELECT profiles.store_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_receipt_templates_updated_at
BEFORE UPDATE ON public.receipt_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for role permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  resource text NOT NULL, -- 'sales', 'products', 'inventory', 'reports', 'settings'
  action text NOT NULL, -- 'create', 'read', 'update', 'delete'
  UNIQUE(role, resource, action)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage role permissions
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Everyone can view role permissions (needed for UI checks)
CREATE POLICY "Everyone can view role permissions"
ON public.role_permissions FOR SELECT
USING (true);

-- Insert default permissions for existing roles
INSERT INTO public.role_permissions (role, resource, action) VALUES
-- Admin has all permissions
('admin', 'sales', 'create'),
('admin', 'sales', 'read'),
('admin', 'sales', 'update'),
('admin', 'sales', 'delete'),
('admin', 'products', 'create'),
('admin', 'products', 'read'),
('admin', 'products', 'update'),
('admin', 'products', 'delete'),
('admin', 'inventory', 'create'),
('admin', 'inventory', 'read'),
('admin', 'inventory', 'update'),
('admin', 'inventory', 'delete'),
('admin', 'reports', 'read'),
('admin', 'settings', 'read'),
('admin', 'settings', 'update'),

-- Manager permissions
('manager', 'sales', 'create'),
('manager', 'sales', 'read'),
('manager', 'sales', 'update'),
('manager', 'products', 'create'),
('manager', 'products', 'read'),
('manager', 'products', 'update'),
('manager', 'inventory', 'create'),
('manager', 'inventory', 'read'),
('manager', 'inventory', 'update'),
('manager', 'reports', 'read'),
('manager', 'settings', 'read'),

-- Cashier permissions
('cashier', 'sales', 'create'),
('cashier', 'sales', 'read'),
('cashier', 'products', 'read'),
('cashier', 'inventory', 'read');