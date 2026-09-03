-- ============================================================================
-- Promote the super administrator, and open the first recruitment round.
--
-- Run this in the Supabase SQL Editor AFTER registering through the app with
-- the address below. Registration always creates a student account; this
-- elevates it.
--
-- Doing it here means the service_role key never has to leave Supabase.
-- ============================================================================

-- 1. Elevate the account -----------------------------------------------------
update public.profiles
   set role       = 'admin',
       position   = 'Super Administrator — School of ICT',
       is_active  = true
 where email = 'w.song@griffith.edu.au';

-- 2. Confirm --------------------------------------------------------------
--    Applications are always open, so there is no round to create.
select 'Administrator' as item, email, role::text as detail
  from public.profiles where email = 'w.song@griffith.edu.au'
union all
select 'Courses loaded', count(*)::text, 'expected 187'
  from public.courses;
