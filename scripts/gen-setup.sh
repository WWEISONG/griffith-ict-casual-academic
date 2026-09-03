#!/usr/bin/env bash
# Regenerates supabase/setup.sql from the individual migration files.
set -euo pipefail
cd "$(dirname "$0")/.."
exec > supabase/setup.sql
cat <<'HDR'
-- ============================================================================
-- Casual Academic (Tutor) Management System
-- School of ICT, Griffith University
--
-- COMPLETE DATABASE SETUP — run this once, in the Supabase SQL Editor.
-- Generated file: edit the sources under supabase/migrations, not this.
-- Safe to re-run: every statement is idempotent.
-- ============================================================================
HDR
for f in supabase/migrations/*.sql supabase/seed/*.sql; do
  printf '\n-- ## %s\n\n' "$f"
  cat "$f"
done
