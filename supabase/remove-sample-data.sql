-- ============================================================================
-- Remove every sample applicant created by `npm run seed:live`.
--
-- Sample accounts all use addresses beginning "sample.". Deleting the auth
-- user cascades to their profile, application, preferences, experience and
-- allocations, so this is the only statement needed.
--
-- Run in the Supabase SQL Editor. Real applicants are untouched.
-- ============================================================================

-- Check what will be removed before running the delete.
select email, created_at from auth.users where email like 'sample.%' order by email;

-- Then:
delete from auth.users where email like 'sample.%';

-- Confirm.
select count(*) as remaining_sample_accounts from auth.users where email like 'sample.%';
