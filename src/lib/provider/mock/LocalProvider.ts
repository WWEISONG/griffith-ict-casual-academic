// ---------------------------------------------------------------------------
// LocalProvider — runs the whole application in the browser.
//
// Active only when no Supabase project is configured. It lets the system be
// developed, reviewed and presented without a network dependency, and it is
// what the public GitHub Pages build falls back to. State persists in
// localStorage so a session survives a page reload.
//
// It implements exactly the same DataProvider contract as SupabaseProvider,
// including the same authorisation rules, so behaviour matches the real
// backend rather than merely resembling it.
// ---------------------------------------------------------------------------
import type {
  Application, ApplicationDetail, ApplicationNote, ApplicationStatus, ApplicantRow,
  Assignment, ContactLogEntry, Course, CourseLecturer, DashboardStats, Profile,
  RecruitmentRound, Role, TutoringExperience,
} from '@/types'
import type {
  ApplicantFilter, ApplicationDraft, AuthSession, DataProvider, RegisterInput,
} from '../types'
import { ICT_COURSES, COURSE_BY_CODE } from '@/data/courses'
import { isGriffithEmail, uid, toCsv } from '@/lib/utils'
import {
  LOCAL_PASSWORD, SUPER_ADMIN_EMAIL, SEED_APPLICATIONS, SEED_ASSIGNMENTS, SEED_CONTACT_LOG,
  SEED_COURSE_LECTURERS, SEED_EXPERIENCE, SEED_NOTES, SEED_PROFILES, SEED_ROUNDS,
} from './seed'

const STORAGE_KEY = 'gu-ict-cams:v1'
const SESSION_KEY = 'gu-ict-cams:session'

interface Db {
  profiles: Profile[]
  passwords: Record<string, string>
  rounds: RecruitmentRound[]
  applications: Application[]
  experience: TutoringExperience[]
  assignments: Assignment[]
  notes: ApplicationNote[]
  contactLog: ContactLogEntry[]
  courseLecturers: CourseLecturer[]
}

function freshDb(): Db {
  const passwords: Record<string, string> = {}
  for (const p of SEED_PROFILES) passwords[p.email.toLowerCase()] = LOCAL_PASSWORD
  return {
    profiles: structuredClone(SEED_PROFILES),
    passwords,
    rounds: structuredClone(SEED_ROUNDS),
    applications: structuredClone(SEED_APPLICATIONS),
    experience: structuredClone(SEED_EXPERIENCE),
    assignments: structuredClone(SEED_ASSIGNMENTS),
    notes: structuredClone(SEED_NOTES),
    contactLog: structuredClone(SEED_CONTACT_LOG),
    courseLecturers: structuredClone(SEED_COURSE_LECTURERS),
  }
}

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...freshDb(), ...JSON.parse(raw) }
  } catch { /* fall through to a fresh database */ }
  return freshDb()
}

const delay = (ms = 90) => new Promise((r) => setTimeout(r, ms))

export class LocalProvider implements DataProvider {
  readonly kind = 'mock' as const
  private db: Db = load()
  private session: AuthSession | null = null
  private listeners = new Set<(s: AuthSession | null) => void>()

  constructor() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        const { userId } = JSON.parse(raw)
        const profile = this.db.profiles.find((p) => p.id === userId)
        if (profile) this.session = { userId: profile.id, email: profile.email, profile }
      }
    } catch { /* no stored session */ }
  }

  // --- internals ----------------------------------------------------------
  private persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)) } catch { /* quota */ }
  }

  private emit() {
    for (const l of this.listeners) l(this.session)
  }

  private setSession(s: AuthSession | null) {
    this.session = s
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: s.userId }))
      else localStorage.removeItem(SESSION_KEY)
    } catch { /* ignore */ }
    this.emit()
  }

  private me(): Profile {
    if (!this.session) throw new Error('You are not signed in.')
    return this.session.profile
  }

  private requireStaff(): Profile {
    const me = this.me()
    if (me.role !== 'lecturer' && me.role !== 'admin') throw new Error('Staff access required.')
    return me
  }

  private isAdmin(): boolean {
    return this.session?.profile.role === 'admin'
  }

  /**
   * Courses the current user has nominated as theirs. A personal filter used
   * for the default view and the coverage warning — NOT an access boundary.
   */
  private myCourseCodes(): string[] {
    const me = this.me()
    return this.db.courseLecturers.filter((cl) => cl.lecturerId === me.id).map((cl) => cl.courseCode)
  }

  /** Mirrors can_view_application() in the database. */
  private canView(applicationId: string): boolean {
    const me = this.session?.profile
    if (!me) return false
    if (me.role === 'admin') return true
    const app = this.db.applications.find((a) => a.id === applicationId)
    if (!app) return false
    if (app.applicantId === me.id) return true
    // Staff may view any submitted application. Course selection is a personal
    // filter, not a permission boundary. Drafts stay private to the applicant.
    if (me.role !== 'lecturer') return false
    return app.status !== 'draft'
  }

  // --- Auth ---------------------------------------------------------------
  async getSession() { await delay(20); return this.session }

  async signIn(email: string, password: string): Promise<AuthSession> {
    await delay()
    const key = email.trim().toLowerCase()
    const profile = this.db.profiles.find((p) => p.email.toLowerCase() === key)
    // Deliberately identical for "no such account" and "wrong password", so the
    // sign-in form cannot be used to discover who holds an account. Matches
    // what Supabase returns.
    if (!profile || this.db.passwords[key] !== password) {
      throw new Error('Incorrect email or password.')
    }
    if (!profile.isActive) throw new Error('This account has been deactivated. Contact the School administrator.')
    const s = { userId: profile.id, email: profile.email, profile }
    this.setSession(s)
    return s
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    await delay()
    const email = input.email.trim().toLowerCase()
    if (!isGriffithEmail(email)) {
      throw new Error('Please register with your Griffith University email address (@griffith.edu.au or @griffithuni.edu.au).')
    }
    if (this.db.profiles.some((p) => p.email.toLowerCase() === email)) {
      throw new Error('An account already exists for that email address.')
    }
    if (input.password.length < 8) throw new Error('Your password must be at least 8 characters.')

    // Mirrors handle_new_user(): the School's nominated owner is always an
    // administrator; every other self-registration is a student.
    const role: Profile['role'] =
      email === SUPER_ADMIN_EMAIL ? 'admin' : 'student'
    if (role === 'student' && !input.studentNumber?.match(/^s\d{7}$/)) {
      throw new Error('Enter your Griffith student number in the format s1234567.')
    }

    const now = new Date().toISOString()
    const profile: Profile = {
      id: uid('u'),
      email,
      fullName: input.fullName.trim(),
      role,
      studentNumber: role === 'student' ? input.studentNumber! : null,
      program: input.program ?? null,
      campus: (input.campus as Profile['campus']) ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    this.db.profiles.push(profile)
    this.db.passwords[email] = input.password
    this.persist()
    const s = { userId: profile.id, email: profile.email, profile }
    this.setSession(s)
    return s
  }

  async signOut() { await delay(20); this.setSession(null) }

  onAuthChange(cb: (s: AuthSession | null) => void) {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  // --- Profiles -----------------------------------------------------------
  async updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
    await delay()
    const me = this.me()
    if (id !== me.id && !this.isAdmin()) throw new Error('You may only edit your own profile.')
    const i = this.db.profiles.findIndex((p) => p.id === id)
    if (i === -1) throw new Error('Profile not found.')
    // Non-admins may not change role or account status (mirrors the DB trigger).
    const safe: Partial<Profile> = { ...patch }
    if (!this.isAdmin()) { delete safe.role; delete safe.isActive; delete safe.email }
    this.db.profiles[i] = { ...this.db.profiles[i], ...safe, updatedAt: new Date().toISOString() }
    this.persist()
    if (id === me.id) this.setSession({ ...this.session!, profile: this.db.profiles[i] })
    return this.db.profiles[i]
  }

  async listProfiles(role?: Role): Promise<Profile[]> {
    await delay()
    this.requireStaff()
    if (!this.isAdmin()) {
      // Staff see other staff, plus anyone who has submitted an application.
      const applicantIds = new Set(
        this.db.applications.filter((a) => a.status !== 'draft').map((a) => a.applicantId),
      )
      return this.db.profiles
        .filter((p) => p.role !== 'student' || applicantIds.has(p.id))
        .filter((p) => !role || p.role === role)
    }
    return this.db.profiles.filter((p) => !role || p.role === role)
  }

  async getProfile(id: string) {
    await delay(30)
    return this.db.profiles.find((p) => p.id === id) ?? null
  }

  async createStaffAccount(input: {
    email: string; fullName: string; role: 'lecturer' | 'admin'
    position?: string; password: string; courseCodes?: string[]
  }): Promise<Profile> {
    await delay()
    if (!this.isAdmin()) throw new Error('Only an administrator may create staff accounts.')
    const email = input.email.trim().toLowerCase()
    if (!isGriffithEmail(email)) throw new Error('Staff accounts require a @griffith.edu.au address.')
    if (this.db.profiles.some((p) => p.email.toLowerCase() === email)) {
      throw new Error('An account already exists for that email address.')
    }
    const now = new Date().toISOString()
    const profile: Profile = {
      id: uid('u'), email, fullName: input.fullName.trim(), role: input.role,
      position: input.position ?? null, isActive: true, createdAt: now, updatedAt: now,
    }
    this.db.profiles.push(profile)
    this.db.passwords[email] = input.password
    for (const code of input.courseCodes ?? []) {
      this.db.courseLecturers.push({ courseCode: code, lecturerId: profile.id, isConvenor: true })
    }
    this.persist()
    return profile
  }

  async setProfileActive(id: string, isActive: boolean) {
    await delay()
    if (!this.isAdmin()) throw new Error('Only an administrator may change account status.')
    const p = this.db.profiles.find((x) => x.id === id)
    if (p) { p.isActive = isActive; p.updatedAt = new Date().toISOString(); this.persist() }
  }

  // --- Courses ------------------------------------------------------------
  async listCourses(): Promise<Course[]> { await delay(20); return ICT_COURSES }

  async listCourseLecturers(): Promise<CourseLecturer[]> {
    await delay(20); return this.db.courseLecturers
  }

  async setCourseLecturers(lecturerId: string, courseCodes: string[]) {
    await delay()
    const me = this.me()
    // Staff maintain their own selection; admins may adjust anyone's.
    if (lecturerId !== me.id && !this.isAdmin()) {
      throw new Error('You may only change your own course selection.')
    }
    this.db.courseLecturers = this.db.courseLecturers.filter((cl) => cl.lecturerId !== lecturerId)
    for (const code of courseCodes) {
      this.db.courseLecturers.push({ courseCode: code, lecturerId, isConvenor: true })
    }
    this.persist()
  }

  async coursesForLecturer(lecturerId: string): Promise<Course[]> {
    await delay(20)
    const codes = this.db.courseLecturers.filter((cl) => cl.lecturerId === lecturerId).map((c) => c.courseCode)
    return codes.map((c) => COURSE_BY_CODE[c]).filter(Boolean)
  }

  // --- Rounds -------------------------------------------------------------
  async listRounds() { await delay(20); return this.db.rounds }
  async getActiveRound() { await delay(20); return this.db.rounds.find((r) => r.isActive) ?? null }

  async upsertRound(round: Partial<RecruitmentRound> & { name: string; year: number; trimester: number }) {
    await delay()
    if (!this.isAdmin()) throw new Error('Only an administrator may manage recruitment rounds.')
    const existing = this.db.rounds.find((r) => r.id === round.id)
    if (existing) {
      Object.assign(existing, round)
      if (existing.isActive) for (const r of this.db.rounds) if (r.id !== existing.id) r.isActive = false
      this.persist()
      return existing
    }
    const created: RecruitmentRound = {
      id: uid('round'), name: round.name, year: round.year, trimester: round.trimester as 1 | 2 | 3,
      opensAt: round.opensAt ?? new Date().toISOString(),
      closesAt: round.closesAt ?? new Date(Date.now() + 42 * 86400000).toISOString(),
      isActive: round.isActive ?? false,
    }
    if (created.isActive) for (const r of this.db.rounds) r.isActive = false
    this.db.rounds.push(created)
    this.persist()
    return created
  }

  // --- Applications (student) ---------------------------------------------
  async myApplications(): Promise<Application[]> {
    await delay()
    const me = this.me()
    return this.db.applications.filter((a) => a.applicantId === me.id)
  }

  async saveApplication(draft: ApplicationDraft, applicationId?: string): Promise<Application> {
    await delay()
    const me = this.me()
    const now = new Date().toISOString()

    if (applicationId) {
      const app = this.db.applications.find((a) => a.id === applicationId)
      if (!app) throw new Error('Application not found.')
      if (app.applicantId !== me.id) throw new Error('You may only edit your own application.')
      app.statement = draft.statement
      app.hoursPerWeek = draft.hoursPerWeek
      app.availableDays = draft.availableDays
      app.resumeUrl = draft.resumeUrl ?? null
      app.preferences = draft.preferences.map((p, i) => ({
        id: `pref_${app.id}_${i}`, applicationId: app.id,
        courseCode: p.courseCode, rank: p.rank, confidence: p.confidence, note: p.note ?? null,
      }))
      app.updatedAt = now
      this.persist()
      return app
    }

    if (this.db.applications.some((a) => a.applicantId === me.id)) {
      throw new Error('You already have an application.')
    }
    const id = uid('app')
    const app: Application = {
      id, applicantId: me.id, roundId: draft.roundId ?? null, status: 'draft',
      statement: draft.statement, hoursPerWeek: draft.hoursPerWeek,
      availableDays: draft.availableDays, resumeUrl: draft.resumeUrl ?? null,
      submittedAt: null, createdAt: now, updatedAt: now,
      preferences: draft.preferences.map((p, i) => ({
        id: `pref_${id}_${i}`, applicationId: id,
        courseCode: p.courseCode, rank: p.rank, confidence: p.confidence, note: p.note ?? null,
      })),
    }
    this.db.applications.push(app)
    this.persist()
    return app
  }

  async submitApplication(applicationId: string): Promise<Application> {
    await delay()
    const me = this.me()
    const app = this.db.applications.find((a) => a.id === applicationId)
    if (!app) throw new Error('Application not found.')
    if (app.applicantId !== me.id) throw new Error('You may only submit your own application.')
    if (app.preferences.length < 1) throw new Error('Nominate at least one course before submitting.')
    if (app.statement.trim().length < 100) throw new Error('Your supporting statement must be at least 100 characters.')
    if (!me.phone?.trim()) throw new Error('Add a contact number before submitting.')

    if (app.status === 'draft') app.status = 'submitted'
    app.submittedAt = app.submittedAt ?? new Date().toISOString()
    app.updatedAt = new Date().toISOString()
    this.persist()
    return app
  }

  async withdrawApplication(applicationId: string): Promise<Application> {
    await delay()
    const me = this.me()
    const app = this.db.applications.find((a) => a.id === applicationId)
    if (!app) throw new Error('Application not found.')
    if (app.applicantId !== me.id && !this.isAdmin()) throw new Error('You may only withdraw your own application.')
    app.status = 'withdrawn'
    app.updatedAt = new Date().toISOString()
    this.persist()
    return app
  }

  // --- Experience ----------------------------------------------------------
  async myExperience(): Promise<TutoringExperience[]> {
    await delay()
    const me = this.me()
    return this.db.experience.filter((e) => e.profileId === me.id)
  }

  async addExperience(entry: Omit<TutoringExperience, 'id' | 'profileId' | 'isVerified' | 'createdAt'>) {
    await delay()
    const me = this.me()
    const created: TutoringExperience = {
      ...entry, id: uid('exp'), profileId: me.id, isVerified: false,
      createdAt: new Date().toISOString(),
    }
    this.db.experience.push(created)
    this.persist()
    return created
  }

  async deleteExperience(id: string) {
    await delay()
    const me = this.me()
    this.db.experience = this.db.experience.filter(
      (e) => !(e.id === id && (e.profileId === me.id || this.isAdmin())),
    )
    this.persist()
  }

  // --- Review (staff) -------------------------------------------------------
  async listApplicants(filter: ApplicantFilter): Promise<ApplicantRow[]> {
    await delay()
    this.requireStaff()
    const rows: ApplicantRow[] = []

    for (const app of this.db.applications) {
      if (app.status === 'draft') continue
      if (filter.roundId && app.roundId !== filter.roundId) continue
      if (filter.status?.length && !filter.status.includes(app.status)) continue

      const applicant = this.db.profiles.find((p) => p.id === app.applicantId)
      if (!applicant) continue

      if (filter.search) {
        const q = filter.search.toLowerCase()
        const hay = `${applicant.fullName} ${applicant.email} ${applicant.studentNumber ?? ''}`.toLowerCase()
        if (!hay.includes(q)) continue
      }
      if (filter.degreeLevel && applicant.degreeLevel !== filter.degreeLevel) continue

      for (const pref of app.preferences) {
        if (filter.courseCode && pref.courseCode !== filter.courseCode) continue
        // `courseCodes` narrows to a set — used by the "My courses" filter.
        if (filter.courseCodes?.length && !filter.courseCodes.includes(pref.courseCode)) continue

        const priorTimesTaught = this.db.experience.filter(
          (e) => e.profileId === applicant.id && e.courseCode === pref.courseCode,
        ).length
        if (filter.experiencedOnly && priorTimesTaught === 0) continue

        rows.push({
          applicationId: app.id,
          applicantId: applicant.id,
          fullName: applicant.fullName,
          email: applicant.email,
          studentNumber: applicant.studentNumber,
          phone: applicant.phone,
          program: applicant.program,
          degreeLevel: applicant.degreeLevel,
          campus: applicant.campus,
          status: app.status,
          submittedAt: app.submittedAt,
          matchedCourseCode: pref.courseCode,
          matchedRank: pref.rank,
          priorTimesTaught,
          totalPriorEngagements: this.db.experience.filter((e) => e.profileId === applicant.id).length,
          currentLoadHours: this.db.assignments
            .filter((a) => a.profileId === applicant.id && a.status === 'confirmed')
            .reduce((s, a) => s + a.hoursPerWeek, 0),
        })
      }
    }

    // Best candidates first: first preference, then prior experience teaching
    // that course, then breadth of teaching experience.
    return rows.sort(
      (a, b) =>
        a.matchedRank - b.matchedRank ||
        b.priorTimesTaught - a.priorTimesTaught ||
        b.totalPriorEngagements - a.totalPriorEngagements,
    )
  }

  async getApplicationDetail(applicationId: string): Promise<ApplicationDetail | null> {
    await delay()
    if (!this.canView(applicationId)) throw new Error('You do not have access to this application.')
    const app = this.db.applications.find((a) => a.id === applicationId)
    if (!app) return null
    const applicant = this.db.profiles.find((p) => p.id === app.applicantId)!
    const round = this.db.rounds.find((r) => r.id === app.roundId) ?? null
    return {
      ...app,
      applicant,
      round,
      experience: this.db.experience.filter((e) => e.profileId === applicant.id)
        .sort((a, b) => b.year - a.year || b.trimester - a.trimester),
      currentAssignments: this.db.assignments.filter(
        (a) => a.profileId === applicant.id && a.status !== 'cancelled',
      ),
      notes: this.db.notes.filter((n) => n.applicationId === applicationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      contactLog: this.db.contactLog.filter((c) => c.applicationId === applicationId)
        .sort((a, b) => b.contactedAt.localeCompare(a.contactedAt)),
    }
  }

  async setApplicationStatus(applicationId: string, status: ApplicationStatus) {
    await delay()
    this.requireStaff()
    if (!this.canView(applicationId)) throw new Error('You do not have access to this application.')
    const app = this.db.applications.find((a) => a.id === applicationId)
    if (!app) throw new Error('Application not found.')
    app.status = status
    app.updatedAt = new Date().toISOString()
    this.persist()
  }

  async addNote(applicationId: string, body: string): Promise<ApplicationNote> {
    await delay()
    const me = this.requireStaff()
    if (!this.canView(applicationId)) throw new Error('You do not have access to this application.')
    const note: ApplicationNote = {
      id: uid('note'), applicationId, authorId: me.id, authorName: me.fullName,
      body: body.trim(), createdAt: new Date().toISOString(),
    }
    this.db.notes.push(note)
    this.persist()
    return note
  }

  async logContact(entry: Omit<ContactLogEntry, 'id' | 'lecturerId' | 'lecturerName'>) {
    await delay()
    const me = this.requireStaff()
    const created: ContactLogEntry = {
      ...entry, id: uid('ct'), lecturerId: me.id, lecturerName: me.fullName,
    }
    this.db.contactLog.push(created)
    this.persist()
    return created
  }

  // --- Assignments ----------------------------------------------------------
  async listAssignments(filter?: { profileId?: string; courseCode?: string; year?: number; trimester?: number }) {
    await delay()
    const me = this.me()
    let rows = this.db.assignments
    if (me.role === 'student') rows = rows.filter((a) => a.profileId === me.id)
    if (filter?.profileId) rows = rows.filter((a) => a.profileId === filter.profileId)
    if (filter?.courseCode) rows = rows.filter((a) => a.courseCode === filter.courseCode)
    if (filter?.year) rows = rows.filter((a) => a.year === filter.year)
    if (filter?.trimester) rows = rows.filter((a) => a.trimester === filter.trimester)
    return rows
  }

  async createAssignment(input: Omit<Assignment, 'id' | 'assignedById' | 'createdAt'>): Promise<Assignment> {
    await delay()
    const me = this.requireStaff()
    const clash = this.db.assignments.find(
      (a) => a.profileId === input.profileId && a.courseCode === input.courseCode
        && a.year === input.year && a.trimester === input.trimester,
    )
    if (clash) throw new Error('This person is already allocated to that course for that trimester.')
    const created: Assignment = {
      ...input, id: uid('asg'), assignedById: me.id, createdAt: new Date().toISOString(),
    }
    this.db.assignments.push(created)
    this.persist()
    return created
  }

  async updateAssignment(id: string, patch: Partial<Assignment>): Promise<Assignment> {
    await delay()
    this.requireStaff()
    const a = this.db.assignments.find((x) => x.id === id)
    if (!a) throw new Error('Allocation not found.')
    Object.assign(a, patch)
    this.persist()
    return a
  }

  // --- Reporting -------------------------------------------------------------
  async getDashboardStats(roundId?: string): Promise<DashboardStats> {
    await delay()
    this.requireStaff()
    const apps = this.db.applications.filter(
      (a) => a.status !== 'draft' && (!roundId || a.roundId === roundId),
    )
    const count = (s: ApplicationStatus) => apps.filter((a) => a.status === s).length
    const demanded = new Set(apps.flatMap((a) => a.preferences.map((p) => p.courseCode)))
    return {
      totalApplicants: new Set(apps.map((a) => a.applicantId)).size,
      totalApplications: apps.length,
      submitted: count('submitted'),
      underReview: count('under_review'),
      shortlisted: count('shortlisted'),
      offered: count('offered'),
      accepted: count('accepted'),
      coursesWithDemand: demanded.size,
      coursesWithNoApplicants: ICT_COURSES.length - demanded.size,
      activeAssignments: this.db.assignments.filter((a) => a.status === 'confirmed').length,
    }
  }

  async getCourseDemand(roundId?: string) {
    await delay()
    this.requireStaff()
    const counts = new Map<string, { applicants: number; firstPreference: number }>()
    for (const app of this.db.applications) {
      if (app.status === 'draft') continue
      if (roundId && app.roundId !== roundId) continue
      for (const p of app.preferences) {
        const c = counts.get(p.courseCode) ?? { applicants: 0, firstPreference: 0 }
        c.applicants += 1
        if (p.rank === 1) c.firstPreference += 1
        counts.set(p.courseCode, c)
      }
    }
    return [...counts.entries()]
      .map(([courseCode, v]) => ({ courseCode, ...v }))
      .sort((a, b) => b.applicants - a.applicants)
  }

  async exportApplicantsCsv(filter: ApplicantFilter): Promise<string> {
    const rows = await this.listApplicants(filter)
    return toCsv(
      ['Course', 'Preference', 'Name', 'Student number', 'Email', 'Phone', 'Program',
       'Level', 'Campus', 'Status', 'Prior times taught', 'Total prior roles',
       'Current load (hrs)', 'Submitted'],
      rows.map((r) => [
        r.matchedCourseCode, r.matchedRank, r.fullName, r.studentNumber ?? '', r.email,
        r.phone ?? '', r.program ?? '', r.degreeLevel ?? '', r.campus ?? '', r.status,
        r.priorTimesTaught, r.totalPriorEngagements, r.currentLoadHours, r.submittedAt ?? '',
      ]),
    )
  }
}
