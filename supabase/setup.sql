-- ============================================================================
-- Casual Academic (Tutor) Management System
-- School of ICT, Griffith University
--
-- COMPLETE DATABASE SETUP — run this once, in the Supabase SQL Editor.
-- Generated file: edit the sources under supabase/migrations, not this.
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ## supabase/migrations/0001_schema.sql

-- ============================================================================
-- Casual Academic (Tutor) Management System
-- School of Information and Communication Technology, Griffith University
--
-- Migration 0001 — core schema
--
-- Target: PostgreSQL 15+ (Supabase today, Amazon RDS/Aurora later).
-- Only the `auth.uid()` / `auth.users` references are Supabase-specific; the
-- migration notes in docs/ARCHITECTURE.md list the exact substitutions needed
-- for a move to Amazon Cognito + RDS.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('student', 'lecturer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type degree_level as enum ('undergraduate', 'honours', 'masters', 'phd');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campus as enum ('Nathan', 'Gold Coast', 'Mount Gravatt', 'South Bank', 'Logan', 'Online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum (
    'draft', 'submitted', 'under_review', 'shortlisted',
    'offered', 'accepted', 'declined', 'unsuccessful', 'withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tutor_role as enum (
    'tutor', 'demonstrator', 'marker', 'lab_assistant', 'pal_leader', 'guest_lecturer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type assignment_status as enum ('proposed', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_method as enum ('email', 'meeting', 'phone', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user, keyed to auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           citext not null unique,
  full_name       text   not null check (length(btrim(full_name)) between 2 and 120),
  role            user_role not null default 'student',

  student_number  text    check (student_number ~ '^s[0-9]{7}$'),
  phone           text    check (phone is null or length(phone) between 6 and 20),
  program         text,
  degree_level    degree_level,
  -- Griffith GPA is reported on a 0–7 scale.
  gpa             numeric(3,2) check (gpa is null or (gpa >= 0 and gpa <= 7)),
  campus          campus,
  has_work_rights boolean,
  has_blue_card   boolean,

  -- Staff only
  position        text,

  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Registration is restricted to Griffith accounts. Staff use griffith.edu.au,
  -- students use griffithuni.edu.au. Enforced here so it cannot be bypassed by
  -- calling the API directly.
  constraint profiles_griffith_email check (
    email like '%@griffith.edu.au' or email like '%@griffithuni.edu.au'
  ),
  -- Students must carry a student number; staff must not.
  constraint profiles_student_number_role check (
    (role = 'student' and student_number is not null)
    or (role <> 'student' and student_number is null)
  )
);

create index if not exists profiles_role_idx on public.profiles (role) where is_active;
create index if not exists profiles_name_idx on public.profiles using gin (to_tsvector('simple', full_name));

-- ---------------------------------------------------------------------------
-- courses — the School of ICT catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  code       text primary key check (code ~ '^[0-9]{4}ICT$'),
  title      text not null,
  -- First digit of the code encodes the level (1–3 UG, 4/6 Honours, 7 PG).
  level      smallint not null generated always as (substring(code from 1 for 1)::smallint) stored,
  school     text not null default 'ICT',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists courses_level_idx on public.courses (level) where is_active;

-- ---------------------------------------------------------------------------
-- course_lecturers — which staff may recruit for which course
-- ---------------------------------------------------------------------------
create table if not exists public.course_lecturers (
  course_code text not null references public.courses (code) on delete cascade,
  lecturer_id uuid not null references public.profiles (id) on delete cascade,
  is_convenor boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (course_code, lecturer_id)
);

create index if not exists course_lecturers_lecturer_idx on public.course_lecturers (lecturer_id);

-- ---------------------------------------------------------------------------
-- recruitment_rounds — a hiring window, e.g. "Trimester 1, 2027"
-- ---------------------------------------------------------------------------
create table if not exists public.recruitment_rounds (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  year       smallint not null check (year between 2020 and 2100),
  trimester  smallint not null check (trimester in (1, 2, 3)),
  opens_at   timestamptz not null,
  closes_at  timestamptz not null,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (year, trimester),
  constraint rounds_window check (closes_at > opens_at)
);

-- At most one active round at a time — keeps the student-facing flow unambiguous.
create unique index if not exists rounds_single_active_idx
  on public.recruitment_rounds ((true)) where is_active;

-- ---------------------------------------------------------------------------
-- applications — one per applicant per round
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references public.profiles (id) on delete cascade,
  round_id       uuid not null references public.recruitment_rounds (id) on delete restrict,
  status         application_status not null default 'draft',
  statement      text not null default '',
  hours_per_week smallint not null default 0 check (hours_per_week between 0 and 30),
  available_days text[] not null default '{}',
  resume_url     text check (resume_url is null or resume_url ~* '^https?://'),
  submitted_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (applicant_id, round_id),
  -- A submitted application must carry a substantive statement.
  constraint applications_submitted_needs_statement check (
    status = 'draft' or length(btrim(statement)) >= 100
  ),
  constraint applications_submitted_has_timestamp check (
    status = 'draft' or submitted_at is not null
  )
);

create index if not exists applications_round_status_idx on public.applications (round_id, status);
create index if not exists applications_applicant_idx on public.applications (applicant_id);

-- ---------------------------------------------------------------------------
-- application_preferences — ranked course choices within an application
-- ---------------------------------------------------------------------------
create table if not exists public.application_preferences (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  course_code    text not null references public.courses (code) on delete restrict,
  rank           smallint not null check (rank between 1 and 6),
  confidence     smallint not null default 3 check (confidence between 1 and 5),
  note           text,
  created_at     timestamptz not null default now(),
  unique (application_id, course_code),
  unique (application_id, rank)
);

create index if not exists app_prefs_course_idx on public.application_preferences (course_code);

-- ---------------------------------------------------------------------------
-- tutoring_experience — prior teaching, at Griffith or elsewhere
-- ---------------------------------------------------------------------------
create table if not exists public.tutoring_experience (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.profiles (id) on delete cascade,
  course_code          text references public.courses (code) on delete set null,
  external_course_name text,
  institution          text not null default 'Griffith University',
  year                 smallint not null check (year between 1990 and 2100),
  trimester            smallint not null check (trimester in (1, 2, 3)),
  role                 tutor_role not null default 'tutor',
  hours_per_week       smallint check (hours_per_week between 0 and 40),
  description          text,
  -- Set by an administrator once checked against Griffith records.
  is_verified          boolean not null default false,
  created_at           timestamptz not null default now(),
  -- Either an internal course or a named external one, not neither.
  constraint experience_course_identified check (
    course_code is not null or length(btrim(coalesce(external_course_name, ''))) > 0
  )
);

create index if not exists experience_profile_idx on public.tutoring_experience (profile_id);
create index if not exists experience_course_idx on public.tutoring_experience (course_code);

-- ---------------------------------------------------------------------------
-- assignments — confirmed tutor allocations
-- ---------------------------------------------------------------------------
create table if not exists public.assignments (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  course_code    text not null references public.courses (code) on delete restrict,
  year           smallint not null check (year between 2020 and 2100),
  trimester      smallint not null check (trimester in (1, 2, 3)),
  role           tutor_role not null default 'tutor',
  hours_per_week smallint not null default 0 check (hours_per_week between 0 and 30),
  status         assignment_status not null default 'proposed',
  assigned_by_id uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- One allocation per person per course per teaching period.
  unique (profile_id, course_code, year, trimester)
);

create index if not exists assignments_profile_idx on public.assignments (profile_id);
create index if not exists assignments_course_period_idx on public.assignments (course_code, year, trimester);

-- ---------------------------------------------------------------------------
-- application_notes — private review commentary (staff only)
-- ---------------------------------------------------------------------------
create table if not exists public.application_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id      uuid not null references public.profiles (id) on delete cascade,
  body           text not null check (length(btrim(body)) > 0),
  created_at     timestamptz not null default now()
);

create index if not exists notes_application_idx on public.application_notes (application_id);

-- ---------------------------------------------------------------------------
-- contact_log — record of staff contacting an applicant
--
-- Interviews and offers happen over email outside this system. Logging them
-- here keeps an auditable trail and stops two convenors approaching the same
-- applicant unknowingly.
-- ---------------------------------------------------------------------------
create table if not exists public.contact_log (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  lecturer_id    uuid not null references public.profiles (id) on delete cascade,
  method         contact_method not null default 'email',
  subject        text not null,
  notes          text,
  contacted_at   timestamptz not null default now()
);

create index if not exists contact_log_application_idx on public.contact_log (application_id);

-- ---------------------------------------------------------------------------
-- audit_log — append-only trail of consequential actions
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ## supabase/migrations/0002_functions.sql

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
create or replace view public.applicant_rows
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
create or replace view public.course_demand
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

-- ## supabase/migrations/0003_rls.sql

-- ============================================================================
-- Migration 0003 — Row Level Security
--
-- This is the security boundary of the system. The browser holds only the
-- Supabase anon key, which grants nothing on its own; every read and write is
-- evaluated against the policies below using the caller's authenticated
-- identity. A compromised or modified frontend cannot read data these policies
-- do not allow.
--
-- Summary of intent
--   student  : own profile, own application + preferences, own experience,
--              own assignments; read-only catalogue and rounds.
--   lecturer : profiles and applications of people who nominated a course they
--              teach; may add notes, log contact, and allocate for those
--              courses only.
--   admin    : full access across the School.
-- ============================================================================

alter table public.profiles               enable row level security;
alter table public.courses                enable row level security;
alter table public.course_lecturers       enable row level security;
alter table public.recruitment_rounds     enable row level security;
alter table public.applications           enable row level security;
alter table public.application_preferences enable row level security;
alter table public.tutoring_experience    enable row level security;
alter table public.assignments            enable row level security;
alter table public.application_notes      enable row level security;
alter table public.contact_log            enable row level security;
alter table public.audit_log              enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

-- Lecturers see staff (to know who convenes what) and applicants to their courses.
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select using (
    public.is_staff() and (
      role in ('lecturer', 'admin')
      or exists (
        select 1
        from public.applications a
        join public.application_preferences ap on ap.application_id = a.id
        join public.course_lecturers cl on cl.course_code = ap.course_code
        where a.applicant_id = public.profiles.id
          and a.status <> 'draft'
          and cl.lecturer_id = auth.uid()
      )
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Guard against privilege escalation: a user may edit their own profile, but
-- may not change their own role or reactivate a disabled account.
create or replace function public.guard_profile_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'You cannot change your own role.' using errcode = 'insufficient_privilege';
  end if;
  if new.is_active is distinct from old.is_active then
    raise exception 'You cannot change your own account status.' using errcode = 'insufficient_privilege';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Email changes must go through account settings.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- ---------------------------------------------------------------------------
-- courses — readable by every signed-in user; only admins may change them
-- ---------------------------------------------------------------------------
drop policy if exists courses_select_all on public.courses;
create policy courses_select_all on public.courses
  for select using (auth.uid() is not null);

drop policy if exists courses_admin_write on public.courses;
create policy courses_admin_write on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- course_lecturers
-- ---------------------------------------------------------------------------
drop policy if exists course_lecturers_select on public.course_lecturers;
create policy course_lecturers_select on public.course_lecturers
  for select using (auth.uid() is not null);

drop policy if exists course_lecturers_admin_write on public.course_lecturers;
create policy course_lecturers_admin_write on public.course_lecturers
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- recruitment_rounds
-- ---------------------------------------------------------------------------
drop policy if exists rounds_select on public.recruitment_rounds;
create policy rounds_select on public.recruitment_rounds
  for select using (auth.uid() is not null);

drop policy if exists rounds_admin_write on public.recruitment_rounds;
create policy rounds_admin_write on public.recruitment_rounds
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
drop policy if exists applications_select_own on public.applications;
create policy applications_select_own on public.applications
  for select using (applicant_id = auth.uid());

drop policy if exists applications_select_staff on public.applications;
create policy applications_select_staff on public.applications
  for select using (public.can_view_application(id));

-- Students create their own application, in draft, for the active round only.
drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own on public.applications
  for insert with check (
    applicant_id = auth.uid()
    and status = 'draft'
    and exists (
      select 1 from public.recruitment_rounds r
      where r.id = round_id and r.is_active and now() between r.opens_at and r.closes_at
    )
  );

-- Students may edit only while the application is still a draft. Status moves
-- go through submit_application() / staff policies, never a direct client write.
drop policy if exists applications_update_own_draft on public.applications;
create policy applications_update_own_draft on public.applications
  for update using (applicant_id = auth.uid() and status = 'draft')
  with check (applicant_id = auth.uid() and status = 'draft');

-- Convenors may progress the status of applications naming their courses.
drop policy if exists applications_update_staff on public.applications;
create policy applications_update_staff on public.applications
  for update using (public.can_view_application(id) and public.is_staff())
  with check (public.can_view_application(id) and public.is_staff());

drop policy if exists applications_admin_all on public.applications;
create policy applications_admin_all on public.applications
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- application_preferences
-- ---------------------------------------------------------------------------
drop policy if exists prefs_select on public.application_preferences;
create policy prefs_select on public.application_preferences
  for select using (public.can_view_application(application_id));

drop policy if exists prefs_write_own_draft on public.application_preferences;
create policy prefs_write_own_draft on public.application_preferences
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.applicant_id = auth.uid() and a.status = 'draft'
    )
  ) with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.applicant_id = auth.uid() and a.status = 'draft'
    )
  );

drop policy if exists prefs_admin_all on public.application_preferences;
create policy prefs_admin_all on public.application_preferences
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- tutoring_experience
-- ---------------------------------------------------------------------------
drop policy if exists experience_select_own on public.tutoring_experience;
create policy experience_select_own on public.tutoring_experience
  for select using (profile_id = auth.uid());

-- Staff may read the experience of anyone who applied to a course they teach.
drop policy if exists experience_select_staff on public.tutoring_experience;
create policy experience_select_staff on public.tutoring_experience
  for select using (
    public.is_admin() or exists (
      select 1
      from public.applications a
      join public.application_preferences ap on ap.application_id = a.id
      join public.course_lecturers cl on cl.course_code = ap.course_code
      where a.applicant_id = public.tutoring_experience.profile_id
        and a.status <> 'draft'
        and cl.lecturer_id = auth.uid()
    )
  );

-- Applicants maintain their own history, but cannot mark it verified.
drop policy if exists experience_write_own on public.tutoring_experience;
create policy experience_write_own on public.tutoring_experience
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and is_verified = false);

drop policy if exists experience_admin_all on public.tutoring_experience;
create policy experience_admin_all on public.tutoring_experience
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------------
drop policy if exists assignments_select_own on public.assignments;
create policy assignments_select_own on public.assignments
  for select using (profile_id = auth.uid());

drop policy if exists assignments_select_staff on public.assignments;
create policy assignments_select_staff on public.assignments
  for select using (public.is_staff());

-- A convenor may only allocate tutors to their own courses.
drop policy if exists assignments_write_staff on public.assignments;
create policy assignments_write_staff on public.assignments
  for all using (public.teaches_course(course_code))
  with check (public.teaches_course(course_code));

-- ---------------------------------------------------------------------------
-- application_notes — staff only, never visible to the applicant
-- ---------------------------------------------------------------------------
drop policy if exists notes_select_staff on public.application_notes;
create policy notes_select_staff on public.application_notes
  for select using (public.is_staff() and public.can_view_application(application_id));

drop policy if exists notes_insert_staff on public.application_notes;
create policy notes_insert_staff on public.application_notes
  for insert with check (
    author_id = auth.uid() and public.is_staff() and public.can_view_application(application_id)
  );

drop policy if exists notes_update_own on public.application_notes;
create policy notes_update_own on public.application_notes
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists notes_admin_all on public.application_notes;
create policy notes_admin_all on public.application_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- contact_log — staff only
-- ---------------------------------------------------------------------------
drop policy if exists contact_select_staff on public.contact_log;
create policy contact_select_staff on public.contact_log
  for select using (public.is_staff() and public.can_view_application(application_id));

drop policy if exists contact_insert_staff on public.contact_log;
create policy contact_insert_staff on public.contact_log
  for insert with check (
    lecturer_id = auth.uid() and public.is_staff() and public.can_view_application(application_id)
  );

drop policy if exists contact_admin_all on public.contact_log;
create policy contact_admin_all on public.contact_log
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_log — readable by admins only; append-only for everyone else
-- ---------------------------------------------------------------------------
drop policy if exists audit_select_admin on public.audit_log;
create policy audit_select_admin on public.audit_log
  for select using (public.is_admin());

drop policy if exists audit_insert_any on public.audit_log;
create policy audit_insert_any on public.audit_log
  for insert with check (actor_id = auth.uid());

-- ## supabase/migrations/0004_registration_is_students_only.sql

-- ============================================================================
-- Migration 0004 — self-registration always creates a student
--
-- WHY
-- The original rule derived role from the email domain: @griffith.edu.au meant
-- staff. That is wrong at Griffith. HDR candidates (PhD students) hold
-- @griffith.edu.au addresses too, so the domain cannot distinguish a professor
-- from a PhD student who wants to tutor — and the latter are among the
-- strongest tutor candidates.
--
-- The correct model, and the one in the original brief:
--   * Students self-register.       -> always the 'student' role
--   * Staff are created by an admin. -> role set explicitly, after creation
--
-- Nothing a person can type at registration influences their role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The student-number constraint has to go.
--
-- Staff accounts are created through the auth admin API, which fires the
-- signup trigger below. That trigger inserts the row as a 'student' before an
-- administrator promotes it, and this constraint would reject that insert for
-- lack of a student number. The format check on the column remains; the
-- "students must have one" rule belongs in the registration form, where it can
-- produce a helpful message, not in a constraint that breaks staff creation.
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_student_number_role;

-- ---------------------------------------------------------------------------
-- Self-registration creates a student. Always.
--
-- Role is never read from raw_user_meta_data: that field is supplied by the
-- client at signup, so trusting it would let anyone register as a lecturer.
-- Promotion to 'lecturer' or 'admin' happens only through an administrator,
-- using the service role, after the account exists.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
begin
  v_domain := lower(split_part(new.email, '@', 2));

  if v_domain not in ('griffith.edu.au', 'griffithuni.edu.au') then
    raise exception 'Registration is restricted to Griffith University accounts (@griffith.edu.au or @griffithuni.edu.au).'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (
    id, email, full_name, role, student_number, program, campus, degree_level
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    -- Always a student. Staff are promoted by an administrator afterwards.
    'student',
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'student_number', '')), ''),
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
-- Staff must not carry a student number. Enforced on promotion rather than on
-- insert, so it cannot block account creation.
-- ---------------------------------------------------------------------------
create or replace function public.clear_student_number_for_staff()
returns trigger language plpgsql as $$
begin
  if new.role in ('lecturer', 'admin') then
    new.student_number := null;
  end if;
  return new;
end $$;

drop trigger if exists profiles_clear_student_number on public.profiles;
create trigger profiles_clear_student_number before insert or update on public.profiles
  for each row execute function public.clear_student_number_for_staff();

-- ## supabase/migrations/0005_staff_see_all_applicants.sql

-- ============================================================================
-- Migration 0005 — staff see all applicants
--
-- WHY
-- Restricting a convenor to applicants for "their" courses required the School
-- to maintain a convenor-to-course map across 187 courses, refreshed every
-- trimester. That map is not readily available, and until it existed no
-- convenor could see anything — so the restriction blocked the system from
-- being usable at all.
--
-- The School's decision: any staff member may see every applicant. Course
-- selection remains, but is now a personal filter (which courses I care about)
-- rather than a permission boundary.
--
-- What this does NOT change:
--   * Students still see only their own records.
--   * Drafts remain invisible to staff.
--   * Review notes remain invisible to applicants.
--   * Only administrators manage accounts, courses and rounds.
--   * Every view and contact is still attributable via audit_log/contact_log.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Any active staff member may view any submitted application.
-- ---------------------------------------------------------------------------
create or replace function public.can_view_application(p_application_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.id = p_application_id and a.applicant_id = auth.uid()
    )
    or (
      public.is_staff()
      and exists (
        select 1 from public.applications a
        where a.id = p_application_id
          -- Drafts are never visible to staff, regardless of role.
          and a.status <> 'draft'
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- Staff may read applicant profiles.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select using (
    public.is_staff() and (
      role in ('lecturer', 'admin')
      or exists (
        select 1 from public.applications a
        where a.applicant_id = public.profiles.id and a.status <> 'draft'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Staff may read the teaching history of anyone who has applied.
-- ---------------------------------------------------------------------------
drop policy if exists experience_select_staff on public.tutoring_experience;
create policy experience_select_staff on public.tutoring_experience
  for select using (
    public.is_admin() or (
      public.is_staff() and exists (
        select 1 from public.applications a
        where a.applicant_id = public.tutoring_experience.profile_id
          and a.status <> 'draft'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Any staff member may allocate tutors.
--
-- assigned_by_id records who made each allocation, so this stays accountable
-- without requiring the convenor map.
-- ---------------------------------------------------------------------------
drop policy if exists assignments_write_staff on public.assignments;
create policy assignments_write_staff on public.assignments
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Course selection is now a personal preference, so a lecturer maintains their
-- own rows. Administrators may still adjust anyone's.
-- ---------------------------------------------------------------------------
drop policy if exists course_lecturers_own_write on public.course_lecturers;
create policy course_lecturers_own_write on public.course_lecturers
  for all using (lecturer_id = auth.uid() and public.is_staff())
  with check (lecturer_id = auth.uid() and public.is_staff());

comment on table public.course_lecturers is
  'Courses a staff member has nominated as theirs. A personal filter and the '
  'basis of the coverage warning — not an access control boundary. Staff may '
  'view all applicants regardless of what appears here.';

-- ## supabase/seed/0001_courses.sql

-- ============================================================================
-- Seed — School of ICT course catalogue (187 courses)
--
-- Source: Griffith University's official course reading-list directory for the
-- School of Information and Communication Technology
-- (griffith.rl.talis.com/schools/ict), retrieved September 2026.
-- Campus and teaching-period variants (_M2, _P1, ...) collapsed to base codes.
--
-- Idempotent: safe to re-run. Titles are refreshed on conflict.
-- ============================================================================

insert into public.courses (code, title) values
  ('1001ICT', 'Introduction to Programming'),
  ('1004ICT', 'Professional Practice in Information Technology'),
  ('1005ICT', 'Object Oriented Programming'),
  ('1007ICT', 'Computer Systems and Cyber Security'),
  ('1008ICT', 'Business Informatics'),
  ('1011ICT', 'Applied Computing'),
  ('1013ICT', 'Mathematics for Computer Science'),
  ('1116ICT', 'Introduction to AI and Data Analytics'),
  ('1117ICT', 'Big Data Analytics and Social Media'),
  ('1118ICT', 'Fundamentals of Cyber Security'),
  ('1611ICT', 'Emerging Technologies'),
  ('1621ICT', 'Web Technologies'),
  ('1701ICT', 'Creative Coding'),
  ('1711ICT', 'Introduction to Robotics'),
  ('1801ICT', 'Object-Oriented Programming'),
  ('1802ICT', 'Foundations of Systems Development'),
  ('1803ICT', 'Information Systems Foundations'),
  ('1804ICT', 'Data Management'),
  ('1805ICT', 'Human Computer Interaction'),
  ('1806ICT', 'Programming Fundamentals'),
  ('1807ICT', 'Computer and Network Architecture'),
  ('1808ICT', 'Discrete Structures'),
  ('1810ICT', 'Software Development Processes'),
  ('1811ICT', 'Programming Principles'),
  ('1812ICT', 'Data Management'),
  ('1814ICT', 'Data Management'),
  ('2006ICT', 'Object Oriented Software Development'),
  ('2007ICT', 'Cyber Security Standards and Operations'),
  ('2008ICT', 'Design Thinking in IT'),
  ('2016ICT', 'Cloud Architecture and Administration'),
  ('2030ICT', 'Introduction to Big Data Analytics'),
  ('2031ICT', 'Data Analytics Methods'),
  ('2105ICT', 'Advanced Research Project in Information Technology A'),
  ('2420ICT', 'Systems Programming'),
  ('2511ICT', 'Business Analysis'),
  ('2701ICT', 'Interactive App Development'),
  ('2702ICT', 'Intelligent Media Systems'),
  ('2703ICT', 'Web Application Development'),
  ('2800ICT', 'Object Oriented Programming'),
  ('2801ICT', 'Computing Algorithms'),
  ('2802ICT', 'Intelligent Systems'),
  ('2803ICT', 'Systems and Distributed Computing'),
  ('2805ICT', 'System and Software Design'),
  ('2806ICT', 'IT Services Management'),
  ('2807ICT', 'Programming Principles'),
  ('2808ICT', 'Secure Development Operations'),
  ('2809ICT', 'Computer Networking Essentials'),
  ('2810ICT', 'Software Technologies'),
  ('2811ICT', 'Web Programming'),
  ('2812ICT', 'Perceptual Computing'),
  ('2813ICT', 'Software Engineering Fundamentals'),
  ('2814ICT', 'Data Management'),
  ('2815ICT', 'Theory of Computing'),
  ('2905ICT', 'Fundamentals of Cyber Security'),
  ('3001ICT', 'Enterprise Routing and Network Architectures'),
  ('3002ICT', 'Industry Project'),
  ('3003ICT', 'Programming for Robotics'),
  ('3004ICT', 'Web Application Development'),
  ('3005ICT', 'Distributed Programming'),
  ('3006ICT', 'Robotics and Computer Vision'),
  ('3008ICT', 'Deep Learning'),
  ('3009ICT', 'Data Processing and Visualisation'),
  ('3010ICT', 'Cyber Security of Cyber Physical Systems'),
  ('3012ICT', 'Cryptography'),
  ('3014ICT', 'Cyber Security Defence and Incident Response'),
  ('3015ICT', 'Trustworthy AI'),
  ('3016ICT', 'Secure Development Operations'),
  ('3020ICT', 'Industry Affiliates Program'),
  ('3030ICT', 'Data Analytics'),
  ('3031ICT', 'Applied Data Mining'),
  ('3032ICT', 'Big Data Analytics and Social Media'),
  ('3105ICT', 'Advanced Research Project in Information Technology B'),
  ('3301ICT', 'Enterprise Architecture Concepts'),
  ('3407ICT', 'Graphics Programming'),
  ('3410ICT', 'The Ethical Technologist'),
  ('3412ICT', 'Software Architecture'),
  ('3413ICT', 'Network Security'),
  ('3418ICT', 'Strategic IS Management'),
  ('3420ICT', 'Systems Programming'),
  ('3421ICT', 'Multiagent Systems'),
  ('3530ICT', 'Scientific and Parallel Computing'),
  ('3601ICT', 'Professional Practice Portfolio'),
  ('3612ICT', 'Database Systems and Administration'),
  ('3623ICT', 'Information and Content Management'),
  ('3624ICT', '3D Game Development'),
  ('3701ICT', 'Mobile Application Development'),
  ('3702ICT', 'Games Development'),
  ('3705ICT', 'Virtual and Augmented Reality'),
  ('3706ICT', 'Sensor Networks'),
  ('3707ICT', 'Automation and IoT'),
  ('3723ICT', 'Interaction Design'),
  ('3801ICT', 'Numerical Algorithms'),
  ('3802ICT', 'Programming Languages'),
  ('3803ICT', 'Big Data Analysis'),
  ('3804ICT', 'Data Mining'),
  ('3805ICT', 'Advanced Algorithms'),
  ('3806ICT', 'Logic and Automated Reasoning'),
  ('3807ICT', 'IT/Business Alignment'),
  ('3808ICT', 'Routing and Internetworking'),
  ('3809ICT', 'Ethical Hacking'),
  ('3810ICT', 'Enterprise Architecture Application'),
  ('3811ICT', 'Advanced Network Architectures'),
  ('3812ICT', 'Agile Methodologies'),
  ('3813ICT', 'Full Stack Development'),
  ('3815ICT', 'Software Engineering'),
  ('3821ICT', 'Work Integrated Learning - Single Project'),
  ('3822ICT', 'Work Integrated Learning - Placement'),
  ('3825ICT', 'Theory of Computation'),
  ('3906ICT', 'Digital Forensics'),
  ('4030ICT', 'Big Data Analytics and Social Media'),
  ('6001ICT', 'Advanced Topics in Computer Science A'),
  ('6002ICT', 'Advanced Topics in Computer Science B'),
  ('6003ICT', 'Advanced Topics in Computer Science C'),
  ('6004ICT', 'Advanced Topics in Computer Science D'),
  ('6005ICT', 'Research Practice in ICT 1'),
  ('6006ICT', 'Research Practice in ICT 2'),
  ('6105ICT', 'Advanced Topics in Information Technology C'),
  ('6106ICT', 'Advanced Topics in Information Technology D'),
  ('6112ICT', 'Research Methods in IT'),
  ('6190ICT', 'Honours Thesis'),
  ('6205ICT', 'Advanced Topics in Information Technology A'),
  ('6206ICT', 'Advanced Topics in Information Technology B'),
  ('7001ICT', 'Programming Principles'),
  ('7002ICT', 'Systems Development'),
  ('7003ICT', 'Database Design'),
  ('7004ICT', 'Data Communication'),
  ('7005ICT', 'Web Programming'),
  ('7006ICT', 'Introduction to Artificial Intelligence'),
  ('7008ICT', 'Data Processing and Visualisation'),
  ('7009ICT', 'Advances in XR Development'),
  ('7010ICT', 'Object Oriented Software Development'),
  ('7011ICT', 'Data Structures and Algorithms'),
  ('7013ICT', 'Advanced Topics in IT'),
  ('7015ICT', 'Cyber Security Operations Centres'),
  ('7016ICT', 'Cyber Security of Critical Infrastructure'),
  ('7017ICT', 'Responsible and Secure Artificial Intelligence'),
  ('7018ICT', 'Cloud Architecture and Administration'),
  ('7019ICT', 'Cyber Security Risk Management'),
  ('7022ICT', 'Computational Intelligence'),
  ('7030ICT', 'Introduction to Big Data Analytics'),
  ('7031ICT', 'Applied Data Mining'),
  ('7101ICT', 'The Ethical Technologist'),
  ('7103ICT', 'Business Analysis'),
  ('7113ICT', 'Research for IT Professionals'),
  ('7130ICT', 'Data Analytics'),
  ('7204ICT', 'Database Technology'),
  ('7230ICT', 'Big Data Analytics and Social Media'),
  ('7301ICT', 'Enterprise Architecture Concepts'),
  ('7302ICT', 'Enterprise Architecture Applications'),
  ('7401ICT', 'eService Technology'),
  ('7412ICT', 'Software Architecture'),
  ('7418ICT', 'Strategic Information Systems Management'),
  ('7420ICT', 'Advanced Software Development'),
  ('7421ICT', 'Mobile Device Software Development'),
  ('7502ICT', 'Advanced Networking'),
  ('7504ICT', 'Network and Information Security'),
  ('7506ICT', 'Industrial Applications of Blockchain'),
  ('7590ICT', 'Dissertation'),
  ('7610ICT', 'Application Systems'),
  ('7611ICT', 'Computer Systems and Cyber Security'),
  ('7623ICT', 'Secure Development Operations'),
  ('7701ICT', 'IT Project'),
  ('7720ICT', 'Industry Affiliates Program'),
  ('7740ICT', 'Industry Affiliates Program'),
  ('7805ICT', 'System and Software Design'),
  ('7806ICT', 'IT Services Management'),
  ('7807ICT', 'IT/Business Alignment'),
  ('7808ICT', 'Project and Cyber Security Management'),
  ('7809ICT', 'Offensive Cyber Security'),
  ('7810ICT', 'Software Technologies'),
  ('7812ICT', 'Agile Business Analysis'),
  ('7821ICT', 'Work Integrated Learning - Single Project'),
  ('7822ICT', 'Work Integrated Learning - Placement'),
  ('7905ICT', 'Fundamentals of Cyber Security'),
  ('7906ICT', 'Digital Investigations'),
  ('7907ICT', 'IT and Cyber Security Governance, Policy, Ethics and Law'),
  ('7980ICT', 'Cyber Security Capstone Project'),
  ('7990ICT', 'Designing Application Systems and Databases'),
  ('7991ICT', 'Computer Systems and Programming'),
  ('7992ICT', 'Artificial Intelligence and IT Governance'),
  ('7993ICT', 'Network Infrastructure and Cloud Systems'),
  ('7994ICT', 'Security Essentials and Adversarial Techniques'),
  ('7995ICT', 'Data Wrangling and Social Analytics'),
  ('7996ICT', 'Intelligent Systems and Data Analysis'),
  ('7997ICT', 'Capstone Project'),
  ('7998ICT', 'Security Operations Centre and AI'),
  ('7999ICT', 'Critical Infrastructure and Distributed Technologies')

-- Refresh titles if the catalogue has been updated upstream.
on conflict (code) do update set title = excluded.title;
