/**
 * Bootstrap the Casual Academic Management System backend.
 *
 * Creates the super administrator account, opens an initial recruitment round,
 * and optionally provisions lecturer accounts from a CSV file.
 *
 * Credentials are read from the environment (.env.local, which is untracked).
 * Nothing sensitive is written to disk or committed.
 *
 *   npm run bootstrap
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY — a privileged key that bypasses row
 * level security. Keep it out of the browser and out of git; it belongs only
 * in .env.local and in your deployment secrets.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// --- Load .env.local without adding a dependency ----------------------------
function loadEnv(file: string) {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) return
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnv('.env.local')
loadEnv('.env')

const URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD
const ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'Super Administrator'

function fail(msg: string): never {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

if (!URL) fail('VITE_SUPABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
if (!SERVICE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY is not set (Supabase dashboard → Project Settings → API).')
if (!ADMIN_EMAIL) fail('SUPER_ADMIN_EMAIL is not set.')
if (!ADMIN_PASSWORD) fail('SUPER_ADMIN_PASSWORD is not set.')
if (ADMIN_PASSWORD.length < 10) fail('SUPER_ADMIN_PASSWORD must be at least 10 characters.')

const db = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureSuperAdmin() {
  console.log(`  → Provisioning super administrator: ${ADMIN_EMAIL}`)

  // Is the account already there?
  const { data: existing } = await db
    .from('profiles')
    .select('id, role')
    .eq('email', ADMIN_EMAIL!)
    .maybeSingle()

  let userId = existing?.id as string | undefined

  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: ADMIN_EMAIL!,
      password: ADMIN_PASSWORD!,
      email_confirm: true, // no confirmation email needed for the seeded owner
      user_metadata: { full_name: ADMIN_NAME },
    })
    if (error) fail(`Could not create the account: ${error.message}`)
    userId = data.user!.id
    console.log('    created auth user')
  } else {
    // Re-assert the password so re-running the script recovers a lost login.
    const { error } = await db.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD! })
    if (error) fail(`Could not update the password: ${error.message}`)
    console.log('    account already existed — password reset to the configured value')
  }

  // The signup trigger assigns 'lecturer' to @griffith.edu.au addresses.
  // Elevate this one account to 'admin'.
  const { error: roleErr } = await db
    .from('profiles')
    .update({ role: 'admin', full_name: ADMIN_NAME, position: 'Super Administrator — School of ICT' })
    .eq('id', userId)
  if (roleErr) fail(`Could not elevate to admin: ${roleErr.message}`)

  console.log('    role set to admin ✓')
  return userId
}

async function ensureCourses() {
  const { count } = await db.from('courses').select('code', { count: 'exact', head: true })
  if ((count ?? 0) > 0) {
    console.log(`  → Course catalogue already loaded (${count} courses)`)
    return
  }
  fail('The course catalogue is empty. Run supabase/seed/0001_courses.sql first (see README).')
}

async function ensureRound() {
  const { data: active } = await db
    .from('recruitment_rounds')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle()

  if (active) {
    console.log(`  → Active recruitment round: ${active.name}`)
    return
  }

  // Default to the next trimester that has not started yet.
  const now = new Date()
  const year = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear()
  const trimester = now.getMonth() >= 9 || now.getMonth() < 2 ? 1 : now.getMonth() < 6 ? 2 : 3
  const opens = new Date()
  const closes = new Date(Date.now() + 42 * 86400000)

  const { error } = await db.from('recruitment_rounds').insert({
    name: `Trimester ${trimester}, ${year}`,
    year,
    trimester,
    opens_at: opens.toISOString(),
    closes_at: closes.toISOString(),
    is_active: true,
  })
  if (error) fail(`Could not create a recruitment round: ${error.message}`)
  console.log(`  → Opened recruitment round: Trimester ${trimester}, ${year} (closes ${closes.toDateString()})`)
}

/**
 * Optional: bulk-provision lecturers from data/lecturers.csv
 *   email,full_name,position,course_codes(space separated)
 */
async function provisionLecturers() {
  const path = resolve(process.cwd(), 'data/lecturers.csv')
  if (!existsSync(path)) return

  const lines = readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
  const rows = lines.slice(1) // skip header
  console.log(`  → Provisioning ${rows.length} lecturer account(s) from data/lecturers.csv`)

  for (const line of rows) {
    const [email, fullName, position, courseCodes] = line.split(',').map((s) => s?.trim() ?? '')
    if (!email) continue

    const { data: existing } = await db.from('profiles').select('id').eq('email', email).maybeSingle()
    let id = existing?.id as string | undefined

    if (!id) {
      // A random initial password — the lecturer sets their own via the
      // password-reset email, so it is never known to anyone.
      const temp = crypto.randomUUID() + 'Aa1!'
      const { data, error } = await db.auth.admin.createUser({
        email, password: temp, email_confirm: true, user_metadata: { full_name: fullName },
      })
      if (error) { console.warn(`    ! ${email}: ${error.message}`); continue }
      id = data.user!.id
      await db.auth.admin.generateLink({ type: 'recovery', email })
      console.log(`    ${email} — created, password-reset link issued`)
    }

    await db.from('profiles').update({ full_name: fullName, position, role: 'lecturer' }).eq('id', id)

    if (courseCodes) {
      const codes = courseCodes.split(/\s+/).filter(Boolean)
      await db.from('course_lecturers').upsert(
        codes.map((c) => ({ course_code: c, lecturer_id: id!, is_convenor: true })),
        { onConflict: 'course_code,lecturer_id' },
      )
    }
  }
}

async function main() {
  console.log('\n  Casual Academic Management System — backend bootstrap')
  console.log(`  Project: ${URL}\n`)
  await ensureCourses()
  await ensureSuperAdmin()
  await ensureRound()
  await provisionLecturers()
  console.log('\n  ✓ Bootstrap complete. Sign in at the app with your administrator email.\n')
}

main().catch((e) => fail(e?.message ?? String(e)))
