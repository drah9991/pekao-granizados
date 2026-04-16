-- =====================================================================
-- Maestro de Tipos de Producto (Product Types Master)
-- Permite parametrizar el comportamiento, forma de venta e interfaz gráfica
-- de los diferentes tipos de producto sin tocar el código de la app.
-- =====================================================================

-- 1. Crear tabla principal
CREATE TABLE IF NOT EXISTS public.product_types_config (
    code text PRIMARY KEY, -- Identificador (ej. "granizado")
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE, -- Hacerlo multi-store o global (null = global)
    label text NOT NULL,
    emoji_icon text DEFAULT '📦',
    color_theme text DEFAULT 'bg-slate-500',
    sales_mode text NOT NULL DEFAULT 'unit' CHECK (sales_mode IN ('sizes', 'unit', 'weight')),
    track_mixture_inventory boolean NOT NULL DEFAULT false, -- Usa tanques por volumen (litros)
    inventory_unit text NOT NULL DEFAULT 'un', -- ml, un, gr, etc.
    allow_toppings boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_types_config ENABLE ROW LEVEL SECURITY;

-- 2. Políticas
CREATE POLICY "Enable read access for all authenticated users"
  ON public.product_types_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable all access for admins and managers"
  ON public.product_types_config FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager'))
  );

-- 3. Trigger para updated_at
CREATE TRIGGER update_product_types_config_updated_at
BEFORE UPDATE ON public.product_types_config
FOR EACH ROW
EXECUTE FUNCTION public.set_inventory_updated_at(); -- Reutilizamos esta función existente

-- 4. Inserción de Datos Iniciales (Seed compatible con el enum product_type)
INSERT INTO public.product_types_config 
    (code, label, emoji_icon, color_theme, sales_mode, track_mixture_inventory, inventory_unit, allow_toppings)
VALUES 
    ('granizado', 'Granizados', '🍧', 'bg-cyan-500', 'sizes', true, 'ml', true),
    ('topping', 'Toppings', '🍒', 'bg-rose-500', 'unit', false, 'un', false),
    ('sachet', 'Sachets', '🥃', 'bg-violet-500', 'unit', false, 'un', false),
    ('sweet', 'Dulces', '🍬', 'bg-amber-500', 'unit', false, 'un', false)
ON CONFLICT (code) DO UPDATE 
SET 
    sales_mode = EXCLUDED.sales_mode,
    track_mixture_inventory = EXCLUDED.track_mixture_inventory,
    inventory_unit = EXCLUDED.inventory_unit;

-- Asegurar que se puede leer por guest / anon si acaso se necesita en public pages
GRANT SELECT ON public.product_types_config TO anon;
