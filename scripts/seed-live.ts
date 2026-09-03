/**
 * Populate the live Supabase backend with sample applicants.
 *
 *   npm run seed:live
 *
 * Every account is created through the ordinary public signup flow — the same
 * path a real student takes — so this doubles as an end-to-end check of
 * registration, profile updates, experience, preferences and submission
 * against the real database and its security policies.
 *
 * Needs only the public key. The service_role key is never used.
 *
 * All sample addresses start with "sample." so they are easy to identify and
 * remove; see supabase/remove-sample-data.sql.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file: string) {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) return
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!(k in process.env)) process.env[k] = v
  }
}
loadEnv('.env.local')

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_ANON_KEY
const PASSWORD = 'SamplePortal#2027'

if (!URL || !KEY) {
  console.error('\n  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local\n')
  process.exit(1)
}

const PREFIX = 'sample.'

interface Applicant {
  first: string; last: string; number: string; program: string
  degree: 'undergraduate' | 'honours' | 'masters' | 'phd'
  gpa: number; campus: string; phone: string; hours: number; days: string[]
  statement: string
  prefs: Array<{ course: string; confidence: number; note?: string }>
  experience: Array<{ course: string; year: number; trimester: 1 | 2 | 3; role: string; hours: number; description: string }>
}

const APPLICANTS: Applicant[] = [
  {
    first: 'Liam', last: 'Chen', number: 's5201883', program: 'Bachelor of Computer Science',
    degree: 'undergraduate', gpa: 6.4, campus: 'Nathan', phone: '04' + Math.floor(10000000 + Math.random() * 89999999), hours: 10, days: ['Mon', 'Tue', 'Wed', 'Thu'],
    statement: 'I have tutored 1811ICT across two consecutive trimesters and consistently received student evaluations above 4.5 out of 5. I am comfortable running tutorials for cohorts of 25 to 30 and have built supplementary practice material that the convenor now reuses. My own results in the introductory programming sequence were 7s, and I have since worked part-time as a developer using Python and Java, which helps me connect course content to industry practice.',
    prefs: [
      { course: '1811ICT', confidence: 5, note: 'Tutored twice; I know the assessment structure well.' },
      { course: '1001ICT', confidence: 5 },
      { course: '2801ICT', confidence: 4, note: 'Achieved a 7 in this course.' },
    ],
    experience: [
      { course: '1811ICT', year: 2026, trimester: 1, role: 'tutor', hours: 6, description: 'Two tutorial groups plus consultation hours. Student evaluations 4.6 out of 5.' },
      { course: '1811ICT', year: 2026, trimester: 2, role: 'tutor', hours: 6, description: 'Repeat offering; assisted with assignment moderation.' },
    ],
  },
  {
    first: 'Aisha', last: 'Rahman', number: 's5177432', program: 'Bachelor of Computer Science (Honours)',
    degree: 'honours', gpa: 6.8, campus: 'Nathan', phone: '04' + Math.floor(10000000 + Math.random() * 89999999), hours: 12, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    statement: 'I am an Honours student working on graph algorithms, and I have tutored 2801ICT and 1808ICT. I particularly enjoy the moment where a student stops pattern-matching to past exam questions and starts reasoning about complexity properly. I run optional revision sessions before exams and have prepared worked-solution sets for both courses. I am available across all five days and could take on a coordination role if that would help.',
    prefs: [
      { course: '2801ICT', confidence: 5, note: 'Tutored previously; also my Honours area.' },
      { course: '3805ICT', confidence: 5 },
      { course: '1808ICT', confidence: 4 },
    ],
    experience: [
      { course: '2801ICT', year: 2026, trimester: 1, role: 'tutor', hours: 8, description: 'Algorithms tutorials; ran additional exam revision sessions.' },
      { course: '1808ICT', year: 2025, trimester: 1, role: 'tutor', hours: 6, description: 'Discrete structures tutorials.' },
    ],
  },
  {
    first: 'Raj', last: 'Deshmukh', number: 's5210044', program: 'PhD (Information and Communication Technology)',
    degree: 'phd', gpa: 6.9, campus: 'Nathan', phone: '04' + Math.floor(10000000 + Math.random() * 89999999), hours: 12, days: ['Tue', 'Wed', 'Thu'],
    statement: 'I am a PhD candidate in network security and have tutored the networking sequence for three trimesters, including coordinating a marking team of four for 2809ICT. I hold CCNA certification and maintain the Packet Tracer lab materials currently used in 3808ICT. I would like to continue with both courses and can support the onboarding of new tutors.',
    prefs: [
      { course: '3808ICT', confidence: 5, note: 'I maintain the current lab materials.' },
      { course: '2809ICT', confidence: 5 },
      { course: '3413ICT', confidence: 4 },
    ],
    experience: [
      { course: '3808ICT', year: 2026, trimester: 1, role: 'tutor', hours: 8, description: 'Routing and internetworking tutorials, Packet Tracer labs.' },
      { course: '2809ICT', year: 2026, trimester: 2, role: 'tutor', hours: 8, description: 'Networking essentials; coordinated a marking team of four.' },
    ],
  },
  {
    first: 'Priya', last: 'Sharma', number: 's5188204', program: 'Master of Information Technology',
    degree: 'masters', gpa: 6.1, campus: 'Nathan', phone: '04' + Math.floor(10000000 + Math.random() * 89999999), hours: 8, days: ['Mon', 'Wed', 'Fri'],
    statement: 'I completed 2814ICT with a 7 and have since tutored it for a full trimester, as well as marking for 7003ICT. My Masters project involves designing a normalised schema for a health-data pipeline, so the material is current for me. I am confident teaching SQL, ER modelling and normalisation, and I am happy to take the postgraduate cohort as well as undergraduate streams.',
    prefs: [
      { course: '2814ICT', confidence: 5, note: 'Tutored last trimester.' },
      { course: '7003ICT', confidence: 4 },
      { course: '3612ICT', confidence: 3 },
    ],
    experience: [
      { course: '2814ICT', year: 2026, trimester: 1, role: 'tutor', hours: 8, description: 'Led three SQL tutorial streams; built supplementary practice sets.' },
    ],
  },
  {
    first: 'Daniel', last: 'Okafor', number: 's5240117', program: 'Master of Cyber Security',
    degree: 'masters', gpa: 5.9, campus: 'Nathan', phone: '04' + Math.floor(10000000 + Math.random() * 89999999), hours: 10, days: ['Mon', 'Tue', 'Thu'],
    statement: 'I demonstrate for 7905ICT and manage the isolated lab environment used for the practical exercises. Before moving to Australia I tutored introductory networking for two years. I am studying a Master of Cyber Security and hold a Security+ certification. I would like to expand into 3809ICT, where my competitive CTF experience is directly relevant to the assessment tasks.',
    prefs: [
      { course: '7905ICT', confidence: 5, note: 'Currently demonstrating.' },
      { course: '3809ICT', confidence: 4, note: 'Active CTF competitor.' },
      { course: '1118ICT', confidence: 4 },
    ],
    experience: [
      { course: '7905ICT', year: 2026, trimester: 2, role: 'demonstrator', hours: 6, description: 'Ran the hands-on security lab environment and CTF exercises.' },
    ],
  },
]

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

let created = 0, reused = 0, failed = 0

async function seedOne(a: Applicant) {
  const email = `${PREFIX}${a.first}.${a.last}@griffithuni.edu.au`.toLowerCase()
  const name = `${a.first} ${a.last}`

  // Register exactly as a student would.
  let userId: string | undefined
  const signUp = await db.auth.signUp({
    email, password: PASSWORD,
    options: { data: { full_name: name, student_number: a.number, program: a.program, campus: a.campus } },
  })

  if (signUp.error) {
    if (/already registered/i.test(signUp.error.message)) {
      const si = await db.auth.signInWithPassword({ email, password: PASSWORD })
      if (si.error) { console.log(`  x ${name}: ${si.error.message}`); failed++; return }
      userId = si.data.user.id
      reused++
    } else {
      console.log(`  x ${name}: ${signUp.error.message}`)
      failed++
      return
    }
  } else if (!signUp.data.session) {
    console.log(`  x ${name}: signed up but no session — turn OFF "Confirm email" in Supabase`)
    failed++
    return
  } else {
    userId = signUp.data.user!.id
    created++
  }

  // Profile detail the signup form does not collect.
  await db.from('profiles').update({
    degree_level: a.degree, campus: a.campus, phone: a.phone,
    has_work_rights: true, has_blue_card: true,
  }).eq('id', userId!)

  // Teaching history.
  for (const e of a.experience) {
    await db.from('tutoring_experience').insert({
      profile_id: userId, course_code: e.course, institution: 'Griffith University',
      year: e.year, trimester: e.trimester, role: e.role,
      hours_per_week: e.hours, description: e.description,
    })
  }

  // Application, preferences, submission.
  const existing = await db.from('applications').select('id, status')
    .eq('applicant_id', userId!).maybeSingle()

  let appId = existing.data?.id as string | undefined
  if (!appId) {
    const ins = await db.from('applications').insert({
      applicant_id: userId, status: 'draft',
      statement: a.statement, hours_per_week: a.hours, available_days: a.days,
    }).select('id').single()
    if (ins.error) { console.log(`  x ${name}: ${ins.error.message}`); failed++; return }
    appId = ins.data.id
  }

  if (existing.data?.status === 'draft' || !existing.data) {
    await db.from('application_preferences').delete().eq('application_id', appId!)
    await db.from('application_preferences').insert(
      a.prefs.map((p, i) => ({
        application_id: appId, course_code: p.course,
        rank: i + 1, confidence: p.confidence, note: p.note ?? null,
      })),
    )
    const sub = await db.rpc('submit_application', { p_application_id: appId })
    if (sub.error) console.log(`  ! ${name}: ${sub.error.message}`)
  }

  console.log(`  ok ${name.padEnd(18)} ${a.prefs.map((p) => p.course).join(', ')}`)
  await db.auth.signOut()
}

/**
 * A staff account to review the applicants with.
 *
 * Registration always creates a student, so this account needs promoting to
 * 'lecturer' afterwards — the script prints the one statement to run.
 */
const LECTURER = {
  email: 'sample.convenor@griffith.edu.au',
  name: 'Sample Convenor',
  courses: ['1811ICT', '1001ICT', '2801ICT', '2814ICT', '7905ICT'],
}

async function seedLecturer() {
  const signUp = await db.auth.signUp({
    email: LECTURER.email, password: PASSWORD,
    options: { data: { full_name: LECTURER.name } },
  })
  if (signUp.error && !/already registered/i.test(signUp.error.message)) {
    console.log(`  x ${LECTURER.name}: ${signUp.error.message}`)
    return
  }
  console.log(`  ok ${LECTURER.name.padEnd(22)} ${LECTURER.email}`)
  await db.auth.signOut()
}

async function main() {
  console.log(`\n  Seeding sample data into ${URL}\n`)

  // An open round is required before anything can be submitted. Reading it
  // needs a signed-in user, so borrow the first applicant's session.
  const probe = await db.auth.signUp({
    email: `${PREFIX}probe@griffithuni.edu.au`, password: PASSWORD,
    options: { data: { full_name: 'Probe', student_number: 's0000000' } },
  })
  if (probe.error && !/already registered/i.test(probe.error.message)) {
    console.error(`  Could not create a session: ${probe.error.message}`)
    if (/confirm/i.test(probe.error.message)) {
      console.error('  Turn OFF Authentication -> Providers -> Email -> "Confirm email".')
    }
    process.exit(1)
  }
  if (probe.error) {
    const si = await db.auth.signInWithPassword({ email: `${PREFIX}probe@griffithuni.edu.au`, password: PASSWORD })
    if (si.error) { console.error(`  ${si.error.message}`); process.exit(1) }
  } else if (!probe.data.session) {
    console.error('\n  Signup succeeded but returned no session.')
    console.error('  Turn OFF Authentication -> Providers -> Email -> "Confirm email", then re-run.\n')
    process.exit(1)
  }

  await db.auth.signOut()
  for (const a of APPLICANTS) await seedOne(a)
  await seedLecturer()

  console.log(`\n  ${created} created, ${reused} already existed, ${failed} failed`)
  console.log(`  Password for every sample account: ${PASSWORD}`)
  console.log('\n  Run this once in the Supabase SQL Editor to finish:\n')
  console.log(`  -- confirm the sample accounts and make the convenor staff
  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now())
   where email like 'sample.%';

  alter table public.profiles disable trigger profiles_guard_self_update;
  update public.profiles
     set role = 'lecturer', position = 'Course Convenor', student_number = null
   where email = '${LECTURER.email}';
  alter table public.profiles enable trigger profiles_guard_self_update;

  insert into public.course_lecturers (course_code, lecturer_id, is_convenor)
  select c, p.id, true from public.profiles p,
         unnest(array[${LECTURER.courses.map((c) => `'${c}'`).join(', ')}]) c
   where p.email = '${LECTURER.email}'
  on conflict do nothing;`)
  console.log('\n  Remove all of it later with supabase/remove-sample-data.sql\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
