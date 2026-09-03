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

-- 2. Open a recruitment round, if none is open -------------------------------
--    Without an open round, students cannot submit an application.
insert into public.recruitment_rounds (name, year, trimester, opens_at, closes_at, is_active)
select 'Trimester 1, 2027', 2027, 1, now(), now() + interval '42 days', true
where not exists (select 1 from public.recruitment_rounds where is_active);

-- 3. Confirm --------------------------------------------------------------
select 'Administrator' as item, email, role::text as detail
  from public.profiles where email = 'w.song@griffith.edu.au'
union all
select 'Open round', name, closes_at::date::text
  from public.recruitment_rounds where is_active
union all
select 'Courses loaded', count(*)::text, 'expected 187'
  from public.courses;
