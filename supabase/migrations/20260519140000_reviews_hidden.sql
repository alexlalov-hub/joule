-- Joule — soft-hide column for reviews + tightened read policy.
--
-- Moderation needs two actions: hide (reversible, audit-friendly) and
-- delete (rare, destructive). Hide is implemented as a single nullable
-- timestamp column on the existing reviews table — null means visible,
-- non-null means hidden as of that time.
--
-- The read policy is the load-bearing change. Without tightening it,
-- customers would still see hidden reviews because "reviews readable"
-- was `using (true)`. The new policy says: a non-admin can read a row
-- only if it's not hidden; admins can read everything. This means the
-- customer-facing reviews query needs no code changes — RLS does the
-- filtering. Adding `hidden_at is null` to every read query in code
-- would be too easy to forget on the next feature.
--
-- A partial index on hidden_at keeps the admin "hidden only" filter
-- fast even when the review table grows.

alter table public.reviews
    add column hidden_at timestamptz;

create index if not exists reviews_hidden_idx
    on public.reviews (hidden_at)
    where hidden_at is not null;

-- Replace the open read policy with one that filters hidden rows for
-- non-admins. The "or public.is_admin()" branch relies on the
-- security-definer is_admin function added in 20260519120000.

drop policy if exists "reviews readable" on public.reviews;

create policy "reviews readable" on public.reviews
    for select
    using (hidden_at is null or public.is_admin());
