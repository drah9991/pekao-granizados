-- Migration to add CHECK constraints to ensure numeric values (monetary and quantities) cannot be negative

-- Tabla: products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_check;
ALTER TABLE public.products ADD CONSTRAINT products_price_check CHECK (price >= 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_cost_check;
ALTER TABLE public.products ADD CONSTRAINT products_cost_check CHECK (cost >= 0);

-- Tabla: store_stock
ALTER TABLE public.store_stock DROP CONSTRAINT IF EXISTS store_stock_qty_check;
ALTER TABLE public.store_stock ADD CONSTRAINT store_stock_qty_check CHECK (qty >= 0);

-- Tabla: inventory_items
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_stock_check;
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_stock_check CHECK (stock >= 0);

-- Tabla: order_items
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_qty_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_qty_check CHECK (qty >= 0);

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_price_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_price_check CHECK (price >= 0);

-- Tabla: orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_total_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_total_check CHECK (total >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_subtotal_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_subtotal_check CHECK (subtotal >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_tax_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_tax_check CHECK (tax >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_tip_amount_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_tip_amount_check CHECK (tip_amount >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_fee_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_fee_check CHECK (delivery_fee >= 0);
