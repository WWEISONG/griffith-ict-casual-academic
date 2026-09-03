// ---------------------------------------------------------------------------
// Local seed data.
//
// Used by the LocalProvider, which runs the application entirely in the
// browser when no Supabase backend is configured. This lets the app be
// developed, reviewed and presented offline; the production path is the
// Supabase backend (see ../supabase/SupabaseProvider.ts).
//
// The applicant records here are illustrative sample records, not real student
// data. The course catalogue is Griffith's real ICT course list.
//
// No password is stored in this file. The local administrator password is read
// from VITE_LOCAL_ADMIN_PASSWORD in .env.local, which is not committed.
// ---------------------------------------------------------------------------
import type {
  Application,
  ApplicationNote,
  Assignment,
  ContactLogEntry,
  CourseLecturer,
  Profile,
  RecruitmentRound,
  TutoringExperience,
} from '@/types'

/**
 * Password used by LocalProvider accounts when running without a backend.
 * Supplied via VITE_LOCAL_ADMIN_PASSWORD in .env.local (never committed).
 */
/**
 * The School's super administrator. Mirrors super_admin_email() in the
 * database (migration 0007) so both backends agree on who owns the system.
 */
export const SUPER_ADMIN_EMAIL = 'w.song@griffith.edu.au'

export const LOCAL_PASSWORD: string =
  ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_LOCAL_ADMIN_PASSWORD) ?? 'changeme'

const now = new Date()
const YEAR = now.getFullYear()
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString()

export const SEED_ROUNDS: RecruitmentRound[] = [
  {
    id: 'round_t1',
    name: `Trimester 1, ${YEAR + 1}`,
    year: YEAR + 1,
    trimester: 1,
    opensAt: iso(21),
    closesAt: iso(-25),
    isActive: true,
  },
  {
    id: 'round_t3_prev',
    name: `Trimester 3, ${YEAR}`,
    year: YEAR,
    trimester: 3,
    opensAt: iso(200),
    closesAt: iso(160),
    isActive: false,
  },
]

// --- People -----------------------------------------------------------------

const staff = (
  id: string, email: string, fullName: string,
  role: 'admin' | 'lecturer', position: string,
): Profile => ({
  id, email, fullName, role, position,
  isActive: true, createdAt: iso(120), updatedAt: iso(10),
})

const student = (
  id: string, email: string, fullName: string, studentNumber: string,
  program: string, degreeLevel: Profile['degreeLevel'], gpa: number,
  campus: Profile['campus'],
): Profile => ({
  id, email, fullName, role: 'student', studentNumber, program, degreeLevel, gpa, campus,
  hasWorkRights: true, hasBlueCard: gpa > 5.8,
  phone: `04${String(Math.abs(hash(id)) % 100000000).padStart(8, '0')}`,
  isActive: true, createdAt: iso(60), updatedAt: iso(5),
})

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export const SEED_PROFILES: Profile[] = [
  // Super administrator. The authoritative account lives in Supabase; this
  // mirror lets the same person sign in when running without a backend.
  staff('u_admin', 'w.song@griffith.edu.au', 'Wei Song', 'admin', 'Super Administrator — School of ICT'),

  staff('u_lec1', 'a.nguyen@griffith.edu.au', 'Dr Anh Nguyen', 'lecturer', 'Course Convenor — Programming'),
  staff('u_lec2', 'm.patel@griffith.edu.au', 'Dr Meera Patel', 'lecturer', 'Course Convenor — Cyber Security'),
  staff('u_lec3', 'j.oconnor@griffith.edu.au', "A/Prof James O'Connor", 'lecturer', 'Course Convenor — Networks & Data'),

  student('u_s1', 'liam.chen@griffithuni.edu.au', 'Liam Chen', 's5201883', 'Bachelor of Computer Science', 'undergraduate', 6.4, 'Nathan'),
  student('u_s2', 'priya.sharma@griffithuni.edu.au', 'Priya Sharma', 's5188204', 'Master of Information Technology', 'masters', 6.1, 'Nathan'),
  student('u_s3', 'tom.hayes@griffithuni.edu.au', 'Thomas Hayes', 's5233910', 'Bachelor of Information Technology', 'undergraduate', 5.2, 'Gold Coast'),
  student('u_s4', 'aisha.rahman@griffithuni.edu.au', 'Aisha Rahman', 's5177432', 'Bachelor of Computer Science (Honours)', 'honours', 6.8, 'Nathan'),
  student('u_s5', 'daniel.okafor@griffithuni.edu.au', 'Daniel Okafor', 's5240117', 'Master of Cyber Security', 'masters', 5.9, 'Nathan'),
  student('u_s6', 'sophie.tran@griffithuni.edu.au', 'Sophie Tran', 's5199650', 'Bachelor of Information Technology', 'undergraduate', 5.6, 'Gold Coast'),
  student('u_s7', 'raj.deshmukh@griffithuni.edu.au', 'Raj Deshmukh', 's5210044', 'PhD (Information and Communication Technology)', 'phd', 6.9, 'Nathan'),
  student('u_s8', 'emily.wu@griffithuni.edu.au', 'Emily Wu', 's5226781', 'Bachelor of Computer Science', 'undergraduate', 6.0, 'Nathan'),
  student('u_s9', 'noah.baker@griffithuni.edu.au', 'Noah Baker', 's5245502', 'Bachelor of Information Technology', 'undergraduate', 4.8, 'Logan'),
  student('u_s10', 'yuki.tanaka@griffithuni.edu.au', 'Yuki Tanaka', 's5183377', 'Master of Information Technology', 'masters', 6.5, 'South Bank'),
]

/** Which lecturer recruits for which courses. */
export const SEED_COURSE_LECTURERS: CourseLecturer[] = [
  { courseCode: '1811ICT', lecturerId: 'u_lec1', isConvenor: true },
  { courseCode: '1001ICT', lecturerId: 'u_lec1', isConvenor: true },
  { courseCode: '1005ICT', lecturerId: 'u_lec1', isConvenor: false },
  { courseCode: '2801ICT', lecturerId: 'u_lec1', isConvenor: true },
  { courseCode: '3813ICT', lecturerId: 'u_lec1', isConvenor: false },

  { courseCode: '7905ICT', lecturerId: 'u_lec2', isConvenor: true },
  { courseCode: '1118ICT', lecturerId: 'u_lec2', isConvenor: true },
  { courseCode: '3809ICT', lecturerId: 'u_lec2', isConvenor: true },
  { courseCode: '3012ICT', lecturerId: 'u_lec2', isConvenor: false },

  { courseCode: '2809ICT', lecturerId: 'u_lec3', isConvenor: true },
  { courseCode: '2814ICT', lecturerId: 'u_lec3', isConvenor: true },
  { courseCode: '3030ICT', lecturerId: 'u_lec3', isConvenor: false },
  { courseCode: '3808ICT', lecturerId: 'u_lec3', isConvenor: true },
]

// --- Prior teaching experience ----------------------------------------------

let expSeq = 0
const exp = (
  profileId: string, courseCode: string | null, year: number, trimester: 1 | 2 | 3,
  role: TutoringExperience['role'], hours: number, description: string,
  externalCourseName?: string, institution = 'Griffith University', verified = true,
): TutoringExperience => ({
  id: `exp_${++expSeq}`, profileId, courseCode, externalCourseName: externalCourseName ?? null,
  institution, year, trimester, role, hoursPerWeek: hours, description,
  isVerified: verified, createdAt: iso(45),
})

export const SEED_EXPERIENCE: TutoringExperience[] = [
  exp('u_s1', '1811ICT', YEAR, 1, 'tutor', 6, 'Two tutorial groups plus consultation hours. Strong student feedback (4.6/5).'),
  exp('u_s1', '1811ICT', YEAR, 2, 'tutor', 6, 'Repeat offering; assisted with assignment moderation.'),
  exp('u_s1', '1001ICT', YEAR - 1, 2, 'lab_assistant', 4, 'Supported weekly programming labs.'),

  exp('u_s2', '2814ICT', YEAR, 1, 'tutor', 8, 'Led three SQL tutorial streams; built supplementary practice sets.'),
  exp('u_s2', '7003ICT', YEAR, 2, 'marker', 5, 'Marked ER modelling and normalisation assessments.'),

  exp('u_s4', '2801ICT', YEAR, 1, 'tutor', 8, 'Algorithms tutorials; ran additional exam revision sessions.'),
  exp('u_s4', '1808ICT', YEAR - 1, 1, 'tutor', 6, 'Discrete structures tutorials.'),
  exp('u_s4', '3805ICT', YEAR, 2, 'demonstrator', 4, 'Advanced algorithms problem-solving workshops.'),

  exp('u_s5', '7905ICT', YEAR, 2, 'demonstrator', 6, 'Ran hands-on security lab environment and CTF exercises.'),
  exp('u_s5', null, YEAR - 2, 1, 'tutor', 5, 'Introductory networking tutorials.', 'CS1102 Networking Fundamentals', 'University of Lagos', false),

  exp('u_s7', '3808ICT', YEAR, 1, 'tutor', 8, 'Routing and internetworking tutorials, Packet Tracer labs.'),
  exp('u_s7', '2809ICT', YEAR, 2, 'tutor', 8, 'Networking essentials; coordinated marking team of four.'),
  exp('u_s7', '3808ICT', YEAR - 1, 1, 'marker', 4, 'Assessment marking and moderation.'),

  exp('u_s8', '1005ICT', YEAR, 2, 'lab_assistant', 4, 'Object-oriented programming labs in Java.'),
  exp('u_s10', '2814ICT', YEAR - 1, 3, 'tutor', 6, 'Database design tutorials.'),
  exp('u_s10', '3030ICT', YEAR, 1, 'tutor', 6, 'Data analytics tutorials using Python and pandas.'),
]

// --- Applications ------------------------------------------------------------

interface AppRow {
  id: string
  applicantId: string
  status: Application['status']
  statement: string
  hours: number
  days: string[]
  prefs: Array<[string, number, number, string?]>
  submittedDaysAgo: number | null
}

const APP_ROWS: AppRow[] = [
  {
    id: 'app_1', applicantId: 'u_s1', status: 'shortlisted', hours: 10,
    days: ['Mon', 'Tue', 'Wed', 'Thu'], submittedDaysAgo: 14,
    statement:
      'I have tutored 1811ICT across two consecutive trimesters and consistently received student evaluations above 4.5/5. I am comfortable running tutorials for cohorts of 25-30 and have built supplementary practice material that the convenor now reuses. My own results in the introductory programming sequence were 7s, and I have since worked as a part-time developer using Python and Java, which helps me connect course content to industry practice.',
    prefs: [['1811ICT', 1, 5, 'Tutored twice; know the assessment structure well.'], ['1001ICT', 2, 5], ['2801ICT', 3, 4, 'Strong algorithms background from 2801ICT (grade 7).']],
  },
  {
    id: 'app_2', applicantId: 'u_s4', status: 'offered', hours: 12,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], submittedDaysAgo: 16,
    statement:
      'I am an Honours student working on graph algorithms, and I have tutored 2801ICT and 1808ICT. I particularly enjoy the moment where a student stops pattern-matching to past exam questions and starts reasoning about complexity properly. I run optional revision sessions before exams and have prepared worked-solution sets for both courses. I am available across all five days and can take on a coordination role if useful.',
    prefs: [['2801ICT', 1, 5, 'Tutored previously; also my Honours area.'], ['3805ICT', 2, 5], ['1808ICT', 3, 4]],
  },
  {
    id: 'app_3', applicantId: 'u_s7', status: 'accepted', hours: 12,
    days: ['Tue', 'Wed', 'Thu'], submittedDaysAgo: 18,
    statement:
      'I am a PhD candidate in network security and have tutored the networking sequence for three trimesters, including coordinating a marking team of four for 2809ICT. I hold CCNA certification and maintain the Packet Tracer lab materials used in 3808ICT. I would like to continue with both courses and can support onboarding of new tutors.',
    prefs: [['3808ICT', 1, 5, 'Convenor-endorsed; maintain the current lab materials.'], ['2809ICT', 2, 5], ['3413ICT', 3, 4]],
  },
  {
    id: 'app_4', applicantId: 'u_s2', status: 'under_review', hours: 8,
    days: ['Mon', 'Wed', 'Fri'], submittedDaysAgo: 11,
    statement:
      'I completed 2814ICT with a 7 and have since tutored it for a full trimester, plus marked for 7003ICT. My Masters project involves designing a normalised schema for a health-data pipeline, so the material is current for me. I am confident teaching SQL, ER modelling and normalisation, and I am happy to take the postgraduate cohort as well as undergraduate streams.',
    prefs: [['2814ICT', 1, 5, 'Tutored last trimester.'], ['7003ICT', 2, 4], ['3612ICT', 3, 3]],
  },
  {
    id: 'app_5', applicantId: 'u_s5', status: 'submitted', hours: 10,
    days: ['Mon', 'Tue', 'Thu'], submittedDaysAgo: 9,
    statement:
      'I demonstrate for 7905ICT and manage the isolated lab environment used for the practical exercises. Before moving to Australia I tutored introductory networking for two years. I am studying a Master of Cyber Security and hold Security+ certification. I would like to expand into 3809ICT, where my CTF experience is directly relevant.',
    prefs: [['7905ICT', 1, 5, 'Currently demonstrating.'], ['3809ICT', 2, 4, 'Active CTF competitor.'], ['1118ICT', 3, 4]],
  },
  {
    id: 'app_6', applicantId: 'u_s10', status: 'submitted', hours: 8,
    days: ['Wed', 'Thu', 'Fri'], submittedDaysAgo: 8,
    statement:
      'I have tutored both 2814ICT and 3030ICT and enjoy the data-handling side of the curriculum. I work part-time as a data analyst, which means I can bring real cleaning and visualisation problems into tutorials. I am based at South Bank but can travel to Nathan on Wednesdays and Thursdays.',
    prefs: [['3030ICT', 1, 5], ['2814ICT', 2, 5, 'Tutored in T3.'], ['3009ICT', 3, 3]],
  },
  {
    id: 'app_7', applicantId: 'u_s8', status: 'submitted', hours: 6,
    days: ['Tue', 'Thu'], submittedDaysAgo: 6,
    statement:
      'I assisted in the 1005ICT labs last trimester and would like to step up to running my own tutorial group. I am in my third year of Computer Science with a 6.0 GPA and achieved a 7 in both 1005ICT and 1811ICT. I am organised, reliable, and I have found that I am good at spotting when a student is stuck on a concept rather than on syntax.',
    prefs: [['1005ICT', 1, 5], ['1811ICT', 2, 4], ['1001ICT', 3, 4]],
  },
  {
    id: 'app_8', applicantId: 'u_s6', status: 'submitted', hours: 8,
    days: ['Mon', 'Tue', 'Wed'], submittedDaysAgo: 5,
    statement:
      'This would be my first tutoring role. I am in my final year of Information Technology at Gold Coast with a 5.6 GPA and scored a 6 in 1811ICT. I have been a peer mentor in the PAL program for two trimesters, so I have experience explaining material to students one-on-one and in small groups, and I completed the PAL leader training.',
    prefs: [['1811ICT', 1, 4, 'PAL leader for this course.'], ['1621ICT', 2, 4], ['1001ICT', 3, 3]],
  },
  {
    id: 'app_9', applicantId: 'u_s3', status: 'under_review', hours: 6,
    days: ['Thu', 'Fri'], submittedDaysAgo: 4,
    statement:
      'I am interested in tutoring the introductory web and programming courses. My GPA is 5.2, which I know is not the strongest, but I improved significantly in my later years and received a 6 in 1621ICT. I build websites freelance and think that practical experience would be useful to students taking web technologies.',
    prefs: [['1621ICT', 1, 4, 'Freelance web developer.'], ['3004ICT', 2, 3], ['1811ICT', 3, 3]],
  },
  {
    id: 'app_10', applicantId: 'u_s9', status: 'submitted', hours: 4,
    days: ['Mon', 'Fri'], submittedDaysAgo: 2,
    statement:
      'I would like to try tutoring for the first time. I am a second-year IT student based at Logan. I am strong at explaining things and have helped classmates through the introductory programming assignments informally. I am available Mondays and Fridays and can travel to Nathan.',
    prefs: [['1001ICT', 1, 3], ['1811ICT', 2, 3]],
  },
  // A draft, to demonstrate the save-and-return-later flow.
  {
    id: 'app_11', applicantId: 'u_s6', status: 'draft', hours: 4,
    days: ['Fri'], submittedDaysAgo: null,
    statement: 'Draft — still deciding which courses to nominate.',
    prefs: [['1118ICT', 1, 3]],
  },
]

export const SEED_APPLICATIONS: Application[] = APP_ROWS.map((a) => ({
  id: a.id,
  applicantId: a.applicantId,
  roundId: 'round_t1',
  status: a.status,
  statement: a.statement,
  hoursPerWeek: a.hours,
  availableDays: a.days,
  resumeUrl: null,
  submittedAt: a.submittedDaysAgo === null ? null : iso(a.submittedDaysAgo),
  createdAt: iso((a.submittedDaysAgo ?? 1) + 2),
  updatedAt: iso(a.submittedDaysAgo ?? 1),
  preferences: a.prefs.map(([courseCode, rank, confidence, note], i) => ({
    id: `pref_${a.id}_${i}`,
    applicationId: a.id,
    courseCode,
    rank,
    confidence,
    note: note ?? null,
  })),
}))

// --- Current allocations -----------------------------------------------------

let asgSeq = 0
const asg = (
  profileId: string, courseCode: string, trimester: 1 | 2 | 3,
  role: Assignment['role'], hours: number, status: Assignment['status'], year = YEAR,
): Assignment => ({
  id: `asg_${++asgSeq}`, profileId, courseCode, year, trimester, role,
  hoursPerWeek: hours, status, assignedById: 'u_admin', createdAt: iso(30),
})

export const SEED_ASSIGNMENTS: Assignment[] = [
  // Ongoing this trimester
  asg('u_s1', '1811ICT', 3, 'tutor', 6, 'confirmed'),
  asg('u_s7', '3808ICT', 3, 'tutor', 8, 'confirmed'),
  asg('u_s7', '2809ICT', 3, 'tutor', 4, 'confirmed'),
  asg('u_s2', '2814ICT', 3, 'tutor', 6, 'confirmed'),
  asg('u_s5', '7905ICT', 3, 'demonstrator', 6, 'confirmed'),
  asg('u_s10', '3030ICT', 3, 'tutor', 6, 'confirmed'),
  // Proposed for the upcoming round
  asg('u_s4', '2801ICT', 1, 'tutor', 8, 'proposed', YEAR + 1),
  asg('u_s7', '3808ICT', 1, 'tutor', 8, 'proposed', YEAR + 1),
  // Completed history
  asg('u_s1', '1811ICT', 2, 'tutor', 6, 'completed'),
  asg('u_s4', '2801ICT', 1, 'tutor', 8, 'completed'),
  asg('u_s8', '1005ICT', 2, 'lab_assistant', 4, 'completed'),
]

// --- Review trail -------------------------------------------------------------

export const SEED_NOTES: ApplicationNote[] = [
  { id: 'note_1', applicationId: 'app_1', authorId: 'u_lec1', authorName: 'Dr Anh Nguyen', body: 'Excellent prior performance in 1811ICT. Student evaluations were the highest in the tutor group. Recommend offering two groups.', createdAt: iso(12) },
  { id: 'note_2', applicationId: 'app_2', authorId: 'u_lec1', authorName: 'Dr Anh Nguyen', body: 'Strongest algorithms candidate this round. Offer made 2801ICT, 8 hrs/week. Awaiting response.', createdAt: iso(9) },
  { id: 'note_3', applicationId: 'app_3', authorId: 'u_lec3', authorName: "A/Prof James O'Connor", body: 'Confirmed for 3808ICT. Will also coordinate the marking team again — flagging to School for the coordination loading.', createdAt: iso(13) },
  { id: 'note_4', applicationId: 'app_9', authorId: 'u_lec1', authorName: 'Dr Anh Nguyen', body: 'GPA below the usual 5.5 guideline, but relevant industry experience for 1621ICT. Worth a conversation before deciding.', createdAt: iso(3) },
]

export const SEED_CONTACT_LOG: ContactLogEntry[] = [
  { id: 'ct_1', applicationId: 'app_1', lecturerId: 'u_lec1', lecturerName: 'Dr Anh Nguyen', method: 'email', subject: '1811ICT tutoring — Trimester 1', notes: 'Invited to a short meeting to discuss group allocation.', contactedAt: iso(12) },
  { id: 'ct_2', applicationId: 'app_2', lecturerId: 'u_lec1', lecturerName: 'Dr Anh Nguyen', method: 'email', subject: 'Offer — 2801ICT tutor', notes: 'Formal offer sent; copied School admin.', contactedAt: iso(9) },
  { id: 'ct_3', applicationId: 'app_3', lecturerId: 'u_lec3', lecturerName: "A/Prof James O'Connor", method: 'meeting', subject: 'Networks tutoring plan', notes: 'Met on campus. Agreed to 3808ICT plus marking coordination.', contactedAt: iso(14) },
]
