-- ============================================================================
-- Confirm any account left unverified while "Confirm email" was switched on.
--
-- Accounts created before that setting was turned off cannot sign in, because
-- Supabase treats them as unverified. This marks them confirmed.
--
-- Safe to re-run. Only affects accounts that are not already confirmed.
-- ============================================================================

-- See what is pending.
select email, created_at, email_confirmed_at
  from auth.users
 where email_confirmed_at is null
 order by created_at desc;

-- Confirm them.
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email_confirmed_at is null;

-- Verify: this should return no rows.
select email from auth.users where email_confirmed_at is null;
