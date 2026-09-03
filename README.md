# Casual Academic (Tutor) Management System

**School of Information and Communication Technology, Griffith University**

A single system for senior students to apply for casual academic work, and for
course convenors to find and select tutors — replacing the spreadsheets and
email threads currently used each trimester.

📐 **[System architecture and diagrams →](docs/ARCHITECTURE.md)**

---

## What it does

| Role | Capability |
|---|---|
| **Student** | Register with a Griffith account, record teaching history, nominate ranked course preferences, write a supporting statement, submit one application per round. |
| **Course convenor** | See applicants for *their courses only*, ranked by preference and prior experience. Compare GPA, teaching history and existing workload. Shortlist in bulk, email applicants, allocate tutors. |
| **Administrator** | Open recruitment rounds, create convenor accounts, assign courses, monitor coverage across all 187 ICT courses, export for HR. |

The system covers **recruitment only**. Contracts, pay and onboarding remain
with Griffith HR under the Academic Staff Enterprise Agreement.

---

## Running it locally

```bash
npm install
npm run dev
```

Opens on <http://localhost:5173>. With no backend configured the app runs
against in-browser sample data, so it works immediately.

---

## Connecting the real backend

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) (free tier is sufficient) and
create a project in the **Sydney (ap-southeast-2)** region — keeping student
data in Australia matters for university privacy obligations.

### 2. Apply the schema

In the Supabase dashboard, open **SQL Editor** and run these files in order:

```
supabase/migrations/0001_schema.sql     -- tables, types, constraints
supabase/migrations/0002_functions.sql  -- triggers, auth helpers, views
supabase/migrations/0003_rls.sql        -- row level security policies
supabase/seed/0001_courses.sql          -- 187 ICT courses
```

### 3. Configure credentials

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API**:

| Variable | Where | Safe to publish? |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key | Yes — grants nothing without a login |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **No — never commit or expose** |
| `SUPER_ADMIN_EMAIL` | your Griffith address | — |
| `SUPER_ADMIN_PASSWORD` | your chosen password | **No** |

`.env.local` is git-ignored and is never published.

### 4. Create the administrator account

```bash
npm run bootstrap
```

This creates the super administrator, elevates it to `admin`, and opens an
initial recruitment round. Safe to re-run — it resets the password to the
configured value if the account already exists.

### 5. Add convenor accounts

Either through **Accounts → Add staff account** in the app, or in bulk by
creating `data/lecturers.csv`:

```csv
email,full_name,position,course_codes
a.nguyen@griffith.edu.au,Dr Anh Nguyen,Course Convenor,1811ICT 1001ICT 2801ICT
m.patel@griffith.edu.au,Dr Meera Patel,Course Convenor,7905ICT 3809ICT
```

then running `npm run bootstrap` again. Each lecturer receives a password-reset
link, so nobody — including the administrator — knows their password.

---

## Deploying

Pushing to `main` builds and publishes automatically via GitHub Actions.

**One-time setup:**

1. **Settings → Pages → Source: GitHub Actions**
2. **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Both are repository *variables*, not secrets — they are public by design and
need to be readable at build time. With them unset the deployed site falls back
to sample data, which is useful for a first look.

---

## Project layout

```
src/
  types/              Domain model — the contract between UI and backend
  data/courses.ts     187 Griffith ICT courses
  lib/
    provider/
      types.ts        DataProvider interface — the AWS migration seam
      supabase/       Production backend
      mock/           In-browser fallback
    auth/             Session context
    utils/            Formatting, CSV, Griffith email rules
  components/
    ui/               Buttons, inputs, cards, modals
    layout/           App shell and navigation
  pages/
    auth/             Sign in, register
    student/          The whole student experience — one page
    staff/            Applicant review, allocations, coverage
    admin/            Accounts, courses, rounds

supabase/
  migrations/         Schema, functions, RLS policies
  seed/               Course catalogue

scripts/bootstrap.ts  Creates the administrator and opening round
docs/ARCHITECTURE.md  Diagrams and design rationale
```

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Typecheck and build for production |
| `npm run typecheck` | Typecheck app and scripts |
| `npm run preview` | Serve the production build locally |
| `npm run bootstrap` | Create administrator + opening round |

---

## Security posture

- Authorisation is enforced by **PostgreSQL Row Level Security**, not by the
  interface. Modifying the frontend gains an attacker nothing.
- Registration is restricted to `@griffith.edu.au` and `@griffithuni.edu.au` by
  a database constraint and a signup trigger.
- Role is derived server-side from the email domain — a student cannot register
  as staff.
- Users cannot change their own role or account status; a trigger blocks it.
- The published site contains **no personal data** — only application code.
- No credentials are committed. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#5-security-model).

---

## Status

Version 1 — working prototype for review by the School of ICT.

Known limitations (email notification, single sign-on, live course feed, file
uploads) are documented in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#8-current-limitations).
