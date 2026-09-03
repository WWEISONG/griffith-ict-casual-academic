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
