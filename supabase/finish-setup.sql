-- ============================================================================
-- Finish setup: fix submission, and activate the sample accounts.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. FIX: applicants could not submit at all.
--
-- The status guard refused any status change by a non-staff user, but
-- submitting IS a status change (draft -> submitted), so every application
-- silently stayed a draft — and drafts are invisible to staff.
--
-- An applicant may now do exactly two things to their own application: submit
-- a draft, and withdraw. Review remains staff-only.
-- ---------------------------------------------------------------------------
create or replace function public.guard_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_staff() then
    return new;
  end if;
  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'submitted')
      or new.status = 'withdrawn'
    ) then
      raise exception 'Your application status is set by the School, not by you.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists applications_guard_status on public.applications;
create trigger applications_guard_status before update on public.applications
  for each row execute function public.guard_application_status();

-- ---------------------------------------------------------------------------
-- 2. Confirm the sample accounts so they can sign in.
-- ---------------------------------------------------------------------------
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email like 'sample.%';

-- ---------------------------------------------------------------------------
-- 3. Make the sample convenor a staff account.
-- ---------------------------------------------------------------------------
alter table public.profiles disable trigger profiles_guard_self_update;

update public.profiles
   set role           = 'lecturer',
       position       = 'Course Convenor',
       student_number = null
 where email = 'sample.convenor@griffith.edu.au';

alter table public.profiles enable trigger profiles_guard_self_update;

-- Courses they convene. Only a personal filter — they see all applicants.
insert into public.course_lecturers (course_code, lecturer_id, is_convenor)
select c, p.id, true
  from public.profiles p,
       unnest(array['1811ICT', '1001ICT', '2801ICT', '2814ICT', '7905ICT']) c
 where p.email = 'sample.convenor@griffith.edu.au'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Submit the five sample applications, which the bug above left as drafts.
-- ---------------------------------------------------------------------------
update public.applications a
   set status       = 'submitted',
       submitted_at = coalesce(a.submitted_at, now())
  from public.profiles p
 where p.id = a.applicant_id
   and p.email like 'sample.%'
   and a.status = 'draft';

-- ---------------------------------------------------------------------------
-- 5. Confirm. Expect 5 submitted applications and one lecturer.
-- ---------------------------------------------------------------------------
select 'Submitted applications' as item, count(*)::text as value
  from public.applications where status = 'submitted'
union all
select 'Sample convenor role',
       coalesce(max(role::text), 'MISSING')
  from public.profiles where email = 'sample.convenor@griffith.edu.au'
union all
select 'Administrator role',
       coalesce(max(role::text), 'MISSING')
  from public.profiles where email = 'w.song@griffith.edu.au'
union all
select 'Courses in catalogue', count(*)::text from public.courses;
