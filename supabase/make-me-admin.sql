-- ============================================================================
-- Make w.song@griffith.edu.au the administrator. Run once, then sign in.
--
-- Works whether or not the newer migrations have been applied: the privilege
-- guard is switched off for the duration of the update and switched back on
-- afterwards. Safe to re-run.
-- ============================================================================

-- 1. Confirm the address, so sign-in works regardless of the "Confirm email"
--    setting under Authentication -> Providers -> Email.
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email = 'w.song@griffith.edu.au';

-- 2. Set the role.
--    The guard trigger refuses role changes when there is no authenticated
--    caller, which is the case here in the SQL Editor. Migration 0009 fixes
--    that; disabling it for this statement makes this file work either way.
alter table public.profiles disable trigger profiles_guard_self_update;

insert into public.profiles (id, email, full_name, role, position, is_active)
select u.id, u.email, 'Wei Song', 'admin', 'Super Administrator — School of ICT', true
  from auth.users u
 where u.email = 'w.song@griffith.edu.au'
on conflict (id) do update
   set role      = 'admin',
       position  = 'Super Administrator — School of ICT',
       is_active = true;

alter table public.profiles enable trigger profiles_guard_self_update;

-- 3. Confirm it worked. Expect role = admin, email_confirmed = true.
select p.email, p.full_name, p.role::text as role, p.is_active,
       (u.email_confirmed_at is not null) as email_confirmed
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.email = 'w.song@griffith.edu.au';
