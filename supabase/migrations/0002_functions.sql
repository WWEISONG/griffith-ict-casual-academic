-- ============================================================================
-- Migration 0002 — triggers, helper functions, derived views
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

drop trigger if exists assignments_touch on public.assignments;
create trigger assignments_touch before update on public.assignments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Provision a profile whenever a user signs up.
--
-- Role is derived from the email domain and cannot be chosen by the client:
--   @griffith.edu.au    -> lecturer (staff)
--   @griffithuni.edu.au -> student
-- Elevation to 'admin' is only ever done by an existing admin.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role          user_role;
  v_student_no    text;
  v_domain        text;
begin
  v_domain := lower(split_part(new.email, '@', 2));

  if v_domain not in ('griffith.edu.au', 'griffithuni.edu.au') then
    raise exception 'Registration is restricted to Griffith University accounts (@griffith.edu.au or @griffithuni.edu.au).'
      using errcode = 'check_violation';
  end if;

  v_role := case when v_domain = 'griffith.edu.au' then 'lecturer' else 'student' end::user_role;

  v_student_no := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'student_number', '')), '');
  if v_role <> 'student' then
    v_student_no := null;
  end if;

  insert into public.profiles (
    id, email, full_name, role, student_number, program, campus, degree_level
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    v_role,
    v_student_no,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'program', '')), ''),
    (nullif(btrim(coalesce(new.raw_user_meta_data ->> 'campus', '')), ''))::campus,
    (nullif(btrim(coalesce(new.raw_user_meta_data ->> 'degree_level', '')), ''))::degree_level
  )
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Authorisation helpers.
--
-- All are SECURITY DEFINER and read profiles directly, so they do not recurse
-- through the RLS policies that call them.
-- ---------------------------------------------------------------------------
create or replace function public.current_role_of()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('lecturer', 'admin') and is_active
  )
$$;

/** True when the current user convenes/teaches the given course. Admins: always. */
create or replace function public.teaches_course(p_course_code text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.course_lecturers cl
    where cl.lecturer_id = auth.uid() and cl.course_code = p_course_code
  )
$$;

/**
 * True when the current user may view the given application: they are an admin,
 * they own it, or it nominates a course they teach.
 */
create or replace function public.can_view_application(p_application_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.id = p_application_id and a.applicant_id = auth.uid()
    )
    or exists (
      select 1
      from public.application_preferences ap
      join public.course_lecturers cl on cl.course_code = ap.course_code
      join public.applications a on a.id = ap.application_id
      where ap.application_id = p_application_id
        and cl.lecturer_id = auth.uid()
        -- Drafts are never visible to staff.
        and a.status <> 'draft'
    )
$$;

-- ---------------------------------------------------------------------------
-- Submit an application.
--
-- Kept server-side so the validity rules (a real statement, at least one course
-- preference, the round still open) cannot be bypassed by the client.
-- ---------------------------------------------------------------------------
create or replace function public.submit_application(p_application_id uuid)
returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  v_app   public.applications;
  v_round public.recruitment_rounds;
  v_prefs int;
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'Application not found.' using errcode = 'no_data_found';
  end if;

  if v_app.applicant_id <> auth.uid() and not public.is_admin() then
    raise exception 'You may only submit your own application.' using errcode = 'insufficient_privilege';
  end if;

  if v_app.status <> 'draft' then
    raise exception 'This application has already been submitted.' using errcode = 'check_violation';
  end if;

  select * into v_round from public.recruitment_rounds where id = v_app.round_id;
  if not v_round.is_active or now() > v_round.closes_at then
    raise exception 'Applications for % have closed.', v_round.name using errcode = 'check_violation';
  end if;

  select count(*) into v_prefs from public.application_preferences where application_id = p_application_id;
  if v_prefs < 1 then
    raise exception 'Nominate at least one course before submitting.' using errcode = 'check_violation';
  end if;

  if length(btrim(v_app.statement)) < 100 then
    raise exception 'Your supporting statement must be at least 100 characters.' using errcode = 'check_violation';
  end if;

  update public.applications
     set status = 'submitted', submitted_at = now()
   where id = p_application_id
  returning * into v_app;

  insert into public.audit_log (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'application.submitted', 'application', p_application_id::text,
          jsonb_build_object('round', v_round.name, 'preferences', v_prefs));

  return v_app;
end $$;

-- ---------------------------------------------------------------------------
-- Applicant review view.
--
-- One row per (application, nominated course). Staff see the rows for courses
-- they teach; admins see all. Underlying RLS still applies to the base tables.
-- ---------------------------------------------------------------------------
-- Dropped first, not replaced: "create or replace view" cannot change a view's
-- column list, so a later migration that adds a column would make this fail on
-- a re-run.
drop view if exists public.applicant_rows;

create view public.applicant_rows
with (security_invoker = true)
as
select
  a.id                          as application_id,
  a.applicant_id,
  a.round_id,
  a.status,
  a.submitted_at,
  a.hours_per_week,
  p.full_name,
  p.email,
  p.student_number,
  p.program,
  p.degree_level,
  p.gpa,
  p.campus,
  ap.course_code                as matched_course_code,
  ap.rank                       as matched_rank,
  ap.confidence                 as matched_confidence,
  (select count(*) from public.tutoring_experience te
     where te.profile_id = a.applicant_id and te.course_code = ap.course_code)  as prior_times_taught,
  (select count(*) from public.tutoring_experience te
     where te.profile_id = a.applicant_id)                                      as total_prior_engagements,
  coalesce((select sum(asg.hours_per_week) from public.assignments asg
     where asg.profile_id = a.applicant_id and asg.status = 'confirmed'), 0)    as current_load_hours
from public.applications a
join public.profiles p               on p.id = a.applicant_id
join public.application_preferences ap on ap.application_id = a.id
where a.status <> 'draft';

-- ---------------------------------------------------------------------------
-- Course demand summary, for the recruitment dashboard.
-- ---------------------------------------------------------------------------
drop view if exists public.course_demand;

create view public.course_demand
with (security_invoker = true)
as
select
  c.code            as course_code,
  c.title,
  a.round_id,
  count(ap.id)                                     as applicants,
  count(ap.id) filter (where ap.rank = 1)          as first_preference
from public.courses c
left join public.application_preferences ap on ap.course_code = c.code
left join public.applications a on a.id = ap.application_id and a.status <> 'draft'
group by c.code, c.title, a.round_id;
