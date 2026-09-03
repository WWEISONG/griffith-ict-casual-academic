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
