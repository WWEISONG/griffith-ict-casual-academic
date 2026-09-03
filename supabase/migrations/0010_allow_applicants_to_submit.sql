-- ============================================================================
-- Migration 0010 — the status guard blocked submission itself
--
-- THE BUG
-- guard_application_status() (migration 0006) refuses any status change made by
-- someone who is not staff. Submitting an application IS a status change:
-- draft -> submitted. submit_application() is SECURITY DEFINER, but that does
-- not alter auth.uid() — it still returns the student — so the guard fired and
-- refused.
--
-- Effect: no student could submit an application at all. Every attempt stayed
-- a draft, and drafts are invisible to staff, so applications silently went
-- nowhere.
--
-- THE FIX
-- Name the two transitions an applicant is entitled to make on their own
-- application — submitting a draft, and withdrawing — and refuse the rest.
-- Moving an application through review remains staff-only.
-- ============================================================================

create or replace function public.guard_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No authenticated caller: SQL Editor, a migration, or the service role.
  if auth.uid() is null then
    return new;
  end if;

  -- Staff move applications through the review pipeline.
  if public.is_staff() then
    return new;
  end if;

  if new.status is distinct from old.status then
    -- The applicant may do exactly two things to their own application:
    -- submit a draft, and withdraw. Everything else is the School's decision.
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
