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
