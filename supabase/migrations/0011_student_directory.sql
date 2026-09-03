-- ============================================================================
-- Migration 0011 — staff see every registered student
--
-- WHY
-- Staff could only see students who had submitted an application. But the
-- School wants a directory of everyone who has registered: someone who
-- registered and recorded three trimesters of tutoring but has not filled in
-- an application this round is exactly the person a convenor wants to find.
--
-- This also drops the review pipeline from the interface. The system informs
-- convenors; it does not run an approval workflow. The status column stays in
-- the database (it still separates a draft from a submitted application) but
-- nothing beyond 'submitted' and 'withdrawn' is used by the interface.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Staff may read every profile, not only those attached to an application.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Staff may read anyone's teaching history — that is the point of the
-- directory: who has tutored what, whether or not they applied this time.
-- ---------------------------------------------------------------------------
drop policy if exists experience_select_staff on public.tutoring_experience;
create policy experience_select_staff on public.tutoring_experience
  for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- The tutor directory.
--
-- The problem this solves: a convenor staffing a course does not know who is
-- available to teach it. So the row carries both course lists — what this
-- person has already tutored, and what they have asked to tutor — which makes
-- "who can take 2801ICT?" a single lookup rather than a hunt.
-- ---------------------------------------------------------------------------
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

  -- Courses they have actually taught.
  coalesce((select array_agg(distinct te.course_code order by te.course_code)
    from public.tutoring_experience te
    where te.profile_id = p.id and te.course_code is not null), '{}')  as tutored_courses,

  -- Courses they have asked to teach.
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
where p.role = 'student' and p.is_active;

comment on view public.student_directory is
  'Every registered student, with teaching history and whether an application '
  'is on file. Staff-facing reference; the underlying policies still apply.';
