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
