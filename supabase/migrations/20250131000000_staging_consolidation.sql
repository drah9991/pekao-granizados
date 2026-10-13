-- ============================================
-- STAGING CONSOLIDATION MIGRATION
-- ============================================
-- Corrige inconsistencias en staging sin eliminar datos existentes
-- Tablas con datos: profiles (1), user_roles (1), stores (1), products (50), customers (3)

-- ============================================
-- 1. CREAR TABLAS FALTANTES
-- ============================================

-- 1.1 STORE_STOCK (completamente faltante)
create table if not exists public.store_stock (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  qty numeric default 0 check (qty >= 0),
  min_qty numeric default 0 check (min_qty >= 0),
  batch_info jsonb,
  updated_at timestamptz default now(),
  unique(store_id, product_id)
);

-- Enable RLS
alter table public.store_stock enable row level security;

-- Policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'store_stock' and policyname = 'Staff can view stock in their store') then
    create policy "Staff can view stock in their store"
      on public.store_stock for select
      to authenticated
      using (
        public.has_role(auth.uid(), 'admin') or
        store_id in (select store_id from public.profiles where id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'store_stock' and policyname = 'Admins and managers can manage stock') then
    create policy "Admins and managers can manage stock"
      on public.store_stock for all
      using (
        public.has_role(auth.uid(), 'admin') or
        public.has_role(auth.uid(), 'manager')
      );
  end if;
end $$;

-- Indexes
create index if not exists idx_store_stock_store_product on public.store_stock(store_id, product_id);

-- Trigger
drop trigger if exists update_stock_updated_at on public.store_stock;
create trigger update_stock_updated_at
  before update on public.store_stock
  for each row execute function public.update_updated_at_column();

-- 1.2 INVOICES (completamente faltante)
create sequence if not exists public.invoice_number_seq;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) unique not null,
  number bigint default nextval('invoice_number_seq') not null unique,
  pdf_path text,
  issued_at timestamptz default now(),
  total numeric not null check (total >= 0)
);

alter table public.invoices enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'invoices' and policyname = 'Staff can view invoices from their store') then
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
  end if;

  if not exists (select 1 from pg_policies where tablename = 'invoices' and policyname = 'Staff can create invoices') then
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
  end if;
end $$;

create index if not exists idx_invoices_number on public.invoices(number);

-- 1.3 MOVEMENTS (completamente faltante)
create table if not exists public.movements (
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

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'movements' and policyname = 'Staff can view movements from their store') then
    create policy "Staff can view movements from their store"
      on public.movements for select
      to authenticated
      using (
        public.has_role(auth.uid(), 'admin') or
        store_id in (select store_id from public.profiles where id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'movements' and policyname = 'Managers can create movements') then
    create policy "Managers can create movements"
      on public.movements for insert
      to authenticated
      with check (
        public.has_role(auth.uid(), 'admin') or
        public.has_role(auth.uid(), 'manager')
      );
  end if;
end $$;

create index if not exists idx_movements_store_product on public.movements(store_id, product_id);
create index if not exists idx_movements_created_at on public.movements(created_at desc);

-- ============================================
-- 2. CORREGIR TABLAS CON SCHEMA INCORRECTO
-- ============================================

-- 2.1 ORDERS - Recrear tabla (está vacía, schema incorrecto)
-- Primero eliminar dependencias
drop table if exists public.order_items cascade;
drop table if exists public.invoices cascade;
drop table if exists public.orders cascade;

-- Recrear orders con schema correcto
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

-- Orders policies
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

-- Indexes
create index idx_orders_store_status on public.orders(store_id, status);
create index idx_orders_created_at on public.orders(created_at desc);

-- Trigger
drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

-- 2.2 ORDER_ITEMS - Recrear tabla (estaba vacía, schema incorrecto)
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

-- Order items policies
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

create index idx_order_items_order_id on public.order_items(order_id);

-- 2.3 Recrear INVOICES después de orders
create sequence if not exists public.invoice_number_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) unique not null,
  number bigint default nextval('invoice_number_seq') not null unique,
  pdf_path text,
  issued_at timestamptz default now(),
  total numeric not null check (total >= 0)
);

alter table public.invoices enable row level security;

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

create index idx_invoices_number on public.invoices(number);

-- ============================================
-- 3. VERIFICAR FUNCIONES NECESARIAS
-- ============================================

-- Función update_updated_at_column (necesaria para triggers)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================
-- 4. NOTAS SOBRE COLUMNAS EXTRA
-- ============================================
-- PROFILES tiene columna 'email' extra (no en base migration)
--   → NO se elimina, no rompe funcionalidad, se preserva
--
-- PRODUCTS tiene columnas extra: category_id, supplier_id, product_type_id
--   → NO se eliminan, 50 productos existentes podrían usarlas
--   → Se preservan para compatibilidad con datos existentes
--
-- Estas columnas pueden removerse en una migración futura si no se usan

-- ============================================
-- MIGRACIÓN COMPLETADA
-- ============================================
-- Tablas creadas: store_stock, movements
-- Tablas recreadas: orders, order_items, invoices
-- Datos preservados: profiles (1), user_roles (1), stores (1), products (50), customers (3)
