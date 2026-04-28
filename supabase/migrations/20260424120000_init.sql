-- Joule — initial schema
-- Week 1: catalog + reviews + cart + orders skeleton + auth profiles.
-- Extensions, embeddings, and full-text search slots are reserved here so later
-- migrations can fill them without rewriting tables.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------- catalog ----------

create table public.categories (
    id          uuid primary key default gen_random_uuid(),
    slug        text unique not null,
    name        text not null,
    blurb       text,
    sort_order  int not null default 0,
    created_at  timestamptz not null default now()
);

create table public.products (
    id            uuid primary key default gen_random_uuid(),
    slug          text unique not null,
    name          text not null,
    brand         text not null,
    category_id   uuid not null references public.categories(id) on delete restrict,
    price_cents   int not null check (price_cents >= 0),
    currency      text not null default 'EUR',
    tagline       text not null default '',
    description   text not null default '',
    specs         jsonb not null default '[]'::jsonb,
    stock_qty     int not null default 0,
    featured      bool not null default false,
    search_tsv    tsvector,
    embedding     vector(1536),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index products_category_idx on public.products(category_id);
create index products_featured_idx on public.products(featured) where featured is true;
create index products_search_idx on public.products using gin(search_tsv);
create index products_embedding_idx on public.products using hnsw (embedding vector_cosine_ops);

create table public.product_images (
    id          uuid primary key default gen_random_uuid(),
    product_id  uuid not null references public.products(id) on delete cascade,
    url         text not null,
    alt         text not null default '',
    sort_order  int not null default 0
);
create index product_images_product_idx on public.product_images(product_id);

-- ---------- users / profiles ----------

create table public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    full_name   text,
    avatar_url  text,
    role        text not null default 'customer' check (role in ('customer', 'admin')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles(id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------- reviews ----------

create table public.reviews (
    id           uuid primary key default gen_random_uuid(),
    product_id   uuid not null references public.products(id) on delete cascade,
    user_id      uuid references auth.users(id) on delete set null,
    rating       int not null check (rating between 1 and 5),
    aspect       text,
    title        text not null default '',
    body         text not null default '',
    created_at   timestamptz not null default now()
);
create index reviews_product_idx on public.reviews(product_id);

-- ---------- cart ----------

create table public.carts (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid unique references auth.users(id) on delete cascade,
    anon_key    text unique,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    check (user_id is not null or anon_key is not null)
);

create table public.cart_items (
    id          uuid primary key default gen_random_uuid(),
    cart_id     uuid not null references public.carts(id) on delete cascade,
    product_id  uuid not null references public.products(id) on delete cascade,
    quantity    int not null default 1 check (quantity > 0),
    added_at    timestamptz not null default now(),
    unique (cart_id, product_id)
);

-- ---------- orders ----------

create table public.orders (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid references auth.users(id) on delete set null,
    email          text not null,
    status         text not null default 'pending'
                    check (status in ('pending', 'paid', 'fulfilling', 'shipped', 'completed', 'cancelled', 'refunded')),
    subtotal_cents int not null default 0,
    total_cents    int not null default 0,
    currency       text not null default 'EUR',
    stripe_session text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id);

create table public.order_items (
    id             uuid primary key default gen_random_uuid(),
    order_id       uuid not null references public.orders(id) on delete cascade,
    product_id     uuid references public.products(id) on delete set null,
    product_slug   text not null,
    product_name   text not null,
    unit_price_cents int not null,
    quantity       int not null
);

-- ---------- wishlists ----------

create table public.wishlists (
    user_id     uuid not null references auth.users(id) on delete cascade,
    product_id  uuid not null references public.products(id) on delete cascade,
    added_at    timestamptz not null default now(),
    primary key (user_id, product_id)
);

-- ---------- search tsv triggers ----------

create or replace function public.products_search_tsv_trigger()
returns trigger
language plpgsql
as $$
begin
    new.search_tsv :=
        setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(new.brand, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(new.tagline, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(new.description, '')), 'D');
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists products_tsv_trg on public.products;
create trigger products_tsv_trg
before insert or update on public.products
for each row execute procedure public.products_search_tsv_trigger();

-- ---------- row level security ----------

alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;
alter table public.profiles       enable row level security;
alter table public.reviews        enable row level security;
alter table public.carts          enable row level security;
alter table public.cart_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.wishlists      enable row level security;

-- Catalog is world-readable.
create policy "categories readable" on public.categories for select using (true);
create policy "products readable"    on public.products    for select using (true);
create policy "product_images readable" on public.product_images for select using (true);

-- Reviews: anyone can read; authenticated users can create their own.
create policy "reviews readable" on public.reviews for select using (true);
create policy "reviews insert own" on public.reviews for insert
    with check (auth.uid() = user_id);
create policy "reviews update own" on public.reviews for update
    using (auth.uid() = user_id);

-- Profiles: users can read and update their own, admins can read all.
create policy "profile read self" on public.profiles for select
    using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "profile update self" on public.profiles for update
    using (auth.uid() = id);

-- Carts: owners only (user_id match) — anon carts handled server-side by service role.
create policy "cart owner read" on public.carts for select using (auth.uid() = user_id);
create policy "cart owner write" on public.carts for all using (auth.uid() = user_id);
create policy "cart items via cart" on public.cart_items for all
    using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- Orders: owner reads own; inserts happen server-side.
create policy "order owner read" on public.orders for select using (auth.uid() = user_id);
create policy "order items via order" on public.order_items for select
    using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Wishlists: owner only.
create policy "wishlist owner" on public.wishlists for all using (auth.uid() = user_id);
