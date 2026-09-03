// ---------------------------------------------------------------------------
// Domain model — Casual Academic (Tutor) Management System
// School of ICT, Griffith University
//
// These types are the contract between the UI and whichever DataProvider is
// active (mock / Supabase / future AWS). Keep them backend-agnostic: no
// Supabase or AWS types may appear here.
// ---------------------------------------------------------------------------

export type Role = 'student' | 'lecturer' | 'admin'

export type Campus =
  | 'Nathan'
  | 'Gold Coast'
  | 'Mount Gravatt'
  | 'South Bank'
  | 'Logan'
  | 'Online'

export type DegreeLevel =
  | 'undergraduate'
  | 'honours'
  | 'masters'
  | 'phd'

/** Griffith runs three trimesters per calendar year. */
export type Trimester = 1 | 2 | 3

export interface Profile {
  id: string
  email: string
  fullName: string
  role: Role
  /** Griffith student number, e.g. s1234567. Students only. */
  studentNumber?: string | null
  phone?: string | null
  /** e.g. "Bachelor of Computer Science" */
  program?: string | null
  degreeLevel?: DegreeLevel | null
  /** Griffith GPA, 0–7 scale. */
  gpa?: number | null
  campus?: Campus | null
  /** Unrestricted work rights in Australia (or student-visa hour cap acknowledged). */
  hasWorkRights?: boolean | null
  /** Queensland Working with Children ("Blue Card") — required for some cohorts. */
  hasBlueCard?: boolean | null
  /** Lecturers only: short title shown to students, e.g. "Course Convenor". */
  position?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Course {
  code: string
  title: string
  /** First digit of the code: 1–3 undergraduate, 4/6 honours, 7 postgraduate. */
  level: number
  school: 'ICT'
  isActive: boolean
}

/** A recruitment window, e.g. "Trimester 1, 2026". */
export interface RecruitmentRound {
  id: string
  name: string
  year: number
  trimester: Trimester
  opensAt: string
  closesAt: string
  isActive: boolean
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'unsuccessful'
  | 'withdrawn'

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  offered: 'Offer made',
  accepted: 'Offer accepted',
  declined: 'Offer declined',
  unsuccessful: 'Unsuccessful',
  withdrawn: 'Withdrawn',
}

/** Statuses a student may still edit their application in. */
export const EDITABLE_STATUSES: ApplicationStatus[] = ['draft']

export type TutorRole =
  | 'tutor'
  | 'demonstrator'
  | 'marker'
  | 'lab_assistant'
  | 'pal_leader'
  | 'guest_lecturer'

export const TUTOR_ROLE_LABEL: Record<TutorRole, string> = {
  tutor: 'Tutor',
  demonstrator: 'Lab demonstrator',
  marker: 'Marker',
  lab_assistant: 'Lab assistant',
  pal_leader: 'PAL leader',
  guest_lecturer: 'Guest lecturer',
}

/** One ranked course preference inside an application. */
export interface CoursePreference {
  id: string
  applicationId: string
  courseCode: string
  /** 1 = most preferred. */
  rank: number
  /** Self-assessed competence in this course's material, 1–5. */
  confidence: number
  /** Optional justification specific to this course. */
  note?: string | null
}

export interface Application {
  id: string
  applicantId: string
  /** Unused since applications became always-open; kept for historic records. */
  roundId?: string | null
  status: ApplicationStatus
  /** "Why I am qualified" — the core free-text statement. */
  statement: string
  /** Max hours per week the applicant can commit. */
  hoursPerWeek: number
  /** Days available, e.g. ['Mon','Tue']. */
  availableDays: string[]
  preferences: CoursePreference[]
  /** Optional link to a CV/resume (Drive, OneDrive, etc.). */
  resumeUrl?: string | null
  submittedAt?: string | null
  createdAt: string
  updatedAt: string
}

/** Teaching the applicant has already done, at Griffith or elsewhere. */
export interface TutoringExperience {
  id: string
  profileId: string
  /** Set when the course is a Griffith ICT course. */
  courseCode?: string | null
  /** Set instead of courseCode for external/non-ICT teaching. */
  externalCourseName?: string | null
  institution: string
  year: number
  trimester: Trimester
  role: TutorRole
  hoursPerWeek?: number | null
  description?: string | null
  /** Set true once an admin has confirmed it against Griffith records. */
  isVerified: boolean
  createdAt: string
}

export type AssignmentStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled'

/** A tutor actually allocated to a course for a given trimester. */
export interface Assignment {
  id: string
  profileId: string
  courseCode: string
  year: number
  trimester: Trimester
  role: TutorRole
  hoursPerWeek: number
  status: AssignmentStatus
  assignedById: string
  createdAt: string
}

/** Links a lecturer to the courses they may recruit for. */
export interface CourseLecturer {
  courseCode: string
  lecturerId: string
  isConvenor: boolean
}

/** Private note left by a lecturer or admin on an application. */
export interface ApplicationNote {
  id: string
  applicationId: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

/**
 * Record that a lecturer contacted an applicant. Interviews and offers happen
 * over email outside the system; this keeps an auditable trail inside it.
 */
export interface ContactLogEntry {
  id: string
  applicationId: string
  lecturerId: string
  lecturerName: string
  method: 'email' | 'meeting' | 'phone' | 'other'
  subject: string
  notes?: string | null
  contactedAt: string
}

// --- Composite read models used by the UI ---------------------------------

/** An application joined with everything a lecturer/admin needs to judge it. */
export interface ApplicationDetail extends Application {
  applicant: Profile
  experience: TutoringExperience[]
  /** Courses this applicant is currently allocated to. */
  currentAssignments: Assignment[]
  notes: ApplicationNote[]
  contactLog: ContactLogEntry[]
  round?: RecruitmentRound | null
}

/** A row in the lecturer's / admin's applicant table. */
export interface ApplicantRow {
  applicationId: string
  applicantId: string
  fullName: string
  email: string
  studentNumber?: string | null
  /** Contact number — collected on the application, used to reach applicants. */
  phone?: string | null
  program?: string | null
  degreeLevel?: DegreeLevel | null
  campus?: Campus | null
  status: ApplicationStatus
  submittedAt?: string | null
  /** The preference that matched the course being viewed. */
  matchedCourseCode: string
  matchedRank: number
  /** How many times they have tutored the matched course before. */
  priorTimesTaught: number
  totalPriorEngagements: number
  currentLoadHours: number
}

/** One registered student, as staff see them in the directory. */
export interface StudentRow {
  id: string
  fullName: string
  email: string
  phone?: string | null
  studentNumber?: string | null
  program?: string | null
  degreeLevel?: DegreeLevel | null
  campus?: Campus | null
  registeredAt: string
  /** Number of recorded tutoring engagements. */
  timesTutored: number
  /** Distinct Griffith courses they have tutored. */
  coursesTutored: number
  lastTaughtYear?: number | null
  /** Courses they have actually taught. */
  tutoredCourses: string[]
  /** Courses they have asked to teach. */
  appliedCourses: string[]
  /** Set when they have an application on file. */
  applicationId?: string | null
  appliedAt?: string | null
  applicationUpdatedAt?: string | null
  currentLoadHours: number
}

export interface DashboardStats {
  totalApplicants: number
  totalApplications: number
  submitted: number
  underReview: number
  shortlisted: number
  offered: number
  accepted: number
  coursesWithDemand: number
  coursesWithNoApplicants: number
  activeAssignments: number
}
