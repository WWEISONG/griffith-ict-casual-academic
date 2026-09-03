-- ============================================================================
-- Migration 0012 — the directory is staff-only, and returns nothing otherwise
--
-- student_directory is security_invoker, so it inherited the profiles policies:
-- a signed-in student got exactly one row back, their own. Harmless, but it
-- disagreed with the application's own rule that students cannot read the
-- directory at all — and a rule enforced in one place and not the other is how
-- the last few defects got in.
--
-- The view now returns zero rows for anyone who is not staff.
-- ============================================================================

drop view if exists public.student_directory;

create view public.student_directory
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.student_number,
  p.program,
  p.degree_level,
  p.campus,
  p.created_at                                                as registered_at,

  (select count(*) from public.tutoring_experience te
    where te.profile_id = p.id)                               as times_tutored,

  (select count(distinct te.course_code) from public.tutoring_experience te
    where te.profile_id = p.id and te.course_code is not null) as courses_tutored,

  (select max(te.year) from public.tutoring_experience te
    where te.profile_id = p.id)                               as last_taught_year,

  coalesce((select array_agg(distinct te.course_code order by te.course_code)
    from public.tutoring_experience te
    where te.profile_id = p.id and te.course_code is not null), '{}')  as tutored_courses,

  coalesce((select array_agg(distinct ap.course_code order by ap.course_code)
    from public.application_preferences ap
    join public.applications a on a.id = ap.application_id
    where a.applicant_id = p.id and a.status <> 'draft'), '{}')        as applied_courses,

  (select a.id from public.applications a
    where a.applicant_id = p.id and a.status <> 'draft'
    limit 1)                                                  as application_id,

  (select a.submitted_at from public.applications a
    where a.applicant_id = p.id and a.status <> 'draft'
    limit 1)                                                  as applied_at,

  (select a.updated_at from public.applications a
    where a.applicant_id = p.id and a.status <> 'draft'
    limit 1)                                                  as application_updated_at,

  coalesce((select sum(asg.hours_per_week) from public.assignments asg
    where asg.profile_id = p.id and asg.status = 'confirmed'), 0) as current_load_hours

from public.profiles p
-- Staff only. Without this a student saw their own row here, which contradicted
-- the rule the application enforces.
where public.is_staff()
  and p.role = 'student'
  and p.is_active;

comment on view public.student_directory is
  'Every registered candidate, with teaching history and whether an application '
  'is on file. Returns nothing to anyone who is not staff.';
