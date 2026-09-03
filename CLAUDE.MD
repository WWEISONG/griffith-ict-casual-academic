# Casual Academic (Tutor) Management System — School of ICT, Griffith University

> This file records what the system **is**, as built. It began as a
> requirements brief and has been updated to match the implementation.
> Owner: Wei Song (w.song@griffith.edu.au), School of ICT.

---

## Purpose

Each trimester the School of ICT recruits casual academics — tutors,
demonstrators and markers — across 187 courses. That process currently runs on
spreadsheets, individual emails and convenor memory. This system replaces it
with one record of who applied, for what, who has taught it before, and who was
selected.

**In scope:** recruitment rounds, student applications, convenor review and
selection, tutor allocation, School-wide reporting.

**Out of scope, deliberately:** employment contracts, pay rates, timesheets,
onboarding. These are governed by the Academic Staff Enterprise Agreement and
administered by Griffith HR. The system records that an offer was accepted, then
hands off. This keeps V1 free of HR-system integration.

---

## Stage 1 requirements — status

### Super administrator
- Wei Song, `w.song@griffith.edu.au`, created by `npm run bootstrap`.
- Password supplied via `.env.local` (git-ignored). **Not committed** — the
  repository is public, so a password in source would be world-readable and
  permanent in git history.
- Sees all applicants and every course they applied for.
- Sees each applicant's prior tutoring, and current allocations with course
  code, title and trimester.
- Real Griffith ICT course catalogue — 187 courses, sourced from Griffith's
  official course reading-list directory, September 2026.

### Student applicants
- Register with a Griffith email — either `@griffithuni.edu.au` or
  `@griffith.edu.au`, since HDR candidates use the latter. Enforced by database
  constraint **and** signup trigger, not just form validation.
- Self-registration always creates a **student**, regardless of domain.
- Submit an application containing name, email, prior tutoring experience,
  ranked course preferences, and a supporting statement.
- Save as draft and return later.
- **One page, no navigation.** Students have exactly one task; splitting it
  across screens added navigation without adding value.

### Course convenors
- See applicants for their courses only — enforced in the database.
- Full application, contact details, teaching history, current workload.
- One-click email with the message pre-written; contact is logged so two
  convenors do not chase the same candidate unknowingly.
- Bulk shortlist / reject.
- Accounts created by the administrator (V1, as specified) — never
  self-registered, because a staff address is indistinguishable from an HDR
  candidate's. Bulk creation from CSV is supported for a future School-wide
  rollout.

---

## Architecture

Full diagrams: **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**

```
Browser (React SPA on GitHub Pages)
    |  all data access through one interface: DataProvider
    v
Supabase - managed PostgreSQL
    |-- GoTrue auth (email + password, JWT)
    |-- PostgREST (auto REST API)
    +-- Row Level Security  <- the actual security boundary
```

GitHub Pages serves only static files, so the app is a static bundle and all
state lives in the managed backend, reached directly over HTTPS. No server of
our own to operate.

### The migration seam

Everything the UI does goes through `DataProvider`
(`src/lib/provider/types.ts`). No component imports Supabase directly. Moving to
AWS means writing one new class — `AwsProvider` — and changing one line. The
RLS policies are plain PostgreSQL and carry across to RDS unchanged.

---

## Key decisions and why

| Decision | Reasoning |
|---|---|
| Static frontend + managed PostgreSQL | GitHub Pages cannot run a server. This is the only architecture that satisfies "GitHub Pages" and "real backend" simultaneously. |
| Supabase over Firebase | Supabase is stock PostgreSQL, so the schema and security policies migrate to Amazon RDS unchanged. Firebase would be a rewrite. |
| Authorisation in the database, not the client | The frontend is public code. Anyone can modify it. Rules enforced in PostgreSQL hold regardless. |
| Self-registration always creates a student | A Griffith staff domain does not identify staff: HDR candidates hold `@griffith.edu.au` addresses too. So the domain cannot distinguish a professor from a PhD student who wants to tutor. Anyone who registers is a student; staff accounts are created by the administrator. Role is never read from client-supplied data. |
| Course code as primary key | `2801ICT` is already a stable, universally understood Griffith identifier. |
| Experience separate from applications | A teaching record belongs to the person and persists across trimesters. |
| Allocations separate from applications | An accepted application is a decision; an allocation is an operational fact with hours and a trimester. Conflating them makes multi-course tutors unrepresentable. |
| Contact happens over email, not in-app | Convenors and candidates already live in email, and a message from a convenor's own address carries more weight than a system notification. The system pre-writes the message and opens their mail client; it does not try to become an inbox. This also avoids needing a sending domain approved by Griffith IT. |
| `contact_log` table | Because contact happens outside the system, a log is what stops two convenors approaching the same candidate unknowingly. |
| Hash routing | Static hosting cannot rewrite unknown paths to `index.html`; deep links would 404 on refresh. Switch to path routing after the AWS move. |
| T1 / T2 / T3 shorthand | Griffith runs trimesters. Constrained to `1|2|3` in the schema so "Semester 1" cannot appear in the data later. |

---

## Conventions

- **Trimesters**, never semesters. Short form `T1` / `T2` / `T3`; full form
  "Trimester 1, 2026" for headings.
- **GPA on Griffith's 0-7 scale.**
- **Student numbers** as `s` + 7 digits — HDR candidates have these too.
- **Both Griffith domains** are valid for applicants; neither implies a role.
- **Campuses:** Nathan, Gold Coast, Mount Gravatt, South Bank, Logan, Online.
- **Australian English** throughout the interface.
- No Supabase types outside `src/lib/provider/supabase/`.

---

## Repository and deployment

- **Repository:** public, on GitHub. Public because GitHub Pages requires a
  public repository on a free account. It contains **no personal data and no
  credentials** — only application code.
- **Deployment:** push to `main` -> GitHub Actions typechecks, builds, publishes
  to Pages.
- **Privacy:** the published site is publicly reachable but shows nothing
  without a login. All student data sits behind authentication in the database.
  Site is marked `noindex, nofollow`.
- **When migrating to AWS**, the repository can be made private and the
  application placed behind the Griffith network or an identity-aware proxy.

---

## Not yet built

Stated plainly — an honest prototype is more useful than an oversold one.

1. **Griffith single sign-on.** Needs the application registered as an identity
   provider client by Griffith IT.
2. **Live course catalogue feed.** Currently a September 2026 snapshot.
3. **File uploads.** CVs are linked, not stored.
4. **Automatic convenor assignment** from the timetabling system.
5. **GPA verification** against student records — currently self-reported.

Items 1, 2 and 4 become straightforward once the School has an integration
agreement with Griffith IT, which is a reasonable thing to seek on the strength
of a working prototype.

---

## Working on this project

- `npm run dev` — runs immediately against in-browser sample data, no backend
  needed.
- `npm run typecheck` — must pass before pushing; CI enforces it.
- Setup, deployment and commands: **[`README.md`](README.md)**.
- Never commit `.env.local`, the service-role key, or any password.
