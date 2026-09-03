// ---------------------------------------------------------------------------
// SupabaseProvider — the production data path.
//
// Talks to Postgres through PostgREST. Authorisation is NOT implemented here:
// it lives in the database as row level security (0003_rls.sql), so the rules
// hold even if this client is modified or bypassed. The checks that do appear
// here exist to produce good error messages, not to enforce security.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Application, ApplicationDetail, ApplicationNote, ApplicationStatus, ApplicantRow,
  Assignment, ContactLogEntry, Course, CourseLecturer, DashboardStats, Profile,
  RecruitmentRound, Role, TutoringExperience, Trimester,
} from '@/types'
import type {
  ApplicantFilter, ApplicationDraft, AuthSession, DataProvider, RegisterInput,
} from '../types'
import { isGriffithEmail, toCsv } from '@/lib/utils'

// --- row <-> domain mapping -------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */

const toProfile = (r: any): Profile => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  role: r.role,
  studentNumber: r.student_number,
  phone: r.phone,
  program: r.program,
  degreeLevel: r.degree_level,
  gpa: r.gpa === null || r.gpa === undefined ? null : Number(r.gpa),
  campus: r.campus,
  hasWorkRights: r.has_work_rights,
  hasBlueCard: r.has_blue_card,
  position: r.position,
  isActive: r.is_active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const fromProfile = (p: Partial<Profile>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  if (p.fullName !== undefined) out.full_name = p.fullName
  if (p.role !== undefined) out.role = p.role
  if (p.studentNumber !== undefined) out.student_number = p.studentNumber
  if (p.phone !== undefined) out.phone = p.phone
  if (p.program !== undefined) out.program = p.program
  if (p.degreeLevel !== undefined) out.degree_level = p.degreeLevel
  if (p.gpa !== undefined) out.gpa = p.gpa
  if (p.campus !== undefined) out.campus = p.campus
  if (p.hasWorkRights !== undefined) out.has_work_rights = p.hasWorkRights
  if (p.hasBlueCard !== undefined) out.has_blue_card = p.hasBlueCard
  if (p.position !== undefined) out.position = p.position
  if (p.isActive !== undefined) out.is_active = p.isActive
  return out
}

const toRound = (r: any): RecruitmentRound => ({
  id: r.id, name: r.name, year: r.year, trimester: r.trimester as Trimester,
  opensAt: r.opens_at, closesAt: r.closes_at, isActive: r.is_active,
})

const toApplication = (r: any): Application => ({
  id: r.id,
  applicantId: r.applicant_id,
  roundId: r.round_id,
  status: r.status,
  statement: r.statement ?? '',
  hoursPerWeek: r.hours_per_week ?? 0,
  availableDays: r.available_days ?? [],
  resumeUrl: r.resume_url,
  submittedAt: r.submitted_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  preferences: (r.application_preferences ?? []).map((p: any) => ({
    id: p.id, applicationId: p.application_id, courseCode: p.course_code,
    rank: p.rank, confidence: p.confidence, note: p.note,
  })).sort((a: any, b: any) => a.rank - b.rank),
})

const toExperience = (r: any): TutoringExperience => ({
  id: r.id, profileId: r.profile_id, courseCode: r.course_code,
  externalCourseName: r.external_course_name, institution: r.institution,
  year: r.year, trimester: r.trimester as Trimester, role: r.role,
  hoursPerWeek: r.hours_per_week, description: r.description,
  isVerified: r.is_verified, createdAt: r.created_at,
})

const toAssignment = (r: any): Assignment => ({
  id: r.id, profileId: r.profile_id, courseCode: r.course_code, year: r.year,
  trimester: r.trimester as Trimester, role: r.role, hoursPerWeek: r.hours_per_week,
  status: r.status, assignedById: r.assigned_by_id, createdAt: r.created_at,
})

const APPLICATION_SELECT = '*, application_preferences(*)'

/** Turn a PostgREST error into something a user can act on. */
function explain(error: { message: string; code?: string } | null, fallback: string): never {
  if (!error) throw new Error(fallback)
  const m = error.message
  if (error.code === '42501' || /row-level security/i.test(m)) {
    throw new Error('You do not have permission to do that.')
  }
  if (error.code === '23505') throw new Error('That record already exists.')
  if (/profiles_griffith_email/.test(m)) {
    throw new Error('Please use your Griffith University email address.')
  }
  if (/applications_submitted_needs_statement/.test(m)) {
    throw new Error('Your supporting statement must be at least 100 characters.')
  }
  if (/application_preferences_application_id_rank_key/.test(m)) {
    throw new Error('Each course preference must have a distinct ranking.')
  }
  throw new Error(m)
}

export class SupabaseProvider implements DataProvider {
  readonly kind = 'supabase' as const
  constructor(private db: SupabaseClient) {}

  // --- Auth ---------------------------------------------------------------
  private async sessionFromUser(userId: string, email: string): Promise<AuthSession> {
    const { data, error } = await this.db.from('profiles').select('*').eq('id', userId).single()
    if (error) explain(error, 'Could not load your profile.')
    const profile = toProfile(data)
    if (!profile.isActive) {
      await this.db.auth.signOut()
      throw new Error('This account has been deactivated. Contact the School administrator.')
    }
    return { userId, email, profile }
  }

  async getSession(): Promise<AuthSession | null> {
    const { data } = await this.db.auth.getSession()
    const u = data.session?.user
    if (!u) return null
    try {
      return await this.sessionFromUser(u.id, u.email!)
    } catch {
      return null
    }
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.db.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    })
    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        throw new Error('Incorrect email or password.')
      }
      if (/email not confirmed/i.test(error.message)) {
        throw new Error('Please confirm your email address first — check your inbox for the verification link.')
      }
      throw new Error(error.message)
    }
    return this.sessionFromUser(data.user.id, data.user.email!)
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase()
    if (!isGriffithEmail(email)) {
      throw new Error('Please register with your Griffith University email address (@griffith.edu.au or @griffithuni.edu.au).')
    }
    const { data, error } = await this.db.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
        data: {
          full_name: input.fullName.trim(),
          student_number: input.studentNumber ?? null,
          program: input.program ?? null,
          campus: input.campus ?? null,
        },
      },
    })
    if (error) explain(error, 'Registration failed.')

    // With email confirmation switched on there is no session yet.
    if (!data.session) {
      throw new Error('CONFIRM_EMAIL')
    }
    return this.sessionFromUser(data.user!.id, data.user!.email!)
  }

  async signOut() { await this.db.auth.signOut() }

  onAuthChange(cb: (s: AuthSession | null) => void) {
    const { data } = this.db.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) return cb(null)
      try { cb(await this.sessionFromUser(session.user.id, session.user.email!)) }
      catch { cb(null) }
    })
    return () => data.subscription.unsubscribe()
  }

  // --- Profiles ------------------------------------------------------------
  async updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.db.from('profiles')
      .update(fromProfile(patch)).eq('id', id).select().single()
    if (error) explain(error, 'Could not save your profile.')
    return toProfile(data)
  }

  async listProfiles(role?: Role): Promise<Profile[]> {
    let q = this.db.from('profiles').select('*').order('full_name')
    if (role) q = q.eq('role', role)
    const { data, error } = await q
    if (error) explain(error, 'Could not load accounts.')
    return (data ?? []).map(toProfile)
  }

  async getProfile(id: string): Promise<Profile | null> {
    const { data, error } = await this.db.from('profiles').select('*').eq('id', id).maybeSingle()
    if (error) explain(error, 'Could not load that profile.')
    return data ? toProfile(data) : null
  }

  /**
   * Creating a staff account requires privileges the browser does not hold, so
   * this calls an Edge Function that runs with the service role and verifies
   * the caller is an administrator. See supabase/functions/create-staff.
   */
  async createStaffAccount(input: {
    email: string; fullName: string; role: 'lecturer' | 'admin'
    position?: string; password: string; courseCodes?: string[]
  }): Promise<Profile> {
    const { data, error } = await this.db.functions.invoke('create-staff', { body: input })
    if (error) throw new Error(error.message || 'Could not create the staff account.')
    if ((data as any)?.error) throw new Error((data as any).error)
    return toProfile((data as any).profile)
  }

  async setProfileActive(id: string, isActive: boolean) {
    const { error } = await this.db.from('profiles').update({ is_active: isActive }).eq('id', id)
    if (error) explain(error, 'Could not change the account status.')
  }

  // --- Courses --------------------------------------------------------------
  async listCourses(): Promise<Course[]> {
    const { data, error } = await this.db.from('courses')
      .select('*').eq('is_active', true).order('code')
    if (error) explain(error, 'Could not load the course catalogue.')
    return (data ?? []).map((r: any) => ({
      code: r.code, title: r.title, level: r.level, school: 'ICT' as const, isActive: r.is_active,
    }))
  }

  async listCourseLecturers(): Promise<CourseLecturer[]> {
    const { data, error } = await this.db.from('course_lecturers').select('*')
    if (error) explain(error, 'Could not load course convenors.')
    return (data ?? []).map((r: any) => ({
      courseCode: r.course_code, lecturerId: r.lecturer_id, isConvenor: r.is_convenor,
    }))
  }

  async setCourseLecturers(lecturerId: string, courseCodes: string[]) {
    const del = await this.db.from('course_lecturers').delete().eq('lecturer_id', lecturerId)
    if (del.error) explain(del.error, 'Could not update course assignments.')
    if (courseCodes.length === 0) return
    const ins = await this.db.from('course_lecturers').insert(
      courseCodes.map((c) => ({ course_code: c, lecturer_id: lecturerId, is_convenor: true })),
    )
    if (ins.error) explain(ins.error, 'Could not update course assignments.')
  }

  async coursesForLecturer(lecturerId: string): Promise<Course[]> {
    const { data, error } = await this.db.from('course_lecturers')
      .select('course_code, courses(*)').eq('lecturer_id', lecturerId)
    if (error) explain(error, 'Could not load your courses.')
    return (data ?? []).map((r: any) => ({
      code: r.courses.code, title: r.courses.title, level: r.courses.level,
      school: 'ICT' as const, isActive: r.courses.is_active,
    }))
  }

  // --- Rounds ---------------------------------------------------------------
  async listRounds(): Promise<RecruitmentRound[]> {
    const { data, error } = await this.db.from('recruitment_rounds')
      .select('*').order('year', { ascending: false }).order('trimester', { ascending: false })
    if (error) explain(error, 'Could not load recruitment rounds.')
    return (data ?? []).map(toRound)
  }

  async getActiveRound(): Promise<RecruitmentRound | null> {
    const { data, error } = await this.db.from('recruitment_rounds')
      .select('*').eq('is_active', true).maybeSingle()
    if (error) explain(error, 'Could not load the current recruitment round.')
    return data ? toRound(data) : null
  }

  async upsertRound(round: Partial<RecruitmentRound> & { name: string; year: number; trimester: number }) {
    const payload = {
      name: round.name, year: round.year, trimester: round.trimester,
      opens_at: round.opensAt, closes_at: round.closesAt, is_active: round.isActive ?? false,
    }
    // Only one round may be active; clear the others first.
    if (payload.is_active) {
      await this.db.from('recruitment_rounds').update({ is_active: false }).neq('id', round.id ?? '00000000-0000-0000-0000-000000000000')
    }
    const q = round.id
      ? this.db.from('recruitment_rounds').update(payload).eq('id', round.id).select().single()
      : this.db.from('recruitment_rounds').insert(payload).select().single()
    const { data, error } = await q
    if (error) explain(error, 'Could not save the recruitment round.')
    return toRound(data)
  }

  // --- Applications ----------------------------------------------------------
  async myApplications(): Promise<Application[]> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw new Error('You are not signed in.')
    const { data, error } = await this.db.from('applications')
      .select(APPLICATION_SELECT).eq('applicant_id', auth.user.id)
      .order('created_at', { ascending: false })
    if (error) explain(error, 'Could not load your applications.')
    return (data ?? []).map(toApplication)
  }

  async saveApplication(draft: ApplicationDraft, applicationId?: string): Promise<Application> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw new Error('You are not signed in.')

    const body = {
      statement: draft.statement,
      hours_per_week: draft.hoursPerWeek,
      available_days: draft.availableDays,
      resume_url: draft.resumeUrl ?? null,
    }

    let id = applicationId
    if (id) {
      const { error } = await this.db.from('applications').update(body).eq('id', id)
      if (error) explain(error, 'Could not save your application.')
    } else {
      const { data, error } = await this.db.from('applications')
        .insert({ ...body, applicant_id: auth.user.id, round_id: draft.roundId, status: 'draft' })
        .select('id').single()
      if (error) explain(error, 'Could not create your application.')
      id = data.id
    }

    // Preferences are small and fully replaced on each save — simpler and
    // safer than diffing, and it keeps the unique(rank) constraint satisfied.
    const del = await this.db.from('application_preferences').delete().eq('application_id', id!)
    if (del.error) explain(del.error, 'Could not save your course preferences.')

    if (draft.preferences.length) {
      const ins = await this.db.from('application_preferences').insert(
        draft.preferences.map((p) => ({
          application_id: id, course_code: p.courseCode,
          rank: p.rank, confidence: p.confidence, note: p.note ?? null,
        })),
      )
      if (ins.error) explain(ins.error, 'Could not save your course preferences.')
    }

    const { data, error } = await this.db.from('applications')
      .select(APPLICATION_SELECT).eq('id', id!).single()
    if (error) explain(error, 'Could not reload your application.')
    return toApplication(data)
  }

  async submitApplication(applicationId: string): Promise<Application> {
    // Validation lives in the database function so it cannot be bypassed.
    const { error } = await this.db.rpc('submit_application', { p_application_id: applicationId })
    if (error) explain(error, 'Could not submit your application.')
    const { data, error: e2 } = await this.db.from('applications')
      .select(APPLICATION_SELECT).eq('id', applicationId).single()
    if (e2) explain(e2, 'Could not reload your application.')
    return toApplication(data)
  }

  async withdrawApplication(applicationId: string): Promise<Application> {
    const { data, error } = await this.db.from('applications')
      .update({ status: 'withdrawn' }).eq('id', applicationId)
      .select(APPLICATION_SELECT).single()
    if (error) explain(error, 'Could not withdraw your application.')
    return toApplication(data)
  }

  // --- Experience -------------------------------------------------------------
  async myExperience(): Promise<TutoringExperience[]> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw new Error('You are not signed in.')
    const { data, error } = await this.db.from('tutoring_experience')
      .select('*').eq('profile_id', auth.user.id)
      .order('year', { ascending: false }).order('trimester', { ascending: false })
    if (error) explain(error, 'Could not load your teaching history.')
    return (data ?? []).map(toExperience)
  }

  async addExperience(entry: Omit<TutoringExperience, 'id' | 'profileId' | 'isVerified' | 'createdAt'>) {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw new Error('You are not signed in.')
    const { data, error } = await this.db.from('tutoring_experience').insert({
      profile_id: auth.user.id,
      course_code: entry.courseCode ?? null,
      external_course_name: entry.externalCourseName ?? null,
      institution: entry.institution,
      year: entry.year, trimester: entry.trimester, role: entry.role,
      hours_per_week: entry.hoursPerWeek ?? null, description: entry.description ?? null,
    }).select().single()
    if (error) explain(error, 'Could not add that entry.')
    return toExperience(data)
  }

  async deleteExperience(id: string) {
    const { error } = await this.db.from('tutoring_experience').delete().eq('id', id)
    if (error) explain(error, 'Could not remove that entry.')
  }

  // --- Review -----------------------------------------------------------------
  async listApplicants(filter: ApplicantFilter): Promise<ApplicantRow[]> {
    // applicant_rows is a security_invoker view, so RLS on the base tables
    // already limits a lecturer to their own courses.
    let q = this.db.from('applicant_rows').select('*')
    if (filter.roundId) q = q.eq('round_id', filter.roundId)
    if (filter.courseCode) q = q.eq('matched_course_code', filter.courseCode)
    if (filter.status?.length) q = q.in('status', filter.status)
    if (filter.minGpa !== undefined) q = q.gte('gpa', filter.minGpa)
    if (filter.degreeLevel) q = q.eq('degree_level', filter.degreeLevel)
    if (filter.search) {
      const s = `%${filter.search}%`
      q = q.or(`full_name.ilike.${s},email.ilike.${s},student_number.ilike.${s}`)
    }
    const { data, error } = await q
      .order('matched_rank').order('prior_times_taught', { ascending: false }).order('gpa', { ascending: false })
    if (error) explain(error, 'Could not load applicants.')

    let rows: ApplicantRow[] = (data ?? []).map((r: any) => ({
      applicationId: r.application_id,
      applicantId: r.applicant_id,
      fullName: r.full_name,
      email: r.email,
      studentNumber: r.student_number,
      program: r.program,
      degreeLevel: r.degree_level,
      gpa: r.gpa === null ? null : Number(r.gpa),
      campus: r.campus,
      status: r.status,
      submittedAt: r.submitted_at,
      matchedCourseCode: r.matched_course_code,
      matchedRank: r.matched_rank,
      matchedConfidence: r.matched_confidence,
      priorTimesTaught: Number(r.prior_times_taught ?? 0),
      totalPriorEngagements: Number(r.total_prior_engagements ?? 0),
      currentLoadHours: Number(r.current_load_hours ?? 0),
    }))
    if (filter.experiencedOnly) rows = rows.filter((r) => r.priorTimesTaught > 0)
    return rows
  }

  async getApplicationDetail(applicationId: string): Promise<ApplicationDetail | null> {
    const { data: app, error } = await this.db.from('applications')
      .select(`${APPLICATION_SELECT}, profiles!applications_applicant_id_fkey(*), recruitment_rounds(*)`)
      .eq('id', applicationId).maybeSingle()
    if (error) explain(error, 'Could not load that application.')
    if (!app) return null

    const applicantId = (app as any).applicant_id
    const [exp, asg, notes, contact] = await Promise.all([
      this.db.from('tutoring_experience').select('*').eq('profile_id', applicantId)
        .order('year', { ascending: false }),
      this.db.from('assignments').select('*').eq('profile_id', applicantId).neq('status', 'cancelled'),
      this.db.from('application_notes').select('*, profiles(full_name)')
        .eq('application_id', applicationId).order('created_at', { ascending: false }),
      this.db.from('contact_log').select('*, profiles(full_name)')
        .eq('application_id', applicationId).order('contacted_at', { ascending: false }),
    ])

    return {
      ...toApplication(app),
      applicant: toProfile((app as any).profiles),
      round: toRound((app as any).recruitment_rounds),
      experience: (exp.data ?? []).map(toExperience),
      currentAssignments: (asg.data ?? []).map(toAssignment),
      notes: (notes.data ?? []).map((n: any) => ({
        id: n.id, applicationId: n.application_id, authorId: n.author_id,
        authorName: n.profiles?.full_name ?? 'Staff member', body: n.body, createdAt: n.created_at,
      })),
      contactLog: (contact.data ?? []).map((c: any) => ({
        id: c.id, applicationId: c.application_id, lecturerId: c.lecturer_id,
        lecturerName: c.profiles?.full_name ?? 'Staff member', method: c.method,
        subject: c.subject, notes: c.notes, contactedAt: c.contacted_at,
      })),
    }
  }

  async setApplicationStatus(applicationId: string, status: ApplicationStatus) {
    const { error } = await this.db.from('applications').update({ status }).eq('id', applicationId)
    if (error) explain(error, 'Could not update the application status.')
  }

  async addNote(applicationId: string, body: string): Promise<ApplicationNote> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw new Error('You are not signed in.')
    const { data, error } = await this.db.from('application_notes')
      .insert({ application_id: applicationId, author_id: auth.user.id, body: body.trim() })
      .select('*, profiles(full_name)').single()
    if (error) explain(error, 'Could not save your note.')
    return {
      id: data.id, applicationId: data.application_id, authorId: data.author_id,
      authorName: (data as any).profiles?.full_name ?? 'You', body: data.body, createdAt: data.created_at,
    }
  }

  async logContact(entry: Omit<ContactLogEntry, 'id' | 'lecturerId' | 'lecturerName'>) {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw new Error('You are not signed in.')
    const { data, error } = await this.db.from('contact_log').insert({
      application_id: entry.applicationId, lecturer_id: auth.user.id,
      method: entry.method, subject: entry.subject, notes: entry.notes ?? null,
      contacted_at: entry.contactedAt,
    }).select('*, profiles(full_name)').single()
    if (error) explain(error, 'Could not record that contact.')
    return {
      id: data.id, applicationId: data.application_id, lecturerId: data.lecturer_id,
      lecturerName: (data as any).profiles?.full_name ?? 'You', method: data.method,
      subject: data.subject, notes: data.notes, contactedAt: data.contacted_at,
    }
  }

  // --- Assignments ---------------------------------------------------------------
  async listAssignments(filter?: { profileId?: string; courseCode?: string; year?: number; trimester?: number }) {
    let q = this.db.from('assignments').select('*')
    if (filter?.profileId) q = q.eq('profile_id', filter.profileId)
    if (filter?.courseCode) q = q.eq('course_code', filter.courseCode)
    if (filter?.year) q = q.eq('year', filter.year)
    if (filter?.trimester) q = q.eq('trimester', filter.trimester)
    const { data, error } = await q.order('year', { ascending: false }).order('trimester', { ascending: false })
    if (error) explain(error, 'Could not load allocations.')
    return (data ?? []).map(toAssignment)
  }

  async createAssignment(input: Omit<Assignment, 'id' | 'assignedById' | 'createdAt'>): Promise<Assignment> {
    const { data: auth } = await this.db.auth.getUser()
    const { data, error } = await this.db.from('assignments').insert({
      profile_id: input.profileId, course_code: input.courseCode, year: input.year,
      trimester: input.trimester, role: input.role, hours_per_week: input.hoursPerWeek,
      status: input.status, assigned_by_id: auth.user?.id ?? null,
    }).select().single()
    if (error) explain(error, 'Could not create that allocation.')
    return toAssignment(data)
  }

  async updateAssignment(id: string, patch: Partial<Assignment>): Promise<Assignment> {
    const body: Record<string, unknown> = {}
    if (patch.status !== undefined) body.status = patch.status
    if (patch.hoursPerWeek !== undefined) body.hours_per_week = patch.hoursPerWeek
    if (patch.role !== undefined) body.role = patch.role
    const { data, error } = await this.db.from('assignments').update(body).eq('id', id).select().single()
    if (error) explain(error, 'Could not update that allocation.')
    return toAssignment(data)
  }

  // --- Reporting -------------------------------------------------------------------
  async getDashboardStats(roundId?: string): Promise<DashboardStats> {
    let q = this.db.from('applications').select('applicant_id, status').neq('status', 'draft')
    if (roundId) q = q.eq('round_id', roundId)
    const { data, error } = await q
    if (error) explain(error, 'Could not load dashboard figures.')
    const apps = data ?? []
    const count = (s: string) => apps.filter((a: any) => a.status === s).length

    const demand = await this.getCourseDemand(roundId)
    const { count: courseCount } = await this.db.from('courses')
      .select('code', { count: 'exact', head: true }).eq('is_active', true)
    const { count: activeAssignments } = await this.db.from('assignments')
      .select('id', { count: 'exact', head: true }).eq('status', 'confirmed')

    return {
      totalApplicants: new Set(apps.map((a: any) => a.applicant_id)).size,
      totalApplications: apps.length,
      submitted: count('submitted'),
      underReview: count('under_review'),
      shortlisted: count('shortlisted'),
      offered: count('offered'),
      accepted: count('accepted'),
      coursesWithDemand: demand.length,
      coursesWithNoApplicants: Math.max(0, (courseCount ?? 0) - demand.length),
      activeAssignments: activeAssignments ?? 0,
    }
  }

  async getCourseDemand(roundId?: string) {
    let q = this.db.from('application_preferences')
      .select('course_code, rank, applications!inner(status, round_id)')
      .neq('applications.status', 'draft')
    if (roundId) q = q.eq('applications.round_id', roundId)
    const { data, error } = await q
    if (error) explain(error, 'Could not load course demand.')

    const counts = new Map<string, { applicants: number; firstPreference: number }>()
    for (const r of (data ?? []) as any[]) {
      const c = counts.get(r.course_code) ?? { applicants: 0, firstPreference: 0 }
      c.applicants += 1
      if (r.rank === 1) c.firstPreference += 1
      counts.set(r.course_code, c)
    }
    return [...counts.entries()]
      .map(([courseCode, v]) => ({ courseCode, ...v }))
      .sort((a, b) => b.applicants - a.applicants)
  }

  async exportApplicantsCsv(filter: ApplicantFilter): Promise<string> {
    const rows = await this.listApplicants(filter)
    return toCsv(
      ['Course', 'Preference', 'Name', 'Student number', 'Email', 'Program', 'Level',
       'GPA', 'Campus', 'Status', 'Prior times taught', 'Total prior roles', 'Current load (hrs)', 'Submitted'],
      rows.map((r) => [
        r.matchedCourseCode, r.matchedRank, r.fullName, r.studentNumber ?? '', r.email,
        r.program ?? '', r.degreeLevel ?? '', r.gpa ?? '', r.campus ?? '', r.status,
        r.priorTimesTaught, r.totalPriorEngagements, r.currentLoadHours, r.submittedAt ?? '',
      ]),
    )
  }
}
