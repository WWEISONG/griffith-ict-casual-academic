-- ============================================================================
-- Migration 0007 — the School's super administrator
--
-- WHY
-- Setting up the owner account by hand after every rebuild is tedious and easy
-- to get wrong. This makes it a property of the schema: one nominated address
-- is always the administrator, however the account came to exist.
--
-- No password appears here. The account is created through ordinary signup,
-- exactly like any other; this migration only decides its role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The School's super administrator.
--
-- Change this address to hand the system over to someone else; the rules below
-- follow it automatically.
-- ---------------------------------------------------------------------------
create or replace function public.super_admin_email()
returns citext language sql immutable as $$
  select 'w.song@griffith.edu.au'::citext
$$;

-- ---------------------------------------------------------------------------
-- 1. Promote the account if it already exists.
-- ---------------------------------------------------------------------------
update public.profiles
   set role      = 'admin',
       position  = coalesce(nullif(btrim(position), ''), 'Super Administrator — School of ICT'),
       full_name = case when btrim(full_name) in ('', 'w.song') then 'Wei Song' else full_name end,
       is_active = true
 where email = public.super_admin_email();

-- ---------------------------------------------------------------------------
-- 2. Confirm the address, so sign-in works whether or not email confirmation
--    is switched on in the project's auth settings.
-- ---------------------------------------------------------------------------
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email = public.super_admin_email()::text;

-- ---------------------------------------------------------------------------
-- 3. Make it stick: whenever this address signs up, it is an administrator.
--
-- Every other self-registration remains a student. The role is still never
-- read from client-supplied metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_role   user_role;
begin
  v_domain := lower(split_part(new.email, '@', 2));

  if v_domain not in ('griffith.edu.au', 'griffithuni.edu.au') then
    raise exception 'Registration is restricted to Griffith University accounts (@griffith.edu.au or @griffithuni.edu.au).'
      using errcode = 'check_violation';
  end if;

  -- The nominated owner is an administrator; everyone else is a student until
  -- an administrator says otherwise.
  v_role := case
    when new.email::citext = public.super_admin_email() then 'admin'
    else 'student'
  end::user_role;

  insert into public.profiles (
    id, email, full_name, role, student_number, program, campus, degree_level, position
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    v_role,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'student_number', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'program', '')), ''),
    (nullif(btrim(coalesce(new.raw_user_meta_data ->> 'campus', '')), ''))::campus,
    (nullif(btrim(coalesce(new.raw_user_meta_data ->> 'degree_level', '')), ''))::degree_level,
    case when v_role = 'admin' then 'Super Administrator — School of ICT' end
  )
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. The administrator account cannot be demoted or disabled by accident.
-- ---------------------------------------------------------------------------
create or replace function public.protect_super_admin()
returns trigger language plpgsql as $$
begin
  if old.email = public.super_admin_email() then
    if new.role <> 'admin' then
      raise exception 'The School super administrator cannot be demoted.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.is_active is not true then
      raise exception 'The School super administrator cannot be deactivated.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_super_admin on public.profiles;
create trigger profiles_protect_super_admin before update on public.profiles
  for each row execute function public.protect_super_admin();

-- ---------------------------------------------------------------------------
-- Confirm
-- ---------------------------------------------------------------------------
select p.email, p.full_name, p.role::text, p.is_active,
       (u.email_confirmed_at is not null) as email_confirmed
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.email = public.super_admin_email();
