-- FIX: user_management RLS recursion (42P17)
-- Run this in Supabase SQL Editor.
-- It removes self-referential policies/functions on user_management and
-- replaces them with a safe policy model using profiles.role.

begin;

-- Ensure RLS is enabled on the table.
alter table public.user_management enable row level security;
alter table public.user_management no force row level security;

-- Remove potentially recursive helper functions (if present).
drop function if exists public.is_current_user_admin();
drop function if exists public.is_current_user_admin_or_manager();

-- Drop old policies that may call back into user_management.
drop policy if exists "Users can view own user_management record" on public.user_management;
drop policy if exists "Users can view own record" on public.user_management;
drop policy if exists "Admins and managers can view all user_management records" on public.user_management;
drop policy if exists "Admins and managers can view all" on public.user_management;
drop policy if exists "Admins can insert user_management records" on public.user_management;
drop policy if exists "Admins can insert" on public.user_management;
drop policy if exists "Admins can update user_management records" on public.user_management;
drop policy if exists "Admins can update" on public.user_management;
drop policy if exists "Admins can delete user_management records" on public.user_management;
drop policy if exists "Admins can delete" on public.user_management;
drop policy if exists "Users can insert own user_management record" on public.user_management;
drop policy if exists "Users can update own user_management record" on public.user_management;
drop policy if exists "Users can update own record" on public.user_management;

-- Read own row.
create policy "um_select_own"
on public.user_management
for select
to authenticated
using (user_id = auth.uid());

-- Admin/manager can read all rows (via profiles table; avoids recursion).
create policy "um_select_admin_manager"
on public.user_management
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'manager')
  )
);

-- Admin can insert/update/delete.
create policy "um_insert_admin"
on public.user_management
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "um_update_admin"
on public.user_management
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "um_delete_admin"
on public.user_management
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- User can update only own row for basic self-maintenance.
create policy "um_update_own"
on public.user_management
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;

notify pgrst, 'reload schema';

-- Verification
-- 1) Ensure no recursive function remains:
-- select n.nspname, p.proname
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('is_current_user_admin', 'is_current_user_admin_or_manager');
--
-- 2) Ensure policies are present:
-- select policyname, permissive, cmd
-- from pg_policies
-- where schemaname = 'public' and tablename = 'user_management'
-- order by policyname;
