-- ============================================================================
-- Migration 0009 — the privilege guards must not fire without a caller
--
-- THE BUG
-- guard_profile_self_update() and guard_application_status() exist to stop a
-- signed-in user escalating their own privileges. Both decided by asking
-- is_admin(), which reads auth.uid().
--
-- In the SQL Editor, a migration, or anything running as the service role,
-- auth.uid() is NULL. is_admin() is therefore false, and the guards concluded
-- "not an admin" and refused the write — blocking an administrator from
-- promoting an account from the one place they are supposed to be able to.
--
-- THE FIX
-- No authenticated caller means no privilege to escalate: the guards return
-- early. They also now only apply to a user editing their OWN row, which is
-- what "self-update" was always meant to mean.
-- ============================================================================

create or replace function public.guard_profile_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No authenticated caller: SQL Editor, a migration, or the service role.
  -- There is no "self" here, so there is nothing to guard.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- Only guards someone editing their own profile. Edits to other rows are
  -- already governed by row level security.
  if new.id is distinct from auth.uid() then
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

-- Same reasoning for the application status guard.
create or replace function public.guard_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_staff() then
    return new;
  end if;
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
