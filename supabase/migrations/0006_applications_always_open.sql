-- ============================================================================
-- Migration 0006 — applications are always open
--
-- WHY
-- The system gated applications behind a "recruitment round" that an
-- administrator had to open. That is not how the School wants to work:
-- students should be able to register an interest in tutoring at any time,
-- and convenors browse that pool whenever they are staffing a course.
--
-- The round machinery also meant a student who submitted was frozen out until
-- someone opened a new round — so they could never add a course they had since
-- become qualified for.
--
-- New model
--   * One standing application per student, submitted whenever they like.
--   * They may revise it at any time; convenors always see the current version.
--   * Trimester still matters, but where it actually belongs: on allocations,
--     which already carry year and trimester.
--
-- recruitment_rounds is kept, unused, so a future trimester-scoped intake can
-- be reintroduced without another schema change.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- An application no longer belongs to a round.
-- ---------------------------------------------------------------------------
alter table public.applications alter column round_id drop not null;

-- One standing application per student, rather than one per round.
alter table public.applications drop constraint if exists applications_applicant_id_round_id_key;

create unique index if not exists applications_one_per_applicant
  on public.applications (applicant_id);

-- ---------------------------------------------------------------------------
-- Submission no longer checks that a round is open.
-- ---------------------------------------------------------------------------
create or replace function public.submit_application(p_application_id uuid)
returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  v_app   public.applications;
  v_prefs int;
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'Application not found.' using errcode = 'no_data_found';
  end if;

  if v_app.applicant_id <> auth.uid() and not public.is_admin() then
    raise exception 'You may only submit your own application.' using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_prefs from public.application_preferences where application_id = p_application_id;
  if v_prefs < 1 then
    raise exception 'Nominate at least one course before submitting.' using errcode = 'check_violation';
  end if;

  if length(btrim(v_app.statement)) < 100 then
    raise exception 'Your supporting statement must be at least 100 characters.' using errcode = 'check_violation';
  end if;

  update public.applications
     set status       = case when status = 'draft' then 'submitted' else status end,
         submitted_at = coalesce(submitted_at, now())
   where id = p_application_id
  returning * into v_app;

  insert into public.audit_log (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'application.submitted', 'application', p_application_id::text,
          jsonb_build_object('preferences', v_prefs));

  return v_app;
end $$;

-- ---------------------------------------------------------------------------
-- Students may create an application at any time.
-- ---------------------------------------------------------------------------
drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own on public.applications
  for insert with check (applicant_id = auth.uid() and status = 'draft');

-- ---------------------------------------------------------------------------
-- Students may revise their application after submitting, so it stays current
-- as they gain experience. They may not move it through the review pipeline —
-- that is the convenors' job, enforced by the trigger below.
-- ---------------------------------------------------------------------------
drop policy if exists applications_update_own_draft on public.applications;
create policy applications_update_own on public.applications
  for update using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid());

create or replace function public.guard_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Staff and admins may move an application through the pipeline freely.
  if public.is_staff() then
    return new;
  end if;
  -- The applicant may only withdraw, or submit via submit_application(),
  -- which runs as definer and bypasses this check.
  if new.status is distinct from old.status
     and not (new.status = 'withdrawn' or old.status = 'withdrawn') then
    raise exception 'Your application status is set by the School, not by you.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

drop trigger if exists applications_guard_status on public.applications;
create trigger applications_guard_status before update on public.applications
  for each row execute function public.guard_application_status();

-- ---------------------------------------------------------------------------
-- Preferences follow the same rule: editable whenever, by the owner.
-- ---------------------------------------------------------------------------
drop policy if exists prefs_write_own_draft on public.application_preferences;
create policy prefs_write_own on public.application_preferences
  for all using (
    exists (select 1 from public.applications a
             where a.id = application_id and a.applicant_id = auth.uid())
  ) with check (
    exists (select 1 from public.applications a
             where a.id = application_id and a.applicant_id = auth.uid())
  );

comment on table public.recruitment_rounds is
  'Unused as of migration 0006: applications are always open. Retained so a '
  'trimester-scoped intake can be reintroduced without a schema change.';
