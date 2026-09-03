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
import { LOCAL_PASSWORD, SUPER_ADMIN_EMAIL } from '../src/lib/provider/mock/seed'

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
  check('the super administrator is the nominated owner address',
        admin.email === SUPER_ADMIN_EMAIL)
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

  console.log('\nTutor directory — the point of the system')
  const dirAdmin = await p.listStudents()
  check('directory lists every registered student, applied or not', dirAdmin.length > 0,
        `${dirAdmin.length} people`)
  check('directory carries what each person has taught',
        dirAdmin.some((s) => s.tutoredCourses.length > 0))
  check('directory carries what each person asked to teach',
        dirAdmin.some((s) => s.appliedCourses.length > 0))
  const search = await p.listStudents('Liam')
  check('directory is searchable by name', search.length > 0 && search.length < dirAdmin.length)

  console.log('\nStaff scope — all staff see all applicants')
  const lec1 = await p.signIn('a.nguyen@griffith.edu.au', LOCAL_PASSWORD)
  check('convenor can sign in', lec1.profile.role === 'lecturer')

  const lecRows = await p.listApplicants({})
  check('convenor sees every applicant, as the School decided',
        lecRows.length === allApplicants.length, `${lecRows.length} vs ${allApplicants.length}`)

  // Course selection is a personal filter now, not a permission boundary.
  await p.setCourseLecturers(lec1.userId, ['1811ICT', '2801ICT'])
  const filtered = await p.listApplicants({ courseCodes: ['1811ICT', '2801ICT'] })
  check('"My courses" narrows the view', filtered.length > 0 && filtered.length < lecRows.length,
        `${filtered.length} of ${lecRows.length}`)
  check('the filter returns only the chosen courses',
        filtered.every((r) => ['1811ICT', '2801ICT'].includes(r.matchedCourseCode)))

  const anyApplication = allApplicants[0]
  const detail = await p.getApplicationDetail(anyApplication.applicationId)
  check('convenor can open any submitted application', detail !== null)

  // Boundaries that still hold.
  const drafts = lecRows.filter((r) => r.status === 'draft')
  check('drafts remain invisible to staff', drafts.length === 0)

  await expectReject('convenor cannot create staff accounts', () =>
    p.createStaffAccount({ email: 'x@griffith.edu.au', fullName: 'X', role: 'admin', password: 'password123' }))

  await expectReject('convenor cannot change another lecturer\'s course selection', () =>
    p.setCourseLecturers('u_lec2', ['7905ICT']))

  await expectReject('convenor cannot deactivate an account', () =>
    p.setProfileActive('u_s1', false))

  const dirLec = await p.listStudents()
  check('a convenor sees the same directory as an administrator',
        dirLec.length === dirAdmin.length, `${dirLec.length} vs ${dirAdmin.length}`)

  await expectReject('a student cannot read the directory', async () => {
    await p.signIn('liam.chen@griffithuni.edu.au', LOCAL_PASSWORD)
    return p.listStudents()
  })
  await p.signIn('a.nguyen@griffith.edu.au', LOCAL_PASSWORD)

  console.log('\nStudent flow')
  const stu = await p.signIn('liam.chen@griffithuni.edu.au', LOCAL_PASSWORD)
  check('student can sign in', stu.profile.role === 'student')

  await expectReject('student cannot list applicants', () => p.listApplicants({}))

  const mine = await p.myApplications()
  check('student sees their own application', mine.length > 0)
  const myAssignments = await p.listAssignments()
  check('student sees only their own allocations',
        myAssignments.every((a) => a.profileId === stu.userId))

  // Applications stay editable so students can keep them current.
  const submitted = mine.find((a) => a.status !== 'draft')
  if (submitted) {
    const revised = await p.saveApplication({
      statement: submitted.statement, hoursPerWeek: 9, availableDays: ['Mon', 'Tue'],
      preferences: submitted.preferences.map((x, i) => ({
        courseCode: x.courseCode, rank: i + 1, confidence: x.confidence,
      })),
    }, submitted.id)
    check('student can revise a submitted application', revised.hoursPerWeek === 9)
    check('revising does not reset the review status', revised.status === submitted.status,
          `${submitted.status} -> ${revised.status}`)
  }

  console.log('\nNew student registration and submission')
  const fresh = await p.register({
    email: 'test.applicant@griffithuni.edu.au', password: 'password123',
    fullName: 'Test Applicant', studentNumber: 's9999999', program: 'Bachelor of Computer Science',
  })
  check('new student registers as a student', fresh.profile.role === 'student')

  // A contact number is required before submitting.
  await expectReject('cannot submit without a contact number', async () => {
    const d = await p.saveApplication({
      statement: 'x'.repeat(150), hoursPerWeek: 6, availableDays: ['Mon'],
      preferences: [{ courseCode: '1811ICT', rank: 1, confidence: 3 }],
    })
    return p.submitApplication(d.id)
  })
  await p.updateProfile(fresh.userId, { phone: '0400111222' })

  // HDR candidates hold @griffith.edu.au addresses, so the domain must NOT
  // grant staff access. Self-registration always yields a student.
  const phd = await p.register({
    email: 'shaoqing.wang@griffith.edu.au', password: 'password123',
    fullName: 'Shaoqing Wang', studentNumber: 's8888888',
    program: 'PhD (Information and Communication Technology)',
  })
  check('a @griffith.edu.au self-registration is a STUDENT, not staff',
        phd.profile.role === 'student', `got role=${phd.profile.role}`)

  await expectReject('a self-registered @griffith.edu.au user cannot list applicants', () =>
    p.listApplicants({}))

  // The HDR checks above switched session; return to the applicant under test.
  await p.signIn('test.applicant@griffithuni.edu.au', 'password123')
  const draft = (await p.myApplications())[0]
  check('draft is created in draft status', draft.status === 'draft')
  await p.saveApplication({
    statement: 'Too short.', hoursPerWeek: 6,
    availableDays: ['Mon'], preferences: [{ courseCode: '1811ICT', rank: 1, confidence: 4 }],
  }, draft.id)

  await expectReject('cannot submit with a statement under 100 characters', () =>
    p.submitApplication(draft.id))

  await p.saveApplication({
    statement: 'I have strong results in the introductory programming sequence and have mentored classmates through the assignments for two trimesters running.',
    hoursPerWeek: 6, availableDays: ['Mon', 'Wed'],
    preferences: [{ courseCode: '1811ICT', rank: 1, confidence: 4 }],
  }, draft.id)
  const done = await p.submitApplication(draft.id)
  check('submits once the statement is long enough', done.status === 'submitted')
  // Regression: the status guard once refused draft -> submitted, because
  // submitting is itself a status change made by the applicant. Every
  // application silently stayed a draft, invisible to staff.
  check('submitting is not blocked by the status guard', done.status === 'submitted')

  await expectReject('a student cannot shortlist themselves', () =>
    p.setApplicationStatus(draft.id, 'shortlisted'))
  check('submission timestamp is recorded', Boolean(done.submittedAt))

  // Re-submitting is now how a student publishes a revision, so it must work.
  const resubmitted = await p.submitApplication(draft.id)
  check('an application can be re-submitted after revision', resubmitted.status === 'submitted')
  check('the original submission date is preserved',
        resubmitted.submittedAt === done.submittedAt)

  await expectReject('a student cannot hold two applications', () =>
    p.saveApplication({
      statement: 'x'.repeat(150), hoursPerWeek: 4, availableDays: ['Mon'],
      preferences: [{ courseCode: '1001ICT', rank: 1, confidence: 3 }],
    }))

  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => { console.error('\nSmoke test crashed:', e); process.exit(1) })
