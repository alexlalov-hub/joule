-- Joule — fix recursive profile-read policy.
--
-- The original "profile read self" policy from the init migration tried to
-- let admins see every profile by inlining an EXISTS subquery against the
-- same profiles table:
--
--   using (auth.uid() = id
--          or exists (select 1 from public.profiles p
--                     where p.id = auth.uid() and p.role = 'admin'));
--
-- Postgres refuses that with error 42P17 ("infinite recursion detected in
-- policy for relation profiles"): the inner SELECT is itself subject to
-- this very policy, which loops back to the inner SELECT, and so on. The
-- net effect was that ANY read of profiles by an authenticated user died
-- with that error — including the isAdmin() helper added in Week 5, which
-- meant nobody could pass the /admin route guard.
--
-- The fix is to call the public.is_admin() function added in
-- 20260519120000_admin_rls_policies.sql. That function is SECURITY DEFINER
-- with a fixed search_path, so its inner SELECT runs with the owner's
-- privileges and bypasses RLS for the duration of the call. No recursion.
--
-- Behaviour matches the original intent: a user can read their own profile;
-- admins can read every profile.

drop policy if exists "profile read self" on public.profiles;

create policy "profile read self" on public.profiles
    for select
    using (auth.uid() = id or public.is_admin());
