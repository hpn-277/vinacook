-- Bootstraps the first admin on a fresh production database (seed.sql never runs there).
--
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user -> Create new user:
--    the admin's email and a strong password, "Auto Confirm User" ticked.
-- 2. Edit the three values below, then run this file in the Dashboard SQL Editor.
-- 3. Log in at /login. Add every other staff member from /admin/staff.
--
-- Safe to re-run: an existing staff row for the same login is updated, not duplicated.
do $$
declare
  v_email text := 'admin@example.com'; -- the email from step 1
  v_name  text := 'Quản trị';
  v_phone text := null;                  -- e.g. '0900000000'
  v_user  uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then
    raise exception 'No auth user with email %; create it in Authentication -> Users first', v_email;
  end if;

  insert into staff (auth_user_id, role, name, phone)
  values (v_user, 'admin', v_name, v_phone)
  on conflict (auth_user_id) do update set role = 'admin', name = excluded.name, phone = excluded.phone, active = true,
    ref_code = null, commission_pct = null, factory_id = null;

  raise notice 'Admin ready: % (%)', v_name, v_email;
end $$;
