/**
 * Smoke test for the LocalProvider.
 *
 * Exercises the flows that matter most, and in particular checks that the
 * authorisation rules mirrored from the database actually hold: a convenor
 * must not be able to see applicants for courses they do not convene.
 *
 *   npx tsx scripts/smoke.ts
 */
import { LocalProvider } from '../src/lib/provider/mock/LocalProvider'
import { LOCAL_PASSWORD } from '../src/lib/provider/mock/seed'

// Minimal localStorage shim so the provider runs outside a browser.
const store = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
}

let passed = 0
let failed = 0

function check(label: string, condition: boolean, detail = '') {
  if (condition) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`) }
}

async function expectReject(label: string, fn: () => Promise<unknown>) {
  try { await fn(); check(label, false, 'expected it to be refused, but it succeeded') }
  catch { check(label, true) }
}

async function main() {
  const p = new LocalProvider()
  console.log('\nAuthentication')

  await expectReject('rejects a non-Griffith email at registration', () =>
    p.register({ email: 'someone@gmail.com', password: 'password123', fullName: 'Test User' }))

  await expectReject('rejects a bad student number format', () =>
    p.register({ email: 'new.student@griffithuni.edu.au', password: 'password123',
                 fullName: 'Test User', studentNumber: '12345' }))

  await expectReject('rejects a wrong password', () =>
    p.signIn('w.song@griffith.edu.au', 'not-the-password'))

  const admin = await p.signIn('w.song@griffith.edu.au', LOCAL_PASSWORD)
  check('super administrator can sign in', admin.profile.role === 'admin', `got role=${admin.profile.role}`)
  check('administrator identity is correct', admin.email === 'w.song@griffith.edu.au')

  console.log('\nAdministrator scope')
  const allApplicants = await p.listApplicants({})
  check('administrator sees applicants across the School', allApplicants.length > 0,
        `${allApplicants.length} rows`)
  const stats = await p.getDashboardStats()
  check('dashboard reports applicants', stats.totalApplicants > 0, `${stats.totalApplicants}`)
  const demand = await p.getCourseDemand()
  check('course demand is computed', demand.length > 0, `${demand.length} courses with demand`)
  const courses = await p.listCourses()
  check('full ICT catalogue is loaded', courses.length === 187, `${courses.length} courses`)

  console.log('\nConvenor scope — the security-critical case')
  const lec1 = await p.signIn('a.nguyen@griffith.edu.au', LOCAL_PASSWORD)
  check('convenor can sign in', lec1.profile.role === 'lecturer')

  const myCourses = await p.coursesForLecturer(lec1.userId)
  const myCodes = new Set(myCourses.map((c) => c.code))
  const lecRows = await p.listApplicants({})
  check('convenor sees some applicants', lecRows.length > 0, `${lecRows.length} rows`)
  check('convenor sees ONLY their own courses',
        lecRows.every((r) => myCodes.has(r.matchedCourseCode)),
        `leaked: ${lecRows.filter((r) => !myCodes.has(r.matchedCourseCode)).map((r) => r.matchedCourseCode).join(', ')}`)
  check('convenor sees fewer rows than the administrator', lecRows.length < allApplicants.length,
        `${lecRows.length} vs ${allApplicants.length}`)

  // A convenor for cyber security courses must not reach a programming applicant.
  const lec2 = await p.signIn('m.patel@griffith.edu.au', LOCAL_PASSWORD)
  const lec2Rows = await p.listApplicants({})
  const lec1Ids = new Set(lecRows.map((r) => r.applicationId))
  const lec2Only = lec2Rows.filter((r) => !lec1Ids.has(r.applicationId))
  check('a second convenor sees a different applicant set', lec2Only.length > 0)

  const foreign = allApplicants.find((r) => !lec2Rows.some((x) => x.applicationId === r.applicationId))
  if (foreign) {
    await expectReject('convenor cannot open an application outside their courses', () =>
      p.getApplicationDetail(foreign.applicationId))
  }

  await expectReject('convenor cannot allocate to a course they do not convene', () =>
    p.createAssignment({ profileId: 'u_s1', courseCode: '3808ICT', year: 2027, trimester: 1,
                         role: 'tutor', hoursPerWeek: 6, status: 'proposed' }))

  await expectReject('convenor cannot create staff accounts', () =>
    p.createStaffAccount({ email: 'x@griffith.edu.au', fullName: 'X', role: 'admin', password: 'password123' }))

  console.log('\nStudent flow')
  const stu = await p.signIn('liam.chen@griffithuni.edu.au', LOCAL_PASSWORD)
  check('student can sign in', stu.profile.role === 'student')

  await expectReject('student cannot list applicants', () => p.listApplicants({}))

  const mine = await p.myApplications()
  check('student sees their own application', mine.length > 0)
  const myAssignments = await p.listAssignments()
  check('student sees only their own allocations',
        myAssignments.every((a) => a.profileId === stu.userId))

  const submitted = mine.find((a) => a.status !== 'draft')
  if (submitted) {
    await expectReject('student cannot edit a submitted application', () =>
      p.saveApplication({ roundId: submitted.roundId, statement: 'x'.repeat(150),
                          hoursPerWeek: 4, availableDays: ['Mon'], preferences: [] }, submitted.id))
  }

  console.log('\nNew student registration and submission')
  const fresh = await p.register({
    email: 'test.applicant@griffithuni.edu.au', password: 'password123',
    fullName: 'Test Applicant', studentNumber: 's9999999', program: 'Bachelor of Computer Science',
  })
  check('new student registers as a student', fresh.profile.role === 'student')

  const round = await p.getActiveRound()
  const draft = await p.saveApplication({
    roundId: round!.id, statement: 'Too short.', hoursPerWeek: 6,
    availableDays: ['Mon'], preferences: [{ courseCode: '1811ICT', rank: 1, confidence: 4 }],
  })
  check('draft is created in draft status', draft.status === 'draft')

  await expectReject('cannot submit with a statement under 100 characters', () =>
    p.submitApplication(draft.id))

  await p.saveApplication({
    roundId: round!.id,
    statement: 'I have strong results in the introductory programming sequence and have mentored classmates through the assignments for two trimesters running.',
    hoursPerWeek: 6, availableDays: ['Mon', 'Wed'],
    preferences: [{ courseCode: '1811ICT', rank: 1, confidence: 4 }],
  }, draft.id)
  const done = await p.submitApplication(draft.id)
  check('submits once the statement is long enough', done.status === 'submitted')
  check('submission timestamp is recorded', Boolean(done.submittedAt))

  await expectReject('cannot submit the same application twice', () => p.submitApplication(draft.id))

  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => { console.error('\nSmoke test crashed:', e); process.exit(1) })
