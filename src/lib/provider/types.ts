// ---------------------------------------------------------------------------
// DataProvider — the single seam between the UI and any backend.
//
// WHY THIS EXISTS
// V1 runs on GitHub Pages + Supabase. The stated plan is to migrate to AWS
// (API Gateway + Lambda + RDS + Cognito). That migration must not require
// touching a single component. So: no component, page or hook may import
// `@supabase/supabase-js` directly — everything goes through this interface.
// Migrating means writing one new class that implements it.
// ---------------------------------------------------------------------------
import type {
  Application,
  ApplicationDetail,
  ApplicationNote,
  ApplicationStatus,
  ApplicantRow,
  Assignment,
  ContactLogEntry,
  Course,
  CourseLecturer,
  DashboardStats,
  Profile,
  RecruitmentRound,
  Role,
  StudentRow,
  TutoringExperience,
} from '@/types'

export interface AuthSession {
  userId: string
  email: string
  profile: Profile
}

export interface RegisterInput {
  email: string
  password: string
  fullName: string
  studentNumber?: string
  program?: string
  campus?: string
}

export interface ApplicationDraft {
  /** Optional: applications are no longer scoped to a recruitment round. */
  roundId?: string | null
  statement: string
  hoursPerWeek: number
  availableDays: string[]
  resumeUrl?: string | null
  preferences: Array<{ courseCode: string; rank: number; confidence: number; note?: string }>
}

export interface ApplicantFilter {
  roundId?: string
  courseCode?: string
  /** Narrow to a set of courses — used by the "My courses" filter. */
  courseCodes?: string[]
  status?: ApplicationStatus[]
  /** Free-text across name, email, student number. */
  search?: string
  degreeLevel?: string
  /** Only applicants who have tutored the filtered course before. */
  experiencedOnly?: boolean
}

export interface DataProvider {
  readonly kind: 'mock' | 'supabase' | 'aws'

  // --- Auth --------------------------------------------------------------
  getSession(): Promise<AuthSession | null>
  signIn(email: string, password: string): Promise<AuthSession>
  register(input: RegisterInput): Promise<AuthSession>
  signOut(): Promise<void>
  /** Fires whenever the session changes; returns an unsubscribe function. */
  onAuthChange(cb: (session: AuthSession | null) => void): () => void

  // --- Profiles ----------------------------------------------------------
  updateProfile(id: string, patch: Partial<Profile>): Promise<Profile>
  listProfiles(role?: Role): Promise<Profile[]>
  getProfile(id: string): Promise<Profile | null>
  /** Admin-only: create a lecturer or admin account directly. */
  createStaffAccount(input: {
    email: string
    fullName: string
    role: Extract<Role, 'lecturer' | 'admin'>
    position?: string
    password: string
    courseCodes?: string[]
  }): Promise<Profile>
  setProfileActive(id: string, isActive: boolean): Promise<void>

  // --- Courses -----------------------------------------------------------
  listCourses(): Promise<Course[]>
  listCourseLecturers(): Promise<CourseLecturer[]>
  setCourseLecturers(lecturerId: string, courseCodes: string[]): Promise<void>
  /** Courses the given lecturer may recruit for. */
  coursesForLecturer(lecturerId: string): Promise<Course[]>

  // --- Recruitment rounds -------------------------------------------------
  listRounds(): Promise<RecruitmentRound[]>
  getActiveRound(): Promise<RecruitmentRound | null>
  upsertRound(round: Partial<RecruitmentRound> & { name: string; year: number; trimester: number }): Promise<RecruitmentRound>

  // --- Applications (student side) ---------------------------------------
  myApplications(): Promise<Application[]>
  saveApplication(draft: ApplicationDraft, applicationId?: string): Promise<Application>
  submitApplication(applicationId: string): Promise<Application>
  withdrawApplication(applicationId: string): Promise<Application>

  // --- Experience (student side) -----------------------------------------
  myExperience(): Promise<TutoringExperience[]>
  addExperience(entry: Omit<TutoringExperience, 'id' | 'profileId' | 'isVerified' | 'createdAt'>): Promise<TutoringExperience>
  deleteExperience(id: string): Promise<void>

  // --- Student directory (staff side) -------------------------------------
  /** Every registered student, whether or not they have applied. */
  listStudents(search?: string): Promise<StudentRow[]>
  /** A student's teaching history, for the directory detail view. */
  studentExperience(profileId: string): Promise<TutoringExperience[]>
  exportStudentsCsv(search?: string): Promise<string>

  // --- Review (lecturer / admin side) ------------------------------------
  listApplicants(filter: ApplicantFilter): Promise<ApplicantRow[]>
  getApplicationDetail(applicationId: string): Promise<ApplicationDetail | null>
  setApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void>
  addNote(applicationId: string, body: string): Promise<ApplicationNote>
  logContact(entry: Omit<ContactLogEntry, 'id' | 'lecturerId' | 'lecturerName'>): Promise<ContactLogEntry>

  // --- Assignments --------------------------------------------------------
  listAssignments(filter?: { profileId?: string; courseCode?: string; year?: number; trimester?: number }): Promise<Assignment[]>
  createAssignment(input: Omit<Assignment, 'id' | 'assignedById' | 'createdAt'>): Promise<Assignment>
  updateAssignment(id: string, patch: Partial<Assignment>): Promise<Assignment>

  // --- Reporting ----------------------------------------------------------
  getDashboardStats(roundId?: string): Promise<DashboardStats>
  /** Applicant counts per course for the given round, for the demand heatmap. */
  getCourseDemand(roundId?: string): Promise<Array<{ courseCode: string; applicants: number; firstPreference: number }>>
  exportApplicantsCsv(filter: ApplicantFilter): Promise<string>
}
