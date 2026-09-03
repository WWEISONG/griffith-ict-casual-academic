-- ============================================================================
-- Migration 0008 — application form simplification
--
-- The form no longer collects GPA or a self-rated confidence per course:
--   * GPA was self-reported with no way to verify it, so it invited a
--     precision the data did not have.
--   * Confidence was a number applicants had every reason to max out.
--
-- A contact number is now required instead — convenors contact applicants
-- directly, so it is the field that actually gets used.
--
-- The gpa and confidence columns are retained (unused, nullable) so existing
-- rows are not destroyed and either could be reinstated without a migration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Expose the contact number to staff, and drop GPA from the review view.
-- ---------------------------------------------------------------------------
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
  a.updated_at,
  a.hours_per_week,
  p.full_name,
  p.email,
  p.phone,
  p.student_number,
  p.program,
  p.degree_level,
  p.campus,
  ap.course_code                as matched_course_code,
  ap.rank                       as matched_rank,
  (select count(*) from public.tutoring_experience te
     where te.profile_id = a.applicant_id and te.course_code = ap.course_code)  as prior_times_taught,
  (select count(*) from public.tutoring_experience te
     where te.profile_id = a.applicant_id)                                      as total_prior_engagements,
  coalesce((select sum(asg.hours_per_week) from public.assignments asg
     where asg.profile_id = a.applicant_id and asg.status = 'confirmed'), 0)    as current_load_hours
from public.applications a
join public.profiles p                 on p.id = a.applicant_id
join public.application_preferences ap on ap.application_id = a.id
where a.status <> 'draft';

-- ---------------------------------------------------------------------------
-- A contact number is required to submit.
--
-- Enforced in the submit function rather than as a column constraint, so a
-- profile can still be created at signup before the number is known.
-- ---------------------------------------------------------------------------
create or replace function public.submit_application(p_application_id uuid)
returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  v_app   public.applications;
  v_prefs int;
  v_phone text;
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

  select btrim(coalesce(phone, '')) into v_phone
    from public.profiles where id = v_app.applicant_id;
  if v_phone = '' then
    raise exception 'Add a contact number before submitting.' using errcode = 'check_violation';
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

comment on column public.profiles.gpa is
  'Unused since migration 0008: self-reported and unverifiable. Retained so '
  'existing values survive and it can be reinstated without a migration.';

comment on column public.application_preferences.confidence is
  'Unused since migration 0008. Retained for the same reason as profiles.gpa.';
