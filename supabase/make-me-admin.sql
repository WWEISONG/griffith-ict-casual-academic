-- ============================================================================
-- Make w.song@griffith.edu.au the administrator. Run once, then sign in.
--
-- The account already exists; this only confirms the address and sets the role.
-- Safe to re-run.
-- ============================================================================

-- 1. Confirm the address, so sign-in works regardless of the "Confirm email"
--    setting in Authentication -> Providers -> Email.
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email = 'w.song@griffith.edu.au';

-- 2. Make the profile an administrator, creating it if the signup trigger
--    has not yet run.
insert into public.profiles (id, email, full_name, role, position, is_active)
select u.id, u.email, 'Wei Song', 'admin', 'Super Administrator — School of ICT', true
  from auth.users u
 where u.email = 'w.song@griffith.edu.au'
on conflict (id) do update
   set role      = 'admin',
       full_name = 'Wei Song',
       position  = 'Super Administrator — School of ICT',
       is_active = true;

-- 3. Confirm it worked.
select p.email, p.full_name, p.role::text as role, p.is_active,
       (u.email_confirmed_at is not null) as email_confirmed
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.email = 'w.song@griffith.edu.au';
