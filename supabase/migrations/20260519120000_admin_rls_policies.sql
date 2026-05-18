-- Joule — admin RLS policies
--
-- Lets the admin role write to tables that customers can only read. Before
-- this migration the only write paths for products and reviews were the
-- service-role client (via getSupabaseAdmin), which bypasses RLS entirely.
-- That works for system jobs (Stripe webhooks, seed scripts) but not for an
-- in-app admin UI where the request runs under the user's auth cookie.
--
-- A small helper function checks the caller's profile role once. Policies
-- below reference it so the admin set can grow later without changing
-- every policy individually.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
    );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------- products ----------
-- Catalog reads stay open ("products readable"). Admins can update
-- and insert; customers cannot.

create policy "products admin update" on public.products
    for update
    using (public.is_admin())
    with check (public.is_admin());

create policy "products admin insert" on public.products
    for insert
    with check (public.is_admin());

-- ---------- reviews ----------
-- Reviews are user-writable for their own rows ("reviews insert own" /
-- "reviews update own" already exist). The moderation use case is admin
-- update or delete of any review.

create policy "reviews admin update" on public.reviews
    for update
    using (public.is_admin())
    with check (public.is_admin());

create policy "reviews admin delete" on public.reviews
    for delete
    using (public.is_admin());

-- ---------- profiles ----------
-- The existing "profile read self" policy already lets admins see every
-- profile via the embedded "or exists ... admin" check, so no new policy
-- is needed for reads. Admin-promote/demote of other users is an admin
-- write; allow it.

create policy "profiles admin update" on public.profiles
    for update
    using (public.is_admin())
    with check (public.is_admin());
