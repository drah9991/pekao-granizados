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
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
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