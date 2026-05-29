-- Crear tabla de turnos de caja
CREATE TABLE IF NOT EXISTS public.cash_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cash_turns ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de RLS
CREATE POLICY "Cajeros pueden ver turnos de su tienda" 
ON public.cash_turns FOR SELECT 
USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Cajeros pueden insertar turnos en su tienda" 
ON public.cash_turns FOR INSERT 
WITH CHECK (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Cajeros pueden actualizar turnos de su tienda" 
ON public.cash_turns FOR UPDATE 
USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Ãndices para rendimiento
CREATE INDEX IF NOT EXISTS idx_cash_turns_store_status ON public.cash_turns(store_id, status);
-- ============================================
-- PEKAO GRANIZADOS - DATABASE SCHEMA
-- ============================================

-- 1. PROFILES TABLE (user metadata)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  store_id uuid,
  created_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. USER ROLES (CRITICAL: Separate from profiles for security)
create type public.app_role as enum ('admin', 'manager', 'cashier', 'driver');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Role policies
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- 3. STORES
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  tax_rate numeric default 0,
  currency text default 'COP',
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.stores enable row level security;

-- Add foreign key to profiles after stores is created
alter table public.profiles
  add constraint profiles_store_id_fkey 
  foreign key (store_id) references public.stores(id);

-- Store policies
create policy "Everyone can view stores"
  on public.stores for select
  to authenticated
  using (true);

create policy "Admins can manage stores"
  on public.stores for all
  using (public.has_role(auth.uid(), 'admin'));

-- 4. PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text,
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  cost numeric check (cost >= 0),
  images text[] default '{}',
  variants jsonb default '[]'::jsonb,
  recipe jsonb default '[]'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.products enable row level security;

-- Product policies
create policy "Everyone can view active products"
  on public.products for select
  to authenticated
  using (active = true);

create policy "Admins and managers can manage products"
  on public.products for all
  using (
    public.has_role(auth.uid(), 'admin') or 
    public.has_role(auth.uid(), 'manager')
  );

-- 5. STORE STOCK
create table public.store_stock (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  qty numeric default 0 check (qty >= 0),
  min_qty numeric default 0 check (min_qty >= 0),
  batch_info jsonb,
  updated_at timestamptz default now(),
  unique(store_id, product_id)
);

alter table public.store_stock enable row level security;

-- Stock policies
create policy "Staff can view stock in their store"
  on public.store_stock for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    store_id in (select store_id from public.profiles where id = auth.uid())
  );

create policy "Admins and managers can manage stock"
  on public.store_stock for all
  using (
    public.has_role(auth.uid(), 'admin') or 
    public.has_role(auth.uid(), 'manager')
  );

-- 6. CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  addresses jsonb default '[]'::jsonb,
  total_spent numeric default 0,
  last_order_at timestamptz,
  created_at timestamptz default now()
);

alter table public.customers enable row level security;

-- Customer policies
create policy "Staff can view customers"
  on public.customers for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'manager') or
    public.has_role(auth.uid(), 'cashier')
  );

create policy "Staff can manage customers"
  on public.customers for all
  using (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'manager') or
    public.has_role(auth.uid(), 'cashier')
  );

-- 7. ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  store_id uuid references public.stores(id) not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  subtotal numeric not null check (subtotal >= 0),
  tax numeric default 0 check (tax >= 0),
  total numeric not null check (total >= 0),
  payment jsonb default '{}'::jsonb,
  assigned_driver uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

-- Order policies
create policy "Staff can view orders from their store"
  on public.orders for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    store_id in (select store_id from public.profiles where id = auth.uid())
  );

create policy "Staff can create orders"
  on public.orders for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'manager') or
    public.has_role(auth.uid(), 'cashier')
  );

create policy "Staff can update orders"
  on public.orders for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    store_id in (select store_id from public.profiles where id = auth.uid())
  );

-- 8. ORDER ITEMS
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id),
  name text not null,
  qty numeric not null check (qty > 0),
  price numeric not null check (price >= 0),
  tax numeric default 0 check (tax >= 0),
  subtotal numeric generated always as (qty * price) stored
);

alter table public.order_items enable row level security;

-- Order items policies (inherit from orders)
create policy "Staff can view order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where id = order_id
      and (
        public.has_role(auth.uid(), 'admin') or
        store_id in (select store_id from public.profiles where id = auth.uid())
      )
    )
  );

create policy "Staff can manage order items"
  on public.order_items for all
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where id = order_id
      and (
        public.has_role(auth.uid(), 'admin') or
        store_id in (select store_id from public.profiles where id = auth.uid())
      )
    )
  );

-- 9. INVOICES (with sequence for numbering)
create sequence public.invoice_number_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) unique not null,
  number bigint default nextval('invoice_number_seq') not null unique,
  pdf_path text,
  issued_at timestamptz default now(),
  total numeric not null check (total >= 0)
);

alter table public.invoices enable row level security;

-- Invoice policies
create policy "Staff can view invoices from their store"
  on public.invoices for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where id = order_id
      and (
        public.has_role(auth.uid(), 'admin') or
        store_id in (select store_id from public.profiles where id = auth.uid())
      )
    )
  );

create policy "Staff can create invoices"
  on public.invoices for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where id = order_id
      and (
        public.has_role(auth.uid(), 'admin') or
        public.has_role(auth.uid(), 'manager') or
        public.has_role(auth.uid(), 'cashier')
      )
    )
  );

-- 10. INVENTORY MOVEMENTS (audit log)
create table public.movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) not null,
  store_id uuid references public.stores(id) not null,
  qty numeric not null,
  type text not null check (type in ('entry', 'exit', 'adjustment')),
  reason text,
  user_id uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

alter table public.movements enable row level security;

-- Movement policies
create policy "Staff can view movements from their store"
  on public.movements for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    store_id in (select store_id from public.profiles where id = auth.uid())
  );

create policy "Managers can create movements"
  on public.movements for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'manager')
  );

-- 11. TRIGGER: Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 12. TRIGGER: Update order updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

-- 13. TRIGGER: Update stock updated_at
create trigger update_stock_updated_at
  before update on public.store_stock
  for each row execute function public.update_updated_at_column();

-- 14. INDEXES for performance
create index idx_profiles_store_id on public.profiles(store_id);
create index idx_store_stock_store_product on public.store_stock(store_id, product_id);
create index idx_orders_store_status on public.orders(store_id, status);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_movements_store_product on public.movements(store_id, product_id);
create index idx_movements_created_at on public.movements(created_at desc);
create index idx_invoices_number on public.invoices(number);
create index idx_user_roles_user_id on public.user_roles(user_id);
-- FIX: Add search_path to update_updated_at_column function for security
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
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
      "message": "Â¡Gracias por tu compra!",
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
-- RPC function to process sales with automatic stock adjustment and movement tracking
CREATE OR REPLACE FUNCTION public.process_sale_with_stock(
  p_store_id UUID,
  p_user_id UUID,
  p_subtotal NUMERIC,
  p_tax NUMERIC,
  p_total NUMERIC,
  p_payment JSONB,
  p_items JSONB -- Expected: Array of {product_id: UUID, name: text, qty: numeric, price: numeric, tax: numeric}
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- 1. Insert Order
  INSERT INTO public.orders (
    store_id, 
    created_by, 
    subtotal, 
    tax, 
    total, 
    status, 
    payment
  ) VALUES (
    p_store_id, 
    p_user_id, 
    p_subtotal, 
    p_tax, 
    p_total, 
    'completed', 
    p_payment
  ) RETURNING id INTO v_order_id;

  -- 2. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert into order_items
    INSERT INTO public.order_items (
      order_id, 
      product_id, 
      name, 
      qty, 
      price, 
      tax
    ) VALUES (
      v_order_id, 
      (v_item->>'product_id')::UUID, 
      v_item->>'name', 
      (v_item->>'qty')::NUMERIC, 
      (v_item->>'price')::NUMERIC, 
      (v_item->>'tax')::NUMERIC
    );

    -- Discount stock if product_id is provided
    IF (v_item->>'product_id') IS NOT NULL THEN
      -- Atomic update to decrease stock
      UPDATE public.store_stock
      SET qty = qty - (v_item->>'qty')::NUMERIC,
          updated_at = now()
      WHERE store_id = p_store_id AND product_id = (v_item->>'product_id')::UUID;

      -- Record inventory movement
      INSERT INTO public.movements (
        product_id, 
        store_id, 
        qty, 
        type, 
        reason, 
        user_id
      ) VALUES (
        (v_item->>'product_id')::UUID, 
        p_store_id, 
        -(v_item->>'qty')::NUMERIC, 
        'exit', 
        'Venta POS (Pedido #' || v_order_id || ')', 
        p_user_id
      );
    END IF;
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_sale_with_stock(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_with_stock(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, JSONB, JSONB) TO service_role;
-- Migration to create the Inventory Item and Recipes base system.
-- This effectively replaces the reliance on the "store_stock" table for complex products.

-- 1. Create `inventory_items` table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    unit_of_measure TEXT NOT NULL, -- e.g., 'ml', 'g', 'units'
    stock NUMERIC NOT NULL DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by store
CREATE INDEX idx_inventory_items_store ON public.inventory_items(store_id);

-- Enable RLS for inventory items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users in same store" 
ON public.inventory_items FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable all access for admins and managers" 
ON public.inventory_items FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager'))
);

-- 2. Create `recipes` table to link products with inventory items
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC NOT NULL, -- How much of the inventory item is needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(product_id, inventory_item_id) -- A product should only link to a specific item once
);

-- Add index on product_id for fast lookup when processing sales
CREATE INDEX idx_recipes_product ON public.recipes(product_id);

-- Enable RLS for recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users in same store" 
ON public.recipes FOR SELECT 
USING (
  EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = recipes.product_id
      AND products.store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
      )
  )
);

CREATE POLICY "Enable all access for admins and managers" 
ON public.recipes FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager'))
);

-- Add trigger for updated_at in inventory_items
CREATE OR REPLACE FUNCTION set_inventory_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION set_inventory_updated_at();
-- RPC function to process sales and deduct stock precisely based on recipes
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
BEGIN
    -- 1. Extract variables from JSON payload
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_sale_total := (sale_data->>'total')::numeric;
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    -- Extract optional customer ID (Supermarket Flow)
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Safely ignore malformed UUIDs from empty strings
        v_customer_id := NULL;
    END;

    -- Validate required fields
    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- 2. Insert master sale record (we map this to the existing `orders` table)
    INSERT INTO public.orders (store_id, customer_id, created_by, total, subtotal, tax, status, payment)
    VALUES (v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_total, 0, 'completed', v_payment_method)
    RETURNING id INTO new_sale_id;

    -- 3. Loop through sold products using jsonb_to_recordset
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size text,
        size_multiplier numeric
    )
    LOOP
        -- Insert into order items
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (
            new_sale_id,
            v_item.product_id,
            v_item.name,
            v_item.quantity,
            v_item.price,
            0
        );

        -- 4. Query recipe for the product ingredients
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = v_item.product_id
        LOOP
            -- Calculate proportional deduction: base recipe * quantity sold * size multiplier
            -- COALESCE handles null multipliers by defaulting to 1 (e.g., for toppings)
            deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

            -- Lock inventory row to prevent race conditions (FOR UPDATE)
            SELECT stock INTO current_stock
            FROM public.inventory_items
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
            FOR UPDATE;

            -- 5. Validate stock limits
            IF current_stock IS NULL THEN
                 RAISE EXCEPTION 'Inventory item % not found in store %', recipe_row.inventory_item_id, v_store_id;
            END IF;

            IF current_stock < deduction THEN
                -- Rolling back automatically
                RAISE EXCEPTION 'Stock insuficiente para el cÃ³digo de insumo %. Disponible: %, Querido: %', 
                                recipe_row.inventory_item_id, current_stock, deduction;
            END IF;

            -- 6. Deduct inventory 
            UPDATE public.inventory_items
            SET stock = stock - deduction,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

            -- 7. Log movement to Kardex for complete traceability
            INSERT INTO public.movements (
                product_id,
                store_id,
                type,
                qty,
                reason,
                user_id
            ) VALUES (
                v_item.product_id,
                v_store_id,
                'exit',
                deduction,
                'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
                v_employee_id
            );

        END LOOP;
        
    END LOOP;

    -- 8. Return new order ID
    RETURN new_sale_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb) TO service_role;
-- Add policies for Admins and Managers to manage ALL profiles
CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Add policies for managers to also manage user roles (admins already can)
CREATE POLICY "Managers can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'manager')
  );
-- Add document_id (CÃ©dula) to customers table for marketing/invoicing purposes
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS document_id text;

-- Create an index to speed up searches by document_id (useful for the POS search bar)
CREATE INDEX IF NOT EXISTS idx_customers_document_id ON public.customers(document_id);
-- 1. Create the new dynamic roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system boolean DEFAULT false, -- To protect core roles like admin
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Everyone can view roles to populate dropdowns
CREATE POLICY "Everyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

-- Only admins and managers can manage roles
CREATE POLICY "Admins and managers can manage roles"
  ON public.roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND (ur.role::text = 'admin' OR ur.role::text = 'manager')
    )
  );

-- Insert existing base roles into the new table
INSERT INTO public.roles (name, description, is_system) VALUES
  ('admin', 'Administrador Global', true),
  ('manager', 'Gerente de Tienda', true),
  ('cashier', 'Cajero', true),
  ('driver', 'Repartidor', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Modify user_roles table to use string/text temporarily to avoid enum casting issues, 
-- or link directly to roles.id. Given has_role() expects text names, linking by name is easier for backwards compatibility,
-- but linking by ID is more robust. We will link by name first to gracefully transition, or better yet, link by role_id.
-- Wait, existing policies use `has_role(uid, 'admin')`. So if we keep 'admin' as a string, it's easier.
-- Let's change the `role` column from enum `app_role` to `text` and add a foreign key to `roles.name`.

ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_name 
  FOREIGN KEY (role) REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Drop the old app_role enum entirely, but it might be used in role_permissions table too.
ALTER TABLE public.role_permissions 
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT fk_role_permissions_name 
  FOREIGN KEY (role) REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE CASCADE;

-- Now we can drop the old enum type (it might have dependencies, so we CASCADE, but we already altered the columns above)
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 3. Redefine has_role function to use text input
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
-- RPC function to process sales and deduct stock precisely based on recipes, modified to handle tips
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    
    -- Manejo correcto de propina y subtotal
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Creamos la orden separando subtotal y tip_amount
    INSERT INTO public.orders (store_id, customer_id, created_by, total, subtotal, tax, tip_amount, status, payment)
    VALUES (v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 'completed', v_payment_method)
    RETURNING id INTO new_sale_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (
            new_sale_id,
            v_item.product_id,
            v_item.name,
            v_item.quantity,
            v_item.price,
            0
        );

        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = v_item.product_id
        LOOP
            deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

            SELECT stock INTO current_stock
            FROM public.inventory_items
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
            FOR UPDATE;

            IF current_stock IS NULL THEN
                 RAISE EXCEPTION 'Inventory item % not found in store %', recipe_row.inventory_item_id, v_store_id;
            END IF;

            IF current_stock < deduction THEN
                RAISE EXCEPTION 'Stock insuficiente para insumo %. Disponible: %, Querido: %', 
                                recipe_row.inventory_item_id, current_stock, deduction;
            END IF;

            UPDATE public.inventory_items
            SET stock = stock - deduction,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

            INSERT INTO public.movements (
                product_id,
                store_id,
                type,
                qty,
                reason,
                user_id
            ) VALUES (
                v_item.product_id,
                v_store_id,
                'exit',
                deduction,
                'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
                v_employee_id
            );

        END LOOP;
        
    END LOOP;

    RETURN new_sale_id;
END;
$$;
-- Agrear document_id a profiles si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_id text;

-- Agregar consent_habeas_data a profiles y customers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_habeas_data boolean DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS consent_habeas_data boolean DEFAULT false;

-- Notificar a PostgREST para recargar el esquema de cachÃ©
NOTIFY pgrst, 'reload schema';
-- Create the pricing_rules table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('time_based', 'demand_based')),
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    days_of_week INTEGER[], -- Array of integers 1-7 (1=Monday, 7=Sunday)
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'category', 'product')),
    target_id TEXT, -- Can be category name or product uuid
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient querying by store and active status
CREATE INDEX idx_pricing_rules_store_active ON public.pricing_rules(store_id, active);

-- Set up Row Level Security (RLS)
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
    ON public.pricing_rules FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Policy: Allow admin and manager to insert
CREATE POLICY "Allow admin and manager to create rules"
    ON public.pricing_rules FOR INSERT
    WITH CHECK (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
    );

-- Policy: Allow admin and manager to update
CREATE POLICY "Allow admin and manager to update rules"
    ON public.pricing_rules FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
    );

-- Policy: Allow admin and manager to delete
CREATE POLICY "Allow admin and manager to delete rules"
    ON public.pricing_rules FOR DELETE
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
    );

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_pricing_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pricing_rules_updated_at_trigger
BEFORE UPDATE ON public.pricing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_pricing_rules_updated_at();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- FunciÃ³n para sincronizar estadÃ­sticas de clientes (Total comprado y fecha Ãºltima compra)
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

    -- Si el cliente cambiÃ³ o se eliminÃ³ en una actualizaciÃ³n
    IF TG_OP = 'UPDATE' AND OLD.customer_id IS NOT NULL AND (NEW.customer_id IS NULL OR NEW.customer_id <> OLD.customer_id) THEN
        UPDATE public.customers
        SET 
            total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE customer_id = OLD.customer_id AND status = 'completed'),
            last_order_at = (SELECT MAX(created_at) FROM public.orders WHERE customer_id = OLD.customer_id AND status = 'completed')
        WHERE id = OLD.customer_id;
    END IF;

    -- Si se eliminÃ³ una orden vinculada a un cliente
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

-- Trigger para ejecutar la sincronizaciÃ³n despuÃ©s de cambios en Ã³rdenes
DROP TRIGGER IF EXISTS trigger_sync_customer_stats ON public.orders;
CREATE TRIGGER trigger_sync_customer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_stats();

-- Script de sincronizaciÃ³n inicial para corregir datos existentes
UPDATE public.customers c
SET 
    total_spent = COALESCE((SELECT SUM(o.total) FROM public.orders o WHERE o.customer_id = c.id AND o.status = 'completed'), 0),
    last_order_at = (SELECT MAX(o.created_at) FROM public.orders o WHERE o.customer_id = c.id AND o.status = 'completed');
-- Allow admins and managers to delete orders
CREATE POLICY "Admins and managers can delete orders"
ON public.orders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
  )
);

-- Ensure they can also update statuses (the current policy might already cover this, but let's be explicit if needed)
-- Current policy: "Staff can update orders" ... but it relies on store_id. 
-- Let's make sure admins/managers can update ANY order in the store.
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
);
-- RPC function to update an existing order, adjusting stock retroactively
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status text;
    v_tip_amount numeric;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb; -- Array of {product_id, qty, price, name, size_multiplier}
    
    v_old_store_id uuid;
    v_employee_id uuid;
    
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
BEGIN
    -- 1. Extract and validate basic data
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status');
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount);
    v_items := (order_update_data->'items');
    
    -- Check if user is authenticated and is admin/manager (or the owner, but usually these edits are admin-only)
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins or managers can edit orders.';
    END IF;

    -- Get old order info to identify store and items to restore stock
    SELECT store_id, created_by INTO v_old_store_id, v_employee_id
    FROM public.orders 
    WHERE id = v_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', v_order_id;
    END IF;

    -- 2. RESTORE STOCK FROM OLD ITEMS
    -- We revert the stock deduction of the existing items before applying the new ones.
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        -- Note: We need the size_multiplier that was used. 
        -- Since order_items doesn't store size_multiplier, we rely on the product being accurately reflected.
        -- HOWEVER, the original process_sale uses recipes.
        -- If recipes haven't changed, we can recalculate. 
        -- If size_multiplier was used, we should have stored it or we have to assume 1 if not available.
        -- Let's check order_items columns... it has qty, but not size_multiplier.
        -- This is a slight limitation but we will restore based on basic recipe qty * item_qty.
        
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = item_row.product_id
        LOOP
            restoration := recipe_row.quantity_required * item_row.qty; 
            -- Note: If we had size_multiplier in order_items, we'd use it here.

            UPDATE public.inventory_items
            SET stock = stock + restoration,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

            INSERT INTO public.movements (
                product_id, store_id, type, qty, reason, user_id
            ) VALUES (
                item_row.product_id, v_old_store_id, 'entry', restoration,
                'CorrecciÃ³n de Pedido #' || substring(v_order_id::text from 1 for 8) || ' (DevoluciÃ³n)',
                auth.uid()
            );
        END LOOP;
    END LOOP;

    -- 3. DELETE OLD ITEMS
    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- 4. APPLY NEW ORDER DATA
    UPDATE public.orders
    SET 
        customer_id = v_customer_id,
        status = v_status::public.order_status,
        tip_amount = v_tip_amount,
        subtotal = v_subtotal,
        total = v_total,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- 5. INSERT NEW ITEMS AND DEDUCT STOCK
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (
            v_order_id,
            item_row.product_id,
            item_row.name,
            item_row.quantity,
            item_row.price,
            0
        );

        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = item_row.product_id
        LOOP
            deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);

            SELECT stock INTO current_stock
            FROM public.inventory_items
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
            FOR UPDATE;

            IF current_stock IS NULL THEN
                 RAISE EXCEPTION 'Inventory item % not found in store %', recipe_row.inventory_item_id, v_old_store_id;
            END IF;

            UPDATE public.inventory_items
            SET stock = stock - deduction,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

            INSERT INTO public.movements (
                product_id, store_id, type, qty, reason, user_id
            ) VALUES (
                item_row.product_id, v_old_store_id, 'exit', deduction,
                'Venta POS Corregida #' || substring(v_order_id::text from 1 for 8) || ' - ' || item_row.name,
                auth.uid()
            );
        END LOOP;
    END LOOP;

    RETURN v_order_id;
END;
$$;
-- Migration to add Delivery (Domicilio) concept to Orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'pickup' CHECK (order_type IN ('pickup', 'delivery')),
ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_phone text;

-- Update process_sale RPC to handle delivery fields
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    
    -- total can be provided or calculated
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (
            new_sale_id,
            v_item.product_id,
            v_item.name,
            v_item.quantity,
            v_item.price,
            0
        );

        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = v_item.product_id
        LOOP
            deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

            SELECT stock INTO current_stock
            FROM public.inventory_items
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
            FOR UPDATE;

            IF current_stock IS NULL THEN
                 RAISE EXCEPTION 'Inventory item % not found in store %', recipe_row.inventory_item_id, v_store_id;
            END IF;

            UPDATE public.inventory_items
            SET stock = stock - deduction,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

            INSERT INTO public.movements (
                product_id, store_id, type, qty, reason, user_id
            ) VALUES (
                v_item.product_id, v_store_id, 'exit', deduction,
                'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
                v_employee_id
            );
        END LOOP;
    END LOOP;

    RETURN new_sale_id;
END;
$$;

-- Update update_order_with_stock RPC to handle delivery fields
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    
    v_old_store_id uuid;
    v_employee_id uuid;
    
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id
    FROM public.orders WHERE id = v_order_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restore Stock
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes WHERE product_id = item_row.product_id
        LOOP
            restoration := recipe_row.quantity_required * item_row.qty;
            UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            
            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
            VALUES (item_row.product_id, v_old_store_id, 'entry', restoration, 'CorrecciÃ³n Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());
        END LOOP;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Update Order
    UPDATE public.orders
    SET 
        customer_id = v_customer_id,
        status = v_status,
        tip_amount = v_tip_amount,
        delivery_fee = v_delivery_fee,
        order_type = v_order_type,
        delivery_address = v_delivery_address,
        delivery_phone = v_delivery_phone,
        subtotal = v_subtotal,
        total = v_total,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Apply New Items and Deduct Stock
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0);

        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes WHERE product_id = item_row.product_id
        LOOP
            deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
            UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
            VALUES (item_row.product_id, v_old_store_id, 'exit', deduction, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());
        END LOOP;
    END LOOP;

    RETURN v_order_id;
END;
$$;
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
            'El artÃ­culo "' || NEW.name || '" tiene un stock de ' || NEW.stock || ' ' || NEW.unit_of_measure || '. El mÃ­nimo es ' || NEW.min_stock || '.',
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
-- Migration to add notification role settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    notification_type public.notification_type NOT NULL,
    allowed_roles JSONB NOT NULL DEFAULT '["admin", "manager"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(store_id, notification_type)
);

-- Index for store lookup
CREATE INDEX idx_notification_settings_store ON public.notification_settings(store_id);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for notification_settings
CREATE POLICY "Admins and managers can manage notification settings" 
ON public.notification_settings FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager'))
);

CREATE POLICY "Everyone can read notification settings for their store" 
ON public.notification_settings FOR SELECT 
USING (
    store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
    )
);

-- Seed defaults for existing stores
INSERT INTO public.notification_settings (store_id, notification_type, allowed_roles)
SELECT id, 'inventory_low', '["admin", "manager"]'::jsonb FROM public.stores
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_settings (store_id, notification_type, allowed_roles)
SELECT id, 'system_event', '["admin", "manager"]'::jsonb FROM public.stores
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_settings (store_id, notification_type, allowed_roles)
SELECT id, 'order_event', '["admin", "manager", "cashier"]'::jsonb FROM public.stores
ON CONFLICT DO NOTHING;

-- Update Notifications RLS to respect these settings
DROP POLICY IF EXISTS "Users can view notifications for their store" ON public.notifications;

CREATE POLICY "Users can view notifications for their store based on roles" 
ON public.notifications FOR SELECT 
USING (
    store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    AND (
        -- If it's a super admin, they see everything
        public.has_role(auth.uid(), 'admin')
        OR
        -- Otherwise check if their role is in the allowed list for this notification type
        EXISTS (
            SELECT 1 FROM public.notification_settings ns
            JOIN public.user_roles ur ON ur.user_id = auth.uid()
            WHERE ns.store_id = public.notifications.store_id
            AND ns.notification_type = public.notifications.type
            AND ns.allowed_roles ? ur.role::text
        )
    )
);
-- Migration to add INSERT policy to notifications table
-- This allow admins and managers to trigger system notifications from the client side

CREATE POLICY "Admins and managers can create notifications for their store" 
ON public.notifications FOR INSERT 
WITH CHECK (
    store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    AND 
    (
        public.has_role(auth.uid(), 'admin') 
        OR 
        public.has_role(auth.uid(), 'manager')
    )
);

-- Also Ensure update policy is robust
DROP POLICY IF EXISTS "Users can update their store notifications as read" ON public.notifications;

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
-- Update process_sale RPC to handle store_stock deduction
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (
            new_sale_id,
            v_item.product_id,
            v_item.name,
            v_item.quantity,
            v_item.price,
            0,
            v_item.size,
            v_item.size_multiplier
        );

        -- =====================================
        -- 1. Deduct from store_stock (Products)
        -- =====================================
        UPDATE public.store_stock
        SET qty = qty - v_item.quantity,
            updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_store_id;

        -- Record movement for product
        INSERT INTO public.movements (
            product_id, store_id, type, qty, reason, user_id
        ) VALUES (
            v_item.product_id, v_store_id, 'exit', v_item.quantity,
            'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
            v_employee_id
        );

        -- =====================================
        -- 2. Deduct from inventory_items (Recipes)
        -- =====================================
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = v_item.product_id
        LOOP
            deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

            SELECT stock INTO current_stock
            FROM public.inventory_items
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
            FOR UPDATE;

            IF current_stock IS NOT NULL THEN
                UPDATE public.inventory_items
                SET stock = stock - deduction,
                    updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END IF;
        END LOOP;
    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- Update update_order_with_stock RPC to handle store_stock restoration and deduction
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    
    v_old_store_id uuid;
    v_employee_id uuid;
    
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id
    FROM public.orders WHERE id = v_order_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- =====================================
    -- Restore Stock from Old Items
    -- =====================================
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        -- Restore Product Stock
        UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_old_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
        VALUES (item_row.product_id, v_old_store_id, 'entry', item_row.qty, 'CorrecciÃ³n Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());

        -- Restore Recipe Stock
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes WHERE product_id = item_row.product_id
        LOOP
            restoration := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
            UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
        END LOOP;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Update Order
    UPDATE public.orders
    SET 
        customer_id = v_customer_id,
        status = v_status,
        tip_amount = v_tip_amount,
        delivery_fee = v_delivery_fee,
        order_type = v_order_type,
        delivery_address = v_delivery_address,
        delivery_phone = v_delivery_phone,
        subtotal = v_subtotal,
        total = v_total,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- =====================================
    -- Apply New Items and Deduct Stock
    -- =====================================
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0, item_row.size, item_row.size_multiplier);

        -- Deduct Product Stock
        UPDATE public.store_stock SET qty = qty - item_row.quantity, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_old_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
        VALUES (item_row.product_id, v_old_store_id, 'exit', item_row.quantity, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());

        -- Deduct Recipe Stock
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes WHERE product_id = item_row.product_id
        LOOP
            deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
            UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
        END LOOP;
    END LOOP;

    RETURN v_order_id;
END;
$$;
-- 1. Cerrar todos los turnos abiertos antiguos excepto el mÃ¡s reciente (para evitar errores al aplicar el Ã­ndice si hay duplicados existentes)
WITH ranked_turns AS (
  SELECT id,
         ROW_NUMBER() OVER(PARTITION BY store_id ORDER BY opened_at DESC) as rn
  FROM public.cash_turns
  WHERE status = 'open'
)
UPDATE public.cash_turns
SET status = 'closed',
    closed_at = now(),
    notes = coalesce(notes, '') || ' [Cierre automÃ¡tico por el sistema: ResoluciÃ³n de turnos duplicados]'
WHERE id IN (
  SELECT id FROM ranked_turns WHERE rn > 1
);

-- 2. Crear el Ã­ndice Ãºnico parcial para asegurar la regla de mÃ¡ximo 1 turno abierto por tienda
CREATE UNIQUE INDEX IF NOT EXISTS unique_open_turn_per_store 
ON public.cash_turns (store_id) 
WHERE status = 'open';
-- Drop the old constraint if it exists (assuming default naming convention)
ALTER TABLE public.cash_turns DROP CONSTRAINT IF EXISTS cash_turns_status_check;

-- Add the new constraint allowing 'paused'
ALTER TABLE public.cash_turns ADD CONSTRAINT cash_turns_status_check CHECK (status IN ('open', 'closed', 'paused'));

-- Update the unique index to enforce a maximum of 1 active turn (either open or paused) per store
DROP INDEX IF EXISTS unique_open_turn_per_store;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_turn_per_store 
ON public.cash_turns (store_id) 
WHERE status IN ('open', 'paused');
-- Add size and size_multiplier to order_items to improve stock restoration accuracy
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS size_multiplier numeric DEFAULT 1;

-- Backfill existing records (if any)
UPDATE public.order_items SET size_multiplier = 1 WHERE size_multiplier IS NULL;
-- Migration to support mixed inventory (Units and Volume)
-- This adds the is_mixture flag to identify inventory items that are prepared in batches.

ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_mixture BOOLEAN DEFAULT false;

-- Ensure numeric precision for quantities in recipes (ml)
ALTER TABLE public.recipes 
ALTER COLUMN quantity_required TYPE NUMERIC(12,4);

-- Add a comment to clarify the base unit
COMMENT ON COLUMN public.inventory_items.stock IS 'Stock level. For mixtures, this is stored in Milliliters (ml).';
-- Add volume parameterization fields to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS base_volume numeric,
ADD COLUMN IF NOT EXISTS unit_measure text DEFAULT 'oz';

-- Commentary: These fields allow for precise recipe calculations and descriptive sales.
-- =====================================================================
-- Flujo de DevoluciÃ³n Completo al Anular Ventas
-- Agrega columna de razÃ³n de anulaciÃ³n y crea RPC atÃ³mica
-- =====================================================================

-- 1. Agregar columna para razÃ³n y quiÃ©n anulÃ³
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason  text,
  ADD COLUMN IF NOT EXISTS cancelled_by         uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at         timestamptz;

-- 2. RPC: cancel_sale_with_stock_restore
--    Cancela la venta, restaura store_stock + inventory_items (recetas),
--    registra movimientos de devoluciÃ³n en movements, y guarda razÃ³n + auditor.
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
BEGIN
    -- Solo admin o manager pueden anular
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    -- Validar que el motivo no estÃ© vacÃ­o
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    -- Obtener orden y bloquearla para escritura
    SELECT store_id, created_by, status
      INTO v_store_id, v_employee_id, v_status
      FROM public.orders
     WHERE id = p_order_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada: %', p_order_id;
    END IF;

    -- Evitar doble restauraciÃ³n
    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.';
    END IF;

    -- ================================================================
    -- Iterar cada Ã­tem de la orden y restaurar inventario
    -- ================================================================
    FOR item_row IN
        SELECT oi.product_id, oi.qty, oi.name,
               COALESCE(oi.size_multiplier, 1) AS size_multiplier
          FROM public.order_items oi
         WHERE oi.order_id = p_order_id
    LOOP
        -- -----------------------------------------
        -- A. Restaurar store_stock (stock de producto)
        -- -----------------------------------------
        UPDATE public.store_stock
           SET qty        = qty + item_row.qty,
               updated_at = NOW()
         WHERE product_id = item_row.product_id
           AND store_id   = v_store_id;

        -- Movimiento de devoluciÃ³n en kardex
        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
        VALUES (
            item_row.product_id,
            v_store_id,
            'entry',
            item_row.qty,
            'ANULACIÃ“N #' || substring(p_order_id::text from 1 for 8)
              || ' â€” ' || item_row.name
              || ' | Motivo: ' || trim(p_reason),
            auth.uid()
        );

        -- -----------------------------------------
        -- B. Restaurar inventory_items (mezclas/recetas)
        --    quantity_required estÃ¡ en la misma unidad que inventory_items.stock
        --    Para granizados: ml. Se aplica el size_multiplier de la venta.
        -- -----------------------------------------
        FOR recipe_row IN
            SELECT r.inventory_item_id, r.quantity_required
              FROM public.recipes r
             WHERE r.product_id = item_row.product_id
        LOOP
            restoration := recipe_row.quantity_required
                           * item_row.qty
                           * item_row.size_multiplier;

            UPDATE public.inventory_items
               SET stock      = stock + restoration,
                   updated_at = NOW()
             WHERE id       = recipe_row.inventory_item_id
               AND store_id = v_store_id;
        END LOOP;
    END LOOP;

    -- ================================================================
    -- Marcar la orden como cancelada con razÃ³n y auditor
    -- ================================================================
    UPDATE public.orders
       SET status               = 'cancelled',
           cancellation_reason  = trim(p_reason),
           cancelled_by         = auth.uid(),
           cancelled_at         = NOW(),
           updated_at           = NOW()
     WHERE id = p_order_id;

END;
$$;

-- Permisos de ejecuciÃ³n
GRANT EXECUTE ON FUNCTION public.cancel_sale_with_stock_restore(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale_with_stock_restore(uuid, text) TO service_role;
-- =====================================================================
-- Separar tanques compartidos: un insumo de mezcla por cada granizado
-- =====================================================================
-- PROBLEMA: Todos los granizados comparten el mismo inventory_item_id 
-- en la tabla recipes. Al vaciar o preparar uno, se afectan todos.
--
-- SOLUCIÃ“N: Para cada producto granizado que comparte un insumo:
--   1. Crear un inventory_item nuevo con nombre "Mezcla {nombre_producto}"
--   2. Copiar las propiedades del insumo original (store_id, unit, is_mixture, etc.)
--   3. Actualizar la fila de recipes para apuntar al nuevo insumo
--   4. El stock del nuevo insumo inicia en 0 (se debe registrar preparaciÃ³n individual)
--
-- NOTA: El insumo original se conserva vinculado al PRIMER producto encontrado.
--       Los demÃ¡s productos reciben insumos nuevos independientes.
-- =====================================================================

DO $$
DECLARE
    shared_item RECORD;
    product_rec RECORD;
    is_first BOOLEAN;
    new_inv_id UUID;
    v_original_name TEXT;
    v_original_store_id UUID;
    v_original_sku TEXT;
    v_original_unit TEXT;
    v_original_min_stock NUMERIC;
    v_original_cost NUMERIC;
    v_original_qty_required NUMERIC;
    v_recipe_unit TEXT;
BEGIN
    -- Encontrar inventory_items compartidos por mÃ¡s de un producto
    FOR shared_item IN
        SELECT r.inventory_item_id, COUNT(*) AS product_count
        FROM public.recipes r
        JOIN public.inventory_items ii ON ii.id = r.inventory_item_id
        WHERE ii.is_mixture = TRUE
        GROUP BY r.inventory_item_id
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'ðŸ”§ Insumo compartido: % (usado por % productos)', 
            shared_item.inventory_item_id, shared_item.product_count;

        -- Obtener datos del insumo original
        SELECT name, store_id, sku, unit_of_measure, min_stock, cost_per_unit
        INTO v_original_name, v_original_store_id, v_original_sku, 
             v_original_unit, v_original_min_stock, v_original_cost
        FROM public.inventory_items
        WHERE id = shared_item.inventory_item_id;

        is_first := TRUE;

        -- Iterar cada producto vinculado a este insumo
        FOR product_rec IN
            SELECT r.id AS recipe_id, r.product_id, r.quantity_required,
                   COALESCE(r.unit, 'oz') AS recipe_unit,
                   p.name AS product_name
            FROM public.recipes r
            JOIN public.products p ON p.id = r.product_id
            WHERE r.inventory_item_id = shared_item.inventory_item_id
            ORDER BY p.name ASC
        LOOP
            IF is_first THEN
                -- El primer producto conserva el insumo original (renombrÃ¡ndolo)
                UPDATE public.inventory_items
                SET name = 'Mezcla ' || product_rec.product_name,
                    updated_at = NOW()
                WHERE id = shared_item.inventory_item_id;

                RAISE NOTICE '  âœ… Producto "%": conserva insumo original (renombrado a "Mezcla %")', 
                    product_rec.product_name, product_rec.product_name;

                is_first := FALSE;
            ELSE
                -- Los demÃ¡s productos reciben un insumo NUEVO
                INSERT INTO public.inventory_items (
                    store_id, name, sku, unit_of_measure, stock, 
                    min_stock, cost_per_unit, is_mixture
                ) VALUES (
                    v_original_store_id,
                    'Mezcla ' || product_rec.product_name,
                    CASE WHEN v_original_sku IS NOT NULL 
                         THEN v_original_sku || '-' || LEFT(REPLACE(product_rec.product_name, ' ', ''), 6)
                         ELSE NULL 
                    END,
                    v_original_unit,
                    0,  -- Stock inicia en 0, se debe registrar preparaciÃ³n
                    v_original_min_stock,
                    v_original_cost,
                    TRUE
                )
                RETURNING id INTO new_inv_id;

                -- Actualizar la receta para apuntar al nuevo insumo
                UPDATE public.recipes
                SET inventory_item_id = new_inv_id
                WHERE id = product_rec.recipe_id;

                RAISE NOTICE '  ðŸ†• Producto "%": nuevo insumo "Mezcla %" (id: %)', 
                    product_rec.product_name, product_rec.product_name, new_inv_id;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'âœ… MigraciÃ³n completada. Cada granizado ahora tiene su propio tanque de mezcla.';
END;
$$;
-- =====================================================================
-- Maestro de Tipos de Producto (Product Types Master)
-- Permite parametrizar el comportamiento, forma de venta e interfaz grÃ¡fica
-- de los diferentes tipos de producto sin tocar el cÃ³digo de la app.
-- =====================================================================

-- 1. Crear tabla principal
CREATE TABLE IF NOT EXISTS public.product_types_config (
    code text PRIMARY KEY, -- Identificador (ej. "granizado")
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE, -- Hacerlo multi-store o global (null = global)
    label text NOT NULL,
    emoji_icon text DEFAULT 'ðŸ“¦',
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

-- 2. PolÃ­ticas
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
EXECUTE FUNCTION public.set_inventory_updated_at(); -- Reutilizamos esta funciÃ³n existente

-- 4. InserciÃ³n de Datos Iniciales (Seed compatible con el enum product_type)
INSERT INTO public.product_types_config 
    (code, label, emoji_icon, color_theme, sales_mode, track_mixture_inventory, inventory_unit, allow_toppings)
VALUES 
    ('granizado', 'Granizados', 'ðŸ§', 'bg-cyan-500', 'sizes', true, 'ml', true),
    ('topping', 'Toppings', 'ðŸ’', 'bg-rose-500', 'unit', false, 'un', false),
    ('sachet', 'Sachets', 'ðŸ¥ƒ', 'bg-violet-500', 'unit', false, 'un', false),
    ('sweet', 'Dulces', 'ðŸ¬', 'bg-amber-500', 'unit', false, 'un', false)
ON CONFLICT (code) DO UPDATE 
SET 
    sales_mode = EXCLUDED.sales_mode,
    track_mixture_inventory = EXCLUDED.track_mixture_inventory,
    inventory_unit = EXCLUDED.inventory_unit;

-- Asegurar que se puede leer por guest / anon si acaso se necesita en public pages
GRANT SELECT ON public.product_types_config TO anon;
-- =====================================================================
-- AÃ±adir configuraciÃ³n "Requiere Receta" al Maestro de Tipos de Producto
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='product_types_config' AND column_name='requires_recipe'
    ) THEN
        ALTER TABLE public.product_types_config 
        ADD COLUMN requires_recipe boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Actualizamos el tipo "granizado" u otros que por lÃ³gica de negocio sÃ­ lo requieran
UPDATE public.product_types_config
SET requires_recipe = true
WHERE code = 'granizado';
-- Migration: Mix Management System
-- Description: Adds audit trail for mix preparations and a safe RPC for stock increment.

-- 1. Create mix_preparations table
CREATE TABLE IF NOT EXISTS public.mix_preparations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    liters NUMERIC NOT NULL,
    ml_converted NUMERIC NOT NULL,
    expected_cups INTEGER NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE public.mix_preparations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Staff can view preparations from their store" 
ON public.mix_preparations FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Managers can record preparations" 
ON public.mix_preparations FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager', 'staff'))
);

-- 4. RPC for Atomic Stock Increment
CREATE OR REPLACE FUNCTION public.increment_inventory_stock(
    p_item_id UUID,
    p_store_id UUID,
    p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.inventory_items
    SET stock = stock + p_amount,
        updated_at = NOW()
    WHERE id = p_item_id AND store_id = p_store_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item % in store % not found', p_item_id, p_store_id;
    END IF;
END;
$$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_mix_preparations_item ON public.mix_preparations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_mix_preparations_store ON public.mix_preparations(store_id);
CREATE INDEX IF NOT EXISTS idx_mix_preparations_created_at ON public.mix_preparations(created_at DESC);
-- ==============================================================================
-- Migration: Isolate store_stock logic for mixtures
-- Description: Evita que el `store_stock` de los productos paramÃ©tricos como
--              "granizado" o volumÃ©tricos caigan a nÃºmeros negativos durante
--              ventas/reembolsos, dejando que solo el tanque reciba el descuento.
-- ==============================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (
            new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier
        );

        <<item_processing>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            -- Determinar si el producto usa tanque
            SELECT COALESCE(pt.track_mixture_inventory, false)
              INTO is_tracked_mixture
              FROM public.products p
              LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
             WHERE p.id = v_item.product_id;
            
            -- Fallback legacy
            IF is_tracked_mixture IS NULL THEN
                SELECT CASE WHEN type::text = 'granizado' OR category = 'Granizado' THEN true ELSE false END 
                  INTO is_tracked_mixture
                  FROM public.products WHERE id = v_item.product_id;
            END IF;

            -- 1. Deduct from store_stock ONLY IF it's NOT a mixture
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock
                SET qty = qty - v_item.quantity,
                    updated_at = NOW()
                WHERE product_id = v_item.product_id AND store_id = v_store_id;

                INSERT INTO public.movements (
                    product_id, store_id, type, qty, reason, user_id
                ) VALUES (
                    v_item.product_id, v_store_id, 'exit', v_item.quantity,
                    'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
                    v_employee_id
                );
            END IF;

            -- 2. Deduct from inventory_items (Recipes) ALWAYS if present
            FOR recipe_row IN 
                SELECT inventory_item_id, quantity_required 
                FROM public.recipes 
                WHERE product_id = v_item.product_id
            LOOP
                deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

                SELECT stock INTO current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                IF current_stock IS NOT NULL THEN
                    UPDATE public.inventory_items
                    SET stock = stock - deduction,
                        updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END item_processing;
    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    v_old_store_id uuid;
    v_employee_id uuid;
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id
    FROM public.orders WHERE id = v_order_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- =====================================
    -- Restore Stock from Old Items
    -- =====================================
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        <<item_restore>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
            WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
                WHERE product_id = item_row.product_id AND store_id = v_old_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
                VALUES (item_row.product_id, v_old_store_id, 'entry', item_row.qty, 'CorrecciÃ³n Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                restoration := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_restore;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Update Order
    UPDATE public.orders
    SET customer_id = v_customer_id, status = v_status, tip_amount = v_tip_amount, delivery_fee = v_delivery_fee,
        order_type = v_order_type, delivery_address = v_delivery_address, delivery_phone = v_delivery_phone,
        subtotal = v_subtotal, total = v_total, updated_at = NOW()
    WHERE id = v_order_id;

    -- =====================================
    -- Apply New Items and Deduct Stock
    -- =====================================
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0, item_row.size, item_row.size_multiplier);

        <<item_deduct>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
            WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - item_row.quantity, updated_at = NOW()
                WHERE product_id = item_row.product_id AND store_id = v_old_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
                VALUES (item_row.product_id, v_old_store_id, 'exit', item_row.quantity, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
                UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_deduct;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id, created_by, status
      INTO v_store_id, v_employee_id, v_status
      FROM public.orders
     WHERE id = p_order_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada: %', p_order_id;
    END IF;

    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.';
    END IF;

    FOR item_row IN
        SELECT oi.product_id, oi.qty, oi.name,
               COALESCE(oi.size_multiplier, 1) AS size_multiplier
          FROM public.order_items oi
         WHERE oi.order_id = p_order_id
    LOOP
        <<item_restore_cancel>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
            WHERE p.id = item_row.product_id;

            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock
                   SET qty        = qty + item_row.qty,
                       updated_at = NOW()
                 WHERE product_id = item_row.product_id
                   AND store_id   = v_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
                VALUES (
                    item_row.product_id, v_store_id, 'entry', item_row.qty,
                    'ANULACIÃ“N #' || substring(p_order_id::text from 1 for 8) || ' â€” ' || item_row.name || ' | Motivo: ' || trim(p_reason),
                    auth.uid()
                );
            END IF;

            FOR recipe_row IN
                SELECT r.inventory_item_id, r.quantity_required
                  FROM public.recipes r
                 WHERE r.product_id = item_row.product_id
            LOOP
                restoration := recipe_row.quantity_required * item_row.qty * item_row.size_multiplier;

                UPDATE public.inventory_items
                   SET stock      = stock + restoration,
                       updated_at = NOW()
                 WHERE id       = recipe_row.inventory_item_id
                   AND store_id = v_store_id;
            END LOOP;
        END item_restore_cancel;
    END LOOP;

    UPDATE public.orders
       SET status               = 'cancelled',
           cancellation_reason  = trim(p_reason),
           cancelled_by         = auth.uid(),
           cancelled_at         = NOW(),
           updated_at           = NOW()
     WHERE id = p_order_id;
END;
$$;
-- ==============================================================================
-- Migration: Enable RLS on user_roles
-- Description: Arregla advertencias de seguridad de Supabase 'RLS Disabled'.
-- ==============================================================================

-- Habilita Row Level Security obligatoriamente
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Ya tienes una polÃ­tica: "Managers can manage all roles"
-- Por si acaso necesitas una base para que los propios usuarios puedan ver su propia fila (opcional si falta en tu base de datos):
-- CREATE POLICY "Users can read own role"
--   ON public.user_roles
--   FOR SELECT
--   USING (auth.uid() = user_id);
-- ==============================================================================
-- Migration: Fix RLS Infinite Recursion
-- Description: Replaces direct SELECTs to user_roles inside RLS policies with
--              the SECURITY DEFINER function `has_role()` to prevent infinite loops.
-- ==============================================================================

-- 1. Fix user_roles table
DROP POLICY IF EXISTS "Managers can manage all roles" ON public.user_roles;

CREATE POLICY "Managers can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')
  );

-- Basic read policy for user_roles so users can read their own role if needed
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());


-- 2. Fix profiles table policies
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can manage all profiles" ON public.profiles;

CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );


-- 3. Fix product_types_config table policies (from recent migrations)
DROP POLICY IF EXISTS "Admins and Managers can manage config" ON public.product_types_config;

-- Se reemplaza cualquier SELECT estricto en la config
CREATE POLICY "Admins and Managers can manage config"
    ON public.product_types_config FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
    );
-- ==============================================================================
-- Migration: Nuke and Rebuild RLS Policies (Nuclear Option for Recursion)
-- Description: Elimina dinÃ¡micamente TODAS las polÃ­ticas vulnerables a recursiÃ³n 
--              infinita y asegura que "has_role" sea estricto y bypasser.
-- ==============================================================================

-- 1. Asegurarnos que has_role es 100% SECURITY DEFINER y evita recursiÃ³n
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER   -- Escala permisos a Postgres para saltar el RLS de user_roles
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. Limpiar TODAS las polÃ­ticas de las tablas principales que puedan estar ocultas (usando un bucle dinÃ¡mico)
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('user_roles', 'profiles', 'roles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. Recrear PolÃ­ticas Limpias y Seguras usando solamente has_role()

-- ====================
-- USER ROLES
-- ====================
CREATE POLICY "user_roles_self_read" 
  ON public.user_roles FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_admin_manager_all" 
  ON public.user_roles FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- ====================
-- PROFILES
-- ====================
CREATE POLICY "profiles_self_select" 
  ON public.profiles FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update" 
  ON public.profiles FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "profiles_self_insert" 
  ON public.profiles FOR INSERT 
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_manager_select" 
  ON public.profiles FOR SELECT 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "profiles_admin_manager_all" 
  ON public.profiles FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- ====================
-- ROLES
-- ====================
CREATE POLICY "roles_public_select" 
  ON public.roles FOR SELECT 
  USING (true);

CREATE POLICY "roles_admin_manager_all" 
  ON public.roles FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );
-- ==============================================================================
-- Migration: Fix SQL Type Casting (product_type vs text)
-- Description: Corrige el error "operator does not exist: product_type = text" 
--              asegurando que el join convierta el tipo de la columna a texto.
-- ==============================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (
            new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier
        );

        <<item_processing>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            -- Determinar si el producto usa tanque (CORRECCIÃ“N TYPE::TEXT)
            SELECT COALESCE(pt.track_mixture_inventory, false)
              INTO is_tracked_mixture
              FROM public.products p
              LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
             WHERE p.id = v_item.product_id;
            
            -- Fallback legacy
            IF is_tracked_mixture IS NULL THEN
                SELECT CASE WHEN type::text = 'granizado' OR category = 'Granizado' THEN true ELSE false END 
                  INTO is_tracked_mixture
                  FROM public.products WHERE id = v_item.product_id;
            END IF;

            -- 1. Deduct from store_stock ONLY IF it's NOT a mixture
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock
                SET qty = qty - v_item.quantity,
                    updated_at = NOW()
                WHERE product_id = v_item.product_id AND store_id = v_store_id;

                INSERT INTO public.movements (
                    product_id, store_id, type, qty, reason, user_id
                ) VALUES (
                    v_item.product_id, v_store_id, 'exit', v_item.quantity,
                    'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
                    v_employee_id
                );
            END IF;

            -- 2. Deduct from inventory_items (Recipes) ALWAYS if present
            FOR recipe_row IN 
                SELECT inventory_item_id, quantity_required 
                FROM public.recipes 
                WHERE product_id = v_item.product_id
            LOOP
                deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

                SELECT stock INTO current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                IF current_stock IS NOT NULL THEN
                    UPDATE public.inventory_items
                    SET stock = stock - deduction,
                        updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END item_processing;
    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    v_old_store_id uuid;
    v_employee_id uuid;
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id
    FROM public.orders WHERE id = v_order_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- =====================================
    -- Restore Stock from Old Items
    -- =====================================
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        <<item_restore>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
            WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
                WHERE product_id = item_row.product_id AND store_id = v_old_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
                VALUES (item_row.product_id, v_old_store_id, 'entry', item_row.qty, 'CorrecciÃ³n Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                restoration := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_restore;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Update Order
    UPDATE public.orders
    SET customer_id = v_customer_id, status = v_status, tip_amount = v_tip_amount, delivery_fee = v_delivery_fee,
        order_type = v_order_type, delivery_address = v_delivery_address, delivery_phone = v_delivery_phone,
        subtotal = v_subtotal, total = v_total, updated_at = NOW()
    WHERE id = v_order_id;

    -- =====================================
    -- Apply New Items and Deduct Stock
    -- =====================================
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0, item_row.size, item_row.size_multiplier);

        <<item_deduct>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
            WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - item_row.quantity, updated_at = NOW()
                WHERE product_id = item_row.product_id AND store_id = v_old_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
                VALUES (item_row.product_id, v_old_store_id, 'exit', item_row.quantity, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
                UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_deduct;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id, created_by, status
      INTO v_store_id, v_employee_id, v_status
      FROM public.orders
     WHERE id = p_order_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada: %', p_order_id;
    END IF;

    IF v_status::text = 'cancelled' THEN
        RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.';
    END IF;

    FOR item_row IN
        SELECT oi.product_id, oi.qty, oi.name,
               COALESCE(oi.size_multiplier, 1) AS size_multiplier
          FROM public.order_items oi
         WHERE oi.order_id = p_order_id
    LOOP
        <<item_restore_cancel>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
            WHERE p.id = item_row.product_id;

            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock
                   SET qty        = qty + item_row.qty,
                       updated_at = NOW()
                 WHERE product_id = item_row.product_id
                   AND store_id   = v_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
                VALUES (
                    item_row.product_id, v_store_id, 'entry', item_row.qty,
                    'ANULACIÃ“N #' || substring(p_order_id::text from 1 for 8) || ' â€” ' || item_row.name || ' | Motivo: ' || trim(p_reason),
                    auth.uid()
                );
            END IF;

            FOR recipe_row IN
                SELECT r.inventory_item_id, r.quantity_required
                  FROM public.recipes r
                 WHERE r.product_id = item_row.product_id
            LOOP
                restoration := recipe_row.quantity_required * item_row.qty * item_row.size_multiplier;

                UPDATE public.inventory_items
                   SET stock      = stock + restoration,
                       updated_at = NOW()
                 WHERE id       = recipe_row.inventory_item_id
                   AND store_id = v_store_id;
            END LOOP;
        END item_restore_cancel;
    END LOOP;

    UPDATE public.orders
       SET status               = 'cancelled'::public.order_status,
           cancellation_reason  = trim(p_reason),
           cancelled_by         = auth.uid(),
           cancelled_at         = NOW(),
           updated_at           = NOW()
     WHERE id = p_order_id;
END;
$$;
-- ==============================================================================
-- Migration: Add Cancellation Audit Fields to Orders
-- Description: Agrega las columnas fÃ­sicamente a la base de datos para registrar
--              quiÃ©n, cuÃ¡ndo y por quÃ© se anulÃ³ una venta, permitiendo
--              el correcto funcionamiento de 'cancel_sale_with_stock_restore'.
-- ==============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
-- ==============================================================================
-- Migration: Sync Mixture Deduction Math 
-- Description: Asegura que si la unidad de la receta es 'ml' y es un granizado,
--              el backend multiplique la cantidad por el base_volumen del vaso
--              y por la conversiÃ³n (29.57) en vez de restar solo "1".
-- ==============================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    v_base_vol numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        <<item_processing>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            -- Obtener base_volume del producto
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = v_item.product_id;

            -- Determinar si el producto usa tanque
            SELECT COALESCE(pt.track_mixture_inventory, false)
              INTO is_tracked_mixture
              FROM public.products p
              LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
             WHERE p.id = v_item.product_id;
            
            IF is_tracked_mixture IS NULL THEN
                SELECT CASE WHEN type::text = 'granizado' OR category = 'Granizado' THEN true ELSE false END 
                  INTO is_tracked_mixture
                  FROM public.products WHERE id = v_item.product_id;
            END IF;

            -- 1. Deduct from store_stock ONLY IF it's NOT a mixture
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
                WHERE product_id = v_item.product_id AND store_id = v_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
                VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);
            END IF;

            -- 2. Deduct from inventory_items (Recipes)
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure 
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = v_item.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    -- Sinergia MatemÃ¡tica: Multiplicamos la base (oz) por el vaso (multiplier) y pasamos a ML (29.57)
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                END IF;

                SELECT stock INTO current_stock FROM public.inventory_items WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id FOR UPDATE;

                IF current_stock IS NOT NULL THEN
                    UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END item_processing;
    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    v_old_store_id uuid;
    v_employee_id uuid;
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
    v_base_vol numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- =====================================
    -- Restore Stock from Old Items
    -- =====================================
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        <<item_restore>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'entry', item_row.qty, 'CorrecciÃ³n Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    restoration := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_restore;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;
    UPDATE public.orders SET customer_id = v_customer_id, status = v_status, tip_amount = v_tip_amount, delivery_fee = v_delivery_fee, order_type = v_order_type, delivery_address = v_delivery_address, delivery_phone = v_delivery_phone, subtotal = v_subtotal, total = v_total, updated_at = NOW() WHERE id = v_order_id;

    -- =====================================
    -- Apply New Items and Deduct Stock
    -- =====================================
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier) VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0, item_row.size, item_row.size_multiplier);

        <<item_deduct>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - item_row.quantity, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'exit', item_row.quantity, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_deduct;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
    v_base_vol   numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id, created_by, status INTO v_store_id, v_employee_id, v_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venta no encontrada: %', p_order_id; END IF;
    IF v_status::text = 'cancelled' THEN RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.'; END IF;

    FOR item_row IN SELECT oi.product_id, oi.qty, oi.name, COALESCE(oi.size_multiplier, 1) AS size_multiplier FROM public.order_items oi WHERE oi.order_id = p_order_id
    LOOP
        <<item_restore_cancel>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_store_id, 'entry', item_row.qty, 'ANULACIÃ“N #' || substring(p_order_id::text from 1 for 8) || ' â€” ' || item_row.name || ' | Motivo: ' || trim(p_reason), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    restoration := recipe_row.quantity_required * v_base_vol * item_row.size_multiplier * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * item_row.size_multiplier;
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END item_restore_cancel;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled'::public.order_status, cancellation_reason = trim(p_reason), cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;
-- ==============================================================================
-- Migration: Fix unit_of_measure column error
-- Description: Evita llamar a 'unit_of_measure' (que parece haber sido tipeado 
--              distinto o renombrado) y usa de forma segura `is_mixture`
--              para identificar los tanques volumÃ©tricos.
-- ==============================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    v_base_vol numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        <<item_processing>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = v_item.product_id;

            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;
            
            IF is_tracked_mixture IS NULL THEN
                SELECT CASE WHEN type::text = 'granizado' OR category = 'Granizado' THEN true ELSE false END 
                INTO is_tracked_mixture FROM public.products WHERE id = v_item.product_id;
            END IF;

            -- 1. Deduct from store_stock ONLY IF it's NOT a mixture
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
                WHERE product_id = v_item.product_id AND store_id = v_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
                VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);
            END IF;

            -- 2. Deduct from inventory_items (Recipes)
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture 
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = v_item.product_id
            LOOP
                IF recipe_row.is_mixture AND is_tracked_mixture THEN
                    -- Sinergia MatemÃ¡tica (Usa is_mixture en vez de unit_of_measure para evitar crash)
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                END IF;

                SELECT stock INTO current_stock FROM public.inventory_items WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id FOR UPDATE;

                IF current_stock IS NOT NULL THEN
                    UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END item_processing;
    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    v_old_store_id uuid;
    v_employee_id uuid;
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
    v_base_vol numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- =====================================
    -- Restore Stock from Old Items
    -- =====================================
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        <<item_restore>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'entry', item_row.qty, 'CorrecciÃ³n Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.is_mixture AND is_tracked_mixture THEN
                    restoration := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_restore;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;
    UPDATE public.orders SET customer_id = v_customer_id, status = v_status, tip_amount = v_tip_amount, delivery_fee = v_delivery_fee, order_type = v_order_type, delivery_address = v_delivery_address, delivery_phone = v_delivery_phone, subtotal = v_subtotal, total = v_total, updated_at = NOW() WHERE id = v_order_id;

    -- =====================================
    -- Apply New Items and Deduct Stock
    -- =====================================
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier) VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0, item_row.size, item_row.size_multiplier);

        <<item_deduct>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - item_row.quantity, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'exit', item_row.quantity, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.is_mixture AND is_tracked_mixture THEN
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_deduct;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
    v_base_vol   numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id, created_by, status INTO v_store_id, v_employee_id, v_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venta no encontrada: %', p_order_id; END IF;
    IF v_status::text = 'cancelled' THEN RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.'; END IF;

    FOR item_row IN SELECT oi.product_id, oi.qty, oi.name, COALESCE(oi.size_multiplier, 1) AS size_multiplier FROM public.order_items oi WHERE oi.order_id = p_order_id
    LOOP
        <<item_restore_cancel>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_store_id, 'entry', item_row.qty, 'ANULACIÃ“N #' || substring(p_order_id::text from 1 for 8) || ' â€” ' || item_row.name || ' | Motivo: ' || trim(p_reason), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.is_mixture AND is_tracked_mixture THEN
                    restoration := recipe_row.quantity_required * v_base_vol * item_row.size_multiplier * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * item_row.size_multiplier;
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END item_restore_cancel;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled'::public.order_status, cancellation_reason = trim(p_reason), cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;
-- ==============================================================================
-- Migration: Restore Product Specific Deduction
-- Description: Elimina las restricciones que impedÃ­an descontar del store_stock
--              cuando un producto era granizado. Ahora se descuenta SIEMPRE
--              el producto (para historial) Y la receta (para mediciÃ³n).
-- ==============================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    v_base_vol numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        <<item_processing>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            -- Obtener base_volume del producto
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = v_item.product_id;

            -- Determinar si el producto usa tanque (solo para lÃ³gica de ML)
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture
            FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;
            
            IF is_tracked_mixture IS NULL THEN
                SELECT CASE WHEN type::text = 'granizado' OR category = 'Granizado' THEN true ELSE false END 
                INTO is_tracked_mixture FROM public.products WHERE id = v_item.product_id;
            END IF;

            -- 1. Siempre descontamos del store_stock (EspecÃ­fico del producto)
            UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
            WHERE product_id = v_item.product_id AND store_id = v_store_id;

            -- 2. Siempre registramos el movimiento del producto
            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
            VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

            -- 3. Descontar de inventory_items vÃ­a Receta (MediciÃ³n de componentes)
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture 
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = v_item.product_id
            LOOP
                IF recipe_row.is_mixture AND COALESCE(is_tracked_mixture, false) THEN
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                END IF;

                SELECT stock INTO current_stock FROM public.inventory_items WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id FOR UPDATE;

                IF current_stock IS NOT NULL THEN
                    UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END item_processing;
    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    v_old_store_id uuid;
    v_employee_id uuid;
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
    v_base_vol numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- =====================================
    -- Restore Stock from Old Items (ALWAYS)
    -- =====================================
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        <<item_restore>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            -- Restaurar Producto
            UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'entry', item_row.qty, 'CorrecciÃ³n Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());

            -- Restaurar Receta
            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.is_mixture AND COALESCE(is_tracked_mixture, false) THEN
                    restoration := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_restore;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;
    UPDATE public.orders SET customer_id = v_customer_id, status = v_status, tip_amount = v_tip_amount, delivery_fee = v_delivery_fee, order_type = v_order_type, delivery_address = v_delivery_address, delivery_phone = v_delivery_phone, subtotal = v_subtotal, total = v_total, updated_at = NOW() WHERE id = v_order_id;

    -- =====================================
    -- Apply New Items and Deduct Stock (ALWAYS)
    -- =====================================
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier) VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0, item_row.size, item_row.size_multiplier);

        <<item_deduct>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            -- Descontar Producto
            UPDATE public.store_stock SET qty = qty - item_row.quantity, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'exit', item_row.quantity, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());

            -- Descontar Receta
            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.is_mixture AND COALESCE(is_tracked_mixture, false) THEN
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_deduct;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
    v_base_vol   numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id, created_by, status INTO v_store_id, v_employee_id, v_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venta no encontrada: %', p_order_id; END IF;
    IF v_status::text = 'cancelled' THEN RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.'; END IF;

    FOR item_row IN SELECT oi.product_id, oi.qty, oi.name, COALESCE(oi.size_multiplier, 1) AS size_multiplier FROM public.order_items oi WHERE oi.order_id = p_order_id
    LOOP
        <<item_restore_cancel>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

            -- Restaurar Producto
            UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_store_id;
            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_store_id, 'entry', item_row.qty, 'ANULACIÃ“N #' || substring(p_order_id::text from 1 for 8) || ' â€” ' || item_row.name || ' | Motivo: ' || trim(p_reason), auth.uid());

            -- Restaurar Receta
            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, COALESCE(ii.is_mixture, false) as is_mixture FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.is_mixture AND COALESCE(is_tracked_mixture, false) THEN
                    restoration := recipe_row.quantity_required * v_base_vol * item_row.size_multiplier * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * item_row.size_multiplier;
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END item_restore_cancel;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled'::public.order_status, cancellation_reason = trim(p_reason), cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;
-- =====================================================================
-- Migration: Bootstrap Config and Recipes
-- Description: Asegura que las parametrizaciones y recetas por defecto existan.
-- =====================================================================

-- 1. Poblar product_types_config si estÃ¡ vacÃ­o
INSERT INTO public.product_types_config 
    (code, label, emoji_icon, color_theme, sales_mode, track_mixture_inventory, inventory_unit, allow_toppings)
VALUES 
    ('granizado', 'Granizados', 'ðŸ§', 'bg-cyan-500', 'sizes', true, 'ml', true),
    ('topping', 'Toppings', 'ðŸ’', 'bg-rose-500', 'unit', false, 'un', false),
    ('sachet', 'Sachets', 'ðŸ¥ƒ', 'bg-violet-500', 'unit', false, 'un', false),
    ('sweet', 'Dulces', 'ðŸ¬', 'bg-amber-500', 'unit', false, 'un', false)
ON CONFLICT (code) DO UPDATE 
SET 
    sales_mode = EXCLUDED.sales_mode,
    track_mixture_inventory = EXCLUDED.track_mixture_inventory,
    inventory_unit = EXCLUDED.inventory_unit,
    allow_toppings = EXCLUDED.allow_toppings;

-- 2. Crear Tanques y Recetas para granizados huÃ©rfanos
DO $$
DECLARE
    prod RECORD;
    new_inv_id UUID;
BEGIN
    FOR prod IN 
        SELECT p.id, p.name, p.store_id 
        FROM public.products p
        WHERE (p.type::text = 'granizado' OR p.category = 'Granizado')
          AND NOT EXISTS (SELECT 1 FROM public.recipes r WHERE r.product_id = p.id)
    LOOP
        RAISE NOTICE 'ðŸ”§ Creando tanque y receta para: %', prod.name;

        -- Crear Insumo de Inventario (Tanque)
        INSERT INTO public.inventory_items (
            store_id, name, unit, stock, is_mixture, created_at
        ) VALUES (
            prod.store_id,
            'Tanque ' || prod.name,
            'ml',
            0,
            TRUE,
            NOW()
        )
        RETURNING id INTO new_inv_id;

        -- Crear Receta (VÃ­nculo)
        INSERT INTO public.recipes (
            product_id, inventory_item_id, quantity_required, created_at
        ) VALUES (
            prod.id,
            new_inv_id,
            4, -- Cantidad base aproximada por unidad sold (medida en ml = 4ml / units?) 
               -- Nota: Si es volumen real, esto se multiplica por el size multiplier.
            NOW()
        );
    END LOOP;
END;
$$;
-- =====================================================================
-- Migration: Strict Parameterized Inventory Logic
-- Description: Unifica la lÃ³gica de descuento basÃ¡ndose en product_types_config.
--              Garantiza trazabilidad dual (Unidades + Mezcla) para granizados.
-- =====================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, (sale_data->>'customer_id')::uuid, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        -- Insert order item
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        -- Obtener parametrizaciÃ³n del producto
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p
          LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
         WHERE p.id = v_item.product_id;

        -- 1. DeducciÃ³n de PRODUCTO (Stock de Unidades / store_stock)
        -- Siempre descontamos el producto vendido para historial y trazabilidad de unidades (vasos/combos)
        UPDATE public.store_stock 
           SET qty = qty - v_item.quantity, 
               updated_at = NOW()
         WHERE product_id = v_item.product_id AND store_id = v_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
        VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

        -- 2. DeducciÃ³n de MEZCLA (MediciÃ³n de Tanques / inventory_items)
        -- Solo si el tipo de producto estÃ¡ configurado para trackear mezcla (granizados)
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required
                FROM public.recipes r
                WHERE r.product_id = v_item.product_id
            LOOP
                v_deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

                UPDATE public.inventory_items 
                   SET stock = stock - v_deduction, 
                       updated_at = NOW()
                 WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;

    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock (Misma lÃ³gica simÃ©trica)
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_old_store_id uuid;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    
    SELECT store_id INTO v_old_store_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restaurar Stock de items viejos
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + v_item.qty, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                v_val := recipe_row.quantity_required * v_item.qty * COALESCE(v_item.size_multiplier, 1);
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Actualizar cabecera (Status, total, etc.)
    UPDATE public.orders
    SET status = (order_update_data->>'status')::public.order_status,
        total = (order_update_data->>'total')::numeric,
        subtotal = (order_update_data->>'subtotal')::numeric,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Aplicar Nuevos items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(order_update_data->'items') AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Descontar Unidades
        UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Descontar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                v_val := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                UPDATE public.inventory_items SET stock = stock - v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id uuid;
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
BEGIN
    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                v_val := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled', cancellation_reason = p_reason, updated_at = NOW() WHERE id = p_order_id;
END;
$$;
-- =====================================================================
-- Migration: Fix Double Deduction Mixture
-- Description: Elimina la multiplicaciÃ³n por size_multiplier en el cÃ¡lculo
--              de deducciÃ³n de recetas, ya que las preparaciones (ej. bases
--              de 10oz) ya tienen definida la cantidad exacta a descontar.
-- =====================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, (sale_data->>'customer_id')::uuid, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        -- Insert order item
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        -- Obtener parametrizaciÃ³n del producto
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p
           LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
         WHERE p.id = v_item.product_id;

        -- 1. DeducciÃ³n de PRODUCTO (Stock de Unidades / store_stock)
        UPDATE public.store_stock 
           SET qty = qty - v_item.quantity, 
               updated_at = NOW()
         WHERE product_id = v_item.product_id AND store_id = v_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
        VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

        -- 2. DeducciÃ³n de MEZCLA (MediciÃ³n de Tanques / inventory_items)
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required
                FROM public.recipes r
                WHERE r.product_id = v_item.product_id
            LOOP
                -- FIX: Se eliminÃ³ * COALESCE(v_item.size_multiplier, 1) para evitar cobro doble
                v_deduction := recipe_row.quantity_required * v_item.quantity;

                UPDATE public.inventory_items 
                   SET stock = stock - v_deduction, 
                       updated_at = NOW()
                 WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;

    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock (Misma lÃ³gica simÃ©trica)
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_old_store_id uuid;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    
    SELECT store_id INTO v_old_store_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restaurar Stock de items viejos
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + v_item.qty, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                -- FIX: Se eliminÃ³ * COALESCE(v_item.size_multiplier, 1)
                v_val := recipe_row.quantity_required * v_item.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Actualizar cabecera (Status, total, etc.)
    UPDATE public.orders
    SET status = (order_update_data->>'status')::public.order_status,
        total = (order_update_data->>'total')::numeric,
        subtotal = (order_update_data->>'subtotal')::numeric,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Aplicar Nuevos items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(order_update_data->'items') AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Descontar Unidades
        UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Descontar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                -- FIX: Se eliminÃ³ * COALESCE(v_item.size_multiplier, 1)
                v_val := recipe_row.quantity_required * v_item.quantity;
                UPDATE public.inventory_items SET stock = stock - v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id uuid;
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
BEGIN
    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                -- FIX: Se eliminÃ³ * COALESCE(item_row.size_multiplier, 1)
                v_val := recipe_row.quantity_required * item_row.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled', cancellation_reason = p_reason, updated_at = NOW() WHERE id = p_order_id;
END;
$$;
-- =====================================================================
-- Migration: Fix Critical Security and Race Conditions
-- Description:
--   1. Restore auth checks (has_role) in update_order_with_stock
--      and cancel_sale_with_stock_restore (lost in last migration)
--   2. Restore FOR UPDATE row lock on inventory_items in process_sale
--      to prevent phantom stock under concurrent sales
-- =====================================================================

-- 1. Fix process_sale â€” add FOR UPDATE lock on inventory_items
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_deduction numeric;
    v_current_stock numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, (sale_data->>'customer_id')::uuid, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        -- Insert order item
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        -- Obtener parametrizaciÃ³n del producto
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p
           LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
         WHERE p.id = v_item.product_id;

        -- 1. DeducciÃ³n de PRODUCTO (Stock de Unidades / store_stock)
        UPDATE public.store_stock 
           SET qty = qty - v_item.quantity, 
               updated_at = NOW()
         WHERE product_id = v_item.product_id AND store_id = v_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
        VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

        -- 2. DeducciÃ³n de MEZCLA (MediciÃ³n de Tanques / inventory_items)
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required
                FROM public.recipes r
                WHERE r.product_id = v_item.product_id
            LOOP
                -- Lock row before reading to prevent concurrent sale race
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                IF v_current_stock IS NOT NULL THEN
                    v_deduction := recipe_row.quantity_required * v_item.quantity;

                    UPDATE public.inventory_items 
                       SET stock = stock - v_deduction, 
                           updated_at = NOW()
                     WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END IF;

    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Fix update_order_with_stock â€” restore auth check
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_old_store_id uuid;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_order_id := (order_update_data->>'order_id')::uuid;
    
    SELECT store_id INTO v_old_store_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restaurar Stock de items viejos
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + v_item.qty, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                FOR UPDATE;

                v_val := recipe_row.quantity_required * v_item.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Actualizar cabecera (Status, total, etc.)
    UPDATE public.orders
    SET status = (order_update_data->>'status')::public.order_status,
        total = (order_update_data->>'total')::numeric,
        subtotal = (order_update_data->>'subtotal')::numeric,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Aplicar Nuevos items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(order_update_data->'items') AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Descontar Unidades
        UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Descontar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                FOR UPDATE;

                v_val := recipe_row.quantity_required * v_item.quantity;
                UPDATE public.inventory_items SET stock = stock - v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Fix cancel_sale_with_stock_restore â€” restore auth check
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id uuid;
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                v_val := recipe_row.quantity_required * item_row.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled', cancellation_reason = p_reason, cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;

-- 4. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(type);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
-- Migration: Create Machine Tanks System
-- Description: Adds machine_tanks table, vw_tank_percentages view, and updates process_sale / update_order_with_stock / cancel_sale_with_stock_restore RPCs to update machine_tanks atomically.

-- 1. Create machine_tanks table
CREATE TABLE IF NOT EXISTS public.machine_tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    current_volume_ml NUMERIC NOT NULL DEFAULT 0,
    max_capacity_ml NUMERIC NOT NULL DEFAULT 12000, -- Default 12 Liters
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_store_tank_name UNIQUE (store_id, name)
);

-- Enable RLS
ALTER TABLE public.machine_tanks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users in same store" 
ON public.machine_tanks FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable all access for admins and managers" 
ON public.machine_tanks FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager'))
);

-- Trigger for updated_at
CREATE TRIGGER update_machine_tanks_updated_at
BEFORE UPDATE ON public.machine_tanks
FOR EACH ROW
EXECUTE FUNCTION set_inventory_updated_at();

-- Populate machine_tanks from existing mixture inventory_items
INSERT INTO public.machine_tanks (store_id, name, current_volume_ml, max_capacity_ml, inventory_item_id)
SELECT 
    store_id, 
    COALESCE(NULLIF(REPLACE(name, 'Mezcla ', ''), ''), name) AS name, 
    stock AS current_volume_ml, 
    12000 AS max_capacity_ml, 
    id AS inventory_item_id
FROM public.inventory_items
WHERE is_mixture = TRUE
ON CONFLICT (store_id, name) DO UPDATE
SET inventory_item_id = EXCLUDED.inventory_item_id,
    current_volume_ml = EXCLUDED.current_volume_ml;

-- 2. Create vw_tank_percentages view
CREATE OR REPLACE VIEW public.vw_tank_percentages AS
SELECT 
    id,
    store_id,
    name,
    current_volume_ml,
    max_capacity_ml,
    ROUND((current_volume_ml::numeric / max_capacity_ml::numeric) * 100, 2) AS percentage,
    updated_at,
    inventory_item_id
FROM public.machine_tanks;

-- 3. Recreate process_sale RPC with atomic machine_tanks updates
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_deduction numeric;
    v_current_stock numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, (sale_data->>'customer_id')::uuid, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        -- Insert order item
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        -- Obtener parametrizaciÃ³n del producto
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p
           LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
         WHERE p.id = v_item.product_id;

        -- 1. DeducciÃ³n de PRODUCTO (Stock de Unidades / store_stock)
        UPDATE public.store_stock 
           SET qty = qty - v_item.quantity, 
               updated_at = NOW()
         WHERE product_id = v_item.product_id AND store_id = v_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
        VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

        -- 2. DeducciÃ³n de MEZCLA (MediciÃ³n de Tanques / inventory_items & machine_tanks)
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required
                FROM public.recipes r
                WHERE r.product_id = v_item.product_id
            LOOP
                -- Lock row before reading to prevent concurrent sale race
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                IF v_current_stock IS NOT NULL THEN
                    v_deduction := recipe_row.quantity_required * v_item.quantity;

                    UPDATE public.inventory_items 
                       SET stock = stock - v_deduction, 
                           updated_at = NOW()
                     WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

                    -- Deduct from machine tanks atomically
                    UPDATE public.machine_tanks
                       SET current_volume_ml = GREATEST(0, current_volume_ml - v_deduction),
                           updated_at = NOW()
                     WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END IF;

    END LOOP;

    RETURN new_sale_id;
END;
$$;

-- 4. Recreate update_order_with_stock RPC with atomic machine_tanks updates
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_old_store_id uuid;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_order_id := (order_update_data->>'order_id')::uuid;
    
    SELECT store_id INTO v_old_store_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restaurar Stock de items viejos
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + v_item.qty, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                FOR UPDATE;

                v_val := recipe_row.quantity_required * v_item.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

                -- Restore machine tank volume
                UPDATE public.machine_tanks
                   SET current_volume_ml = LEAST(max_capacity_ml, current_volume_ml + v_val),
                       updated_at = NOW()
                 WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Actualizar cabecera (Status, total, etc.)
    UPDATE public.orders
    SET status = (order_update_data->>'status')::public.order_status,
        total = (order_update_data->>'total')::numeric,
        subtotal = (order_update_data->>'subtotal')::numeric,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Aplicar Nuevos items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(order_update_data->'items') AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = v_item.product_id;

        -- Descontar Unidades
        UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Descontar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                FOR UPDATE;

                v_val := recipe_row.quantity_required * v_item.quantity;
                UPDATE public.inventory_items SET stock = stock - v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

                -- Deduct from machine tanks atomically
                UPDATE public.machine_tanks
                   SET current_volume_ml = GREATEST(0, current_volume_ml - v_val),
                       updated_at = NOW()
                 WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 5. Recreate cancel_sale_with_stock_restore RPC with atomic machine_tanks updates
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id uuid;
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                v_val := recipe_row.quantity_required * item_row.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

                -- Restore machine tank volume
                UPDATE public.machine_tanks
                   SET current_volume_ml = LEAST(max_capacity_ml, current_volume_ml + v_val),
                       updated_at = NOW()
                 WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled', cancellation_reason = p_reason, cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;

-- 6. Trigger to sync general stock updates (e.g. from preparations or manual edits) to machine tanks
CREATE OR REPLACE FUNCTION public.sync_inventory_stock_to_machine_tanks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only sync if it's a mixture item
    IF NEW.is_mixture = TRUE THEN
        UPDATE public.machine_tanks
        SET current_volume_ml = GREATEST(0, LEAST(max_capacity_ml, NEW.stock)),
            updated_at = NOW()
        WHERE inventory_item_id = NEW.id;
    END If;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_stock_to_machine_tanks ON public.inventory_items;
CREATE TRIGGER trg_sync_inventory_stock_to_machine_tanks
AFTER UPDATE OF stock ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_stock_to_machine_tanks();

-- Grant access to View to authenticated users
GRANT SELECT ON public.vw_tank_percentages TO authenticated;
GRANT SELECT ON public.vw_tank_percentages TO service_role;
-- Migration: Sync Tanks Triggers and Backfill
-- Description: Creates robust triggers to automatically sync inventory mixtures to machine tanks on insert, update, and delete, and adds an RPC to initialize store tanks.

-- 1. Create or replace trigger function for inventory insert/update
CREATE OR REPLACE FUNCTION public.sync_inventory_to_machine_tanks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.is_mixture = TRUE THEN
        INSERT INTO public.machine_tanks (store_id, name, current_volume_ml, max_capacity_ml, inventory_item_id)
        VALUES (
            NEW.store_id,
            COALESCE(NULLIF(REPLACE(NEW.name, 'Mezcla ', ''), ''), NEW.name),
            NEW.stock,
            12000, -- Default capacity 12 Liters
            NEW.id
        )
        ON CONFLICT (store_id, name) DO UPDATE
        SET inventory_item_id = EXCLUDED.inventory_item_id,
            current_volume_ml = EXCLUDED.current_volume_ml,
            updated_at = NOW();
    ELSE
        -- If it was a mixture but is no longer, remove the tank
        DELETE FROM public.machine_tanks WHERE inventory_item_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Create or replace trigger function for inventory delete
CREATE OR REPLACE FUNCTION public.sync_inventory_delete_to_machine_tanks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.machine_tanks WHERE inventory_item_id = OLD.id;
    RETURN OLD;
END;
$$;

-- 3. Setup triggers on inventory_items
DROP TRIGGER IF EXISTS trg_sync_inventory_stock_to_machine_tanks ON public.inventory_items;
DROP TRIGGER IF EXISTS trg_sync_inventory_to_machine_tanks ON public.inventory_items;

CREATE TRIGGER trg_sync_inventory_to_machine_tanks
AFTER INSERT OR UPDATE OF stock, name, is_mixture, store_id ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_to_machine_tanks();

DROP TRIGGER IF EXISTS trg_sync_inventory_delete_to_machine_tanks ON public.inventory_items;

CREATE TRIGGER trg_sync_inventory_delete_to_machine_tanks
AFTER DELETE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_delete_to_machine_tanks();

-- 4. Create function to manually/programmatically initialize store tanks
CREATE OR REPLACE FUNCTION public.initialize_store_tanks(p_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_item record;
BEGIN
    -- Backfill from existing mixture items for this store
    FOR v_item IN 
        SELECT id, name, stock 
        FROM public.inventory_items 
        WHERE store_id = p_store_id AND is_mixture = TRUE
    LOOP
        INSERT INTO public.machine_tanks (store_id, name, current_volume_ml, max_capacity_ml, inventory_item_id)
        VALUES (
            p_store_id,
            COALESCE(NULLIF(REPLACE(v_item.name, 'Mezcla ', ''), ''), v_item.name),
            v_item.stock,
            12000,
            v_item.id
        )
        ON CONFLICT (store_id, name) DO UPDATE
        SET inventory_item_id = EXCLUDED.inventory_item_id,
            current_volume_ml = EXCLUDED.current_volume_ml,
            updated_at = NOW();
            
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.initialize_store_tanks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_store_tanks(uuid) TO service_role;

-- 5. Perform instant backfill for all stores
SELECT public.initialize_store_tanks(id) FROM public.stores;
-- 1. Eliminar polÃ­ticas antiguas
DROP POLICY IF EXISTS "Enable read access for all users in same store" ON public.machine_tanks;
DROP POLICY IF EXISTS "Enable all access for admins and managers" ON public.machine_tanks;

-- 2. Crear nueva polÃ­tica de lectura amplia
CREATE POLICY "Enable read access for all authorized users" 
ON public.machine_tanks FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'owner') OR
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 3. Crear nueva polÃ­tica de escritura para roles globales
CREATE POLICY "Enable all access for admins, managers and owners" 
ON public.machine_tanks FOR ALL 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'owner')
);

-- 4. Crear polÃ­tica de escritura para directores de tienda (store_manager) sobre su tienda
CREATE POLICY "Enable write access for store managers in their store"
ON public.machine_tanks FOR ALL
USING (
  public.has_role(auth.uid(), 'store_manager') AND
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);
-- ==============================================================================
-- Migration: Fix Tank Volume Deduction Math
-- Description: Re-introduces the volume conversion formula for mixture/tank deductions
--              which was lost during the implementation of the machine_tanks table.
--              Deduction (ml) = quantity_required * base_volume * size_multiplier * 29.57 * quantity
-- ==============================================================================

-- 1. Recreate process_sale with correct formula
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_deduction numeric;
    v_current_stock numeric;
    v_base_vol numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, (sale_data->>'customer_id')::uuid, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        -- Insert order item
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        -- Obtener parametrizaciÃ³n del producto
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p
            LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
         WHERE p.id = v_item.product_id;

        SELECT COALESCE(base_volume, 4)
          INTO v_base_vol
          FROM public.products
         WHERE id = v_item.product_id;

        -- 1. DeducciÃ³n de PRODUCTO (Stock de Unidades / store_stock)
        UPDATE public.store_stock 
           SET qty = qty - v_item.quantity, 
               updated_at = NOW()
         WHERE product_id = v_item.product_id AND store_id = v_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
        VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

        -- 2. DeducciÃ³n de MEZCLA (MediciÃ³n de Tanques / inventory_items & machine_tanks)
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, ii.unit
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = v_item.product_id
            LOOP
                -- Lock row before reading to prevent concurrent sale race
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                IF v_current_stock IS NOT NULL THEN
                    IF recipe_row.unit = 'ml' THEN
                        v_deduction := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                    ELSE
                        v_deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                    END IF;

                    UPDATE public.inventory_items 
                       SET stock = stock - v_deduction, 
                           updated_at = NOW()
                     WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

                    -- Deduct from machine tanks atomically
                    UPDATE public.machine_tanks
                       SET current_volume_ml = GREATEST(0, current_volume_ml - v_deduction),
                           updated_at = NOW()
                     WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END IF;

    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Recreate update_order_with_stock with correct formula
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_old_store_id uuid;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
    v_base_vol numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_order_id := (order_update_data->>'order_id')::uuid;
    
    SELECT store_id INTO v_old_store_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restaurar Stock de items viejos
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p 
            LEFT JOIN public.product_types_config pt ON p.type::text = pt.code 
         WHERE p.id = v_item.product_id;

        SELECT COALESCE(base_volume, 4) 
          INTO v_base_vol
          FROM public.products
         WHERE id = v_item.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + v_item.qty, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, ii.unit 
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = v_item.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                FOR UPDATE;

                IF recipe_row.unit = 'ml' THEN
                    v_val := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.qty;
                ELSE
                    v_val := recipe_row.quantity_required * v_item.qty * COALESCE(v_item.size_multiplier, 1);
                END IF;

                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

                -- Restore machine tank volume
                UPDATE public.machine_tanks
                   SET current_volume_ml = LEAST(max_capacity_ml, current_volume_ml + v_val),
                       updated_at = NOW()
                 WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Actualizar cabecera (Status, total, etc.)
    UPDATE public.orders
    SET status = (order_update_data->>'status')::public.order_status,
        total = (order_update_data->>'total')::numeric,
        subtotal = (order_update_data->>'subtotal')::numeric,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Aplicar Nuevos items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(order_update_data->'items') AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p 
            LEFT JOIN public.product_types_config pt ON p.type::text = pt.code 
         WHERE p.id = v_item.product_id;

        SELECT COALESCE(base_volume, 4) 
          INTO v_base_vol
          FROM public.products
         WHERE id = v_item.product_id;

        -- Descontar Unidades
        UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Descontar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, ii.unit 
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = v_item.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                FOR UPDATE;

                IF recipe_row.unit = 'ml' THEN
                    v_val := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                ELSE
                    v_val := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                END IF;

                UPDATE public.inventory_items SET stock = stock - v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

                -- Deduct from machine tanks atomically
                UPDATE public.machine_tanks
                   SET current_volume_ml = GREATEST(0, current_volume_ml - v_val),
                       updated_at = NOW()
                 WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Recreate cancel_sale_with_stock_restore with correct formula
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id uuid;
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
    v_base_vol numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulaciÃ³n es obligatorio.';
    END IF;

    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p 
            LEFT JOIN public.product_types_config pt ON p.type::text = pt.code 
         WHERE p.id = item_row.product_id;

        SELECT COALESCE(base_volume, 4) 
          INTO v_base_vol
          FROM public.products
         WHERE id = item_row.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, ii.unit 
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = item_row.product_id
            LOOP
                SELECT stock INTO v_current_stock
                FROM public.inventory_items
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                FOR UPDATE;

                IF recipe_row.unit = 'ml' THEN
                    v_val := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.qty;
                ELSE
                    v_val := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                END IF;

                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

                -- Restore machine tank volume
                UPDATE public.machine_tanks
                   SET current_volume_ml = LEAST(max_capacity_ml, current_volume_ml + v_val),
                       updated_at = NOW()
                 WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled', cancellation_reason = p_reason, cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;
-- Add customization fields to products table for better parameterization and metrics.
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS margin_target NUMERIC DEFAULT 60.0,
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- Document comments for columns
COMMENT ON COLUMN products.margin_target IS 'Porcentaje de margen operativo esperado (meta de ganancia)';
COMMENT ON COLUMN products.commission_rate IS 'Porcentaje de comisiÃ³n de venta asignada a cajeros por este producto';
COMMENT ON COLUMN products.supplier_name IS 'Nombre del proveedor o distribuidor de este producto';
COMMENT ON COLUMN products.is_starred IS 'Destaca el producto en el catÃ¡logo POS y lo prioriza en el listado';
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
-- Migration: ParametrizaciÃ³n avanzada de maestros (Product Types y Sizes)

-- 1. AÃ±adir columnas a product_types_config
ALTER TABLE public.product_types_config
ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS alert_threshold integer NOT NULL DEFAULT 10;

-- 2. AÃ±adir columnas a sizes
ALTER TABLE public.sizes
ADD COLUMN IF NOT EXISTS capacity_value numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS capacity_unit text NOT NULL DEFAULT 'ml';

-- Actualizar comentario de tabla product_types_config para clarificar la estructura
COMMENT ON COLUMN public.product_types_config.tax_rate IS 'Tasa de impuesto aplicada por defecto (ej. 19.00 para 19%)';
COMMENT ON COLUMN public.product_types_config.alert_threshold IS 'Umbral de nivel crÃ­tico de inventario base para este tipo';

-- Actualizar comentario de tabla sizes
COMMENT ON COLUMN public.sizes.capacity_value IS 'Valor numÃ©rico de la capacidad (ej. 16, 24)';
COMMENT ON COLUMN public.sizes.capacity_unit IS 'Unidad de medida de la capacidad (ej. oz, ml)';
ALTER TABLE public.profiles
ADD COLUMN email text NULL;

-- Opcional: Si quieres que el email sea Ãºnico y no nulo despuÃ©s de la creaciÃ³n
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT profiles_email_key UNIQUE (email);
-- ALTER TABLE public.profiles
-- ALTER COLUMN email SET NOT NULL;
