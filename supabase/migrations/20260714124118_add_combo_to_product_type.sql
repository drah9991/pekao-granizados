-- Migration: Add combo to product_type enum and configuration
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'combo';

INSERT INTO public.product_types_config 
    (code, label, emoji_icon, color_theme, sales_mode, track_mixture_inventory, inventory_unit, allow_toppings)
VALUES 
    ('combo', 'Combos', '🍱', 'bg-emerald-500', 'unit', false, 'un', false)
ON CONFLICT (code) DO NOTHING;
