// ---------------------------------------------------------------------------
// The entire student experience, on one page.
//
// Students have a single job here: submit one application per round. Splitting
// that across several screens adds navigation without adding value, so details,
// teaching history, course preferences, statement and availability are all
// sections of one form. After submission the same page becomes a read-only
// status view.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/hooks/useToast'
import { StatusBadge, AssignmentBadge } from '@/components/app/StatusBadge'
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input,
  LoadingState, Meter, Modal, Select, Textarea,
} from '@/components/ui'
import { ICT_COURSES, COURSE_BY_CODE, courseLabel, levelShortLabel } from '@/data/courses'
import { formatDate, trimesterShort } from '@/lib/utils'
import { TUTOR_ROLE_LABEL, type Application, type TutorRole, type Trimester } from '@/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
const MAX_PREFERENCES = 6
const MIN_STATEMENT = 100
const CAMPUSES = ['Nathan', 'Gold Coast', 'Mount Gravatt', 'South Bank', 'Logan', 'Online']

interface PrefRow { courseCode: string; confidence: number; note: string }

export function StudentPortal() {
  const provider = getProvider()
  const { profile, refreshProfile } = useAuth()
  const { push } = useToast()

  const state = useAsync(async () => {
    const [apps, experience, assignments] = await Promise.all([
      provider.myApplications(),
      provider.myExperience(),
      provider.listAssignments(),
    ])
    return { apps, experience, assignments }
  }, [])

  // One standing application per student, editable at any time.
  const existing = useMemo(() => state.data?.apps[0] ?? null, [state.data])

  const [statement, setStatement] = useState('')
  const [hours, setHours] = useState(8)
  const [days, setDays] = useState<string[]>([])
  const [resumeUrl, setResumeUrl] = useState('')
  const [prefs, setPrefs] = useState<PrefRow[]>([])
  const [saving, setSaving] = useState<'idle' | 'saving' | 'submitting'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [expOpen, setExpOpen] = useState(false)

  useEffect(() => {
    if (!existing) return
    setStatement(existing.statement)
    setHours(existing.hoursPerWeek || 8)
    setDays(existing.availableDays ?? [])
    setResumeUrl(existing.resumeUrl ?? '')
    setPrefs(existing.preferences.slice().sort((a, b) => a.rank - b.rank)
      .map((p) => ({ courseCode: p.courseCode, confidence: p.confidence, note: p.note ?? '' })))
  }, [existing])

  if (state.loading) return <div className="mx-auto max-w-4xl px-5 py-10"><LoadingState /></div>
  if (state.error) return <div className="mx-auto max-w-4xl px-5 py-10"><ErrorState message={state.error} onRetry={state.reload} /></div>

  const { experience, assignments } = state.data!
  // Applications stay editable so they can be kept current as experience grows.
  const readOnly = false
  const submitted = Boolean(existing && existing.status !== 'draft')
  const statementChars = statement.trim().length
  const usedCodes = new Set(prefs.map((p) => p.courseCode).filter(Boolean))
  const ongoing = assignments.filter((a) => a.status === 'confirmed' || a.status === 'proposed')

  const canSubmit = prefs.filter((p) => p.courseCode).length > 0
    && statementChars >= MIN_STATEMENT && hours > 0 && days.length > 0
    && Boolean(profile?.phone?.trim())

  async function save(thenSubmit: boolean) {
    setError(null)
    setSaving(thenSubmit ? 'submitting' : 'saving')
    try {
      const saved: Application = await provider.saveApplication({
        statement: statement.trim(),
        hoursPerWeek: hours,
        availableDays: days,
        resumeUrl: resumeUrl.trim() || null,
        preferences: prefs.filter((p) => p.courseCode).map((p, i) => ({
          courseCode: p.courseCode, rank: i + 1, confidence: p.confidence,
          note: p.note.trim() || undefined,
        })),
      }, existing?.id)

      if (thenSubmit) {
        await provider.submitApplication(saved.id)
        push('success', submitted ? 'Your application has been updated.' : 'Your application has been submitted.')
      } else {
        push('success', 'Saved. You can come back and finish it any time.')
      }
      state.reload()
    } catch (e) {
      setError((e as Error).message)
      push('error', (e as Error).message)
    } finally {
      setSaving('idle')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
              Casual academic application
            </h1>
            <p className="mt-2 text-base leading-relaxed text-ink-600">
              Tell us which courses you would like to tutor. You can update this
              at any time as you gain experience.
            </p>
          </div>
          {existing && <StatusBadge status={existing.status} />}
        </div>
      </div>

      {/* Current allocations, if any — shown above the form because it is the
          first thing a returning tutor wants to see. */}
      {ongoing.length > 0 && (
        <Card className="mb-5">
          <CardHeader title="Courses you are tutoring" />
          <ul className="divide-y divide-ink-200">
            {ongoing.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{courseLabel(a.courseCode)}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {trimesterShort(a.year, a.trimester)} · {TUTOR_ROLE_LABEL[a.role]} · {a.hoursPerWeek} hrs/week
                  </p>
                </div>
                <AssignmentBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <>
          {submitted && (
            <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900">
              Submitted on {formatDate(existing!.submittedAt)}. Convenors can see your
              application and will email you directly if they would like to take it
              further. You can keep it up to date below — changes are saved immediately.
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* 1 — Your details ------------------------------------------ */}
            <Section n={1} title="Your details"
                     description="Convenors see these alongside your application.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Name"><Input value={profile?.fullName ?? ''} disabled /></Field>
                <Field label="Griffith email"><Input value={profile?.email ?? ''} disabled /></Field>
                <Field label="Student number"><Input value={profile?.studentNumber ?? ''} disabled /></Field>
                <Field label="Program"><Input value={profile?.program ?? '—'} disabled /></Field>

                <Field label="Campus">
                  <Select value={profile?.campus ?? ''} disabled={readOnly}
                          onChange={(e) => refreshProfile({ campus: (e.target.value || null) as never })}>
                    <option value="">Select…</option>
                    {CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>

                <Field label="Contact number" required>
                  <Input type="tel" required disabled={readOnly} value={profile?.phone ?? ''}
                         onChange={(e) => refreshProfile({ phone: e.target.value })} />
                </Field>
              </div>

              <div className="mt-5 grid gap-3 border-t border-ink-200 pt-5 sm:grid-cols-2">
                <label className="flex items-start gap-2.5">
                  <input type="checkbox" disabled={readOnly} checked={profile?.hasWorkRights ?? false}
                         onChange={(e) => refreshProfile({ hasWorkRights: e.target.checked })}
                         className="mt-0.5 h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
                  <span className="text-sm text-ink-800">
                    I have the right to work in Australia
                    <span className="mt-0.5 block text-xs text-ink-500">
                      Student visa holders should check their fortnightly work-hour limit.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5">
                  <input type="checkbox" disabled={readOnly} checked={profile?.hasBlueCard ?? false}
                         onChange={(e) => refreshProfile({ hasBlueCard: e.target.checked })}
                         className="mt-0.5 h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
                  <span className="text-sm text-ink-800">
                    I hold a current Queensland Blue Card
                    <span className="mt-0.5 block text-xs text-ink-500">
                      Required for some activities involving students under 18.
                    </span>
                  </span>
                </label>
              </div>
            </Section>

            {/* 2 — Teaching experience ----------------------------------- */}
            <Section
              n={2} title="Previous tutoring experience"
              description="At Griffith or elsewhere. Strongly considered by convenors."
              action={!readOnly && <Button size="sm" variant="secondary" onClick={() => setExpOpen(true)}>Add</Button>}
            >
              {experience.length === 0 ? (
                <p className="py-2 text-sm text-ink-500">
                  Nothing recorded yet. If this would be your first tutoring role, say so in your
                  statement below — first-time tutors are regularly appointed.
                </p>
              ) : (
                <ul className="divide-y divide-ink-200">
                  {experience.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-ink-900">
                            {e.courseCode ? courseLabel(e.courseCode) : e.externalCourseName}
                          </p>
                          {e.isVerified && <Badge tone="success">Verified</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {trimesterShort(e.year, e.trimester)} · {TUTOR_ROLE_LABEL[e.role]}
                          {e.hoursPerWeek ? ` · ${e.hoursPerWeek} hrs/week` : ''}
                          {e.institution !== 'Griffith University' ? ` · ${e.institution}` : ''}
                        </p>
                        {e.description && <p className="mt-1 text-sm leading-relaxed text-ink-600">{e.description}</p>}
                      </div>
                      {!readOnly && !e.isVerified && (
                        <button
                          onClick={async () => { await provider.deleteExperience(e.id); state.reload() }}
                          className="shrink-0 rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove entry"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* 3 — Course preferences ------------------------------------ */}
            <Section
              n={3} title="Courses you want to tutor"
              description={`Ranked — first is strongest. Up to ${MAX_PREFERENCES}.`}
              action={!readOnly && (
                <Button size="sm" variant="secondary"
                        onClick={() => setPrefs((p) => [...p, { courseCode: '', confidence: 3, note: '' }])}
                        disabled={prefs.length >= MAX_PREFERENCES}>
                  Add course
                </Button>
              )}
            >
              {prefs.length === 0 && (
                <p className="py-2 text-sm text-ink-500">Add at least one course to continue.</p>
              )}
              <div className="space-y-4">
                {prefs.map((pref, i) => {
                  const course = COURSE_BY_CODE[pref.courseCode]
                  return (
                    <div key={i} className="rounded-xl border border-ink-200 bg-ink-50/60 p-5">
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-ink-800 ring-1 ring-ink-300">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1 space-y-3">
                          <Select value={pref.courseCode} disabled={readOnly}
                                  aria-label={`Course preference ${i + 1}`}
                                  onChange={(e) => setPrefs((p) => p.map((x, j) => j === i ? { ...x, courseCode: e.target.value } : x))}>
                            <option value="">Select a course…</option>
                            {ICT_COURSES.filter((c) => c.code === pref.courseCode || !usedCodes.has(c.code))
                              .map((c) => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
                          </Select>

                          {course && (
                            <div className="flex items-center gap-2">
                              <Badge tone="neutral">{levelShortLabel(course.level)}</Badge>
                            </div>
                          )}

                          <Input disabled={readOnly} maxLength={200} value={pref.note}
                                 aria-label={`Why course ${i + 1}`}
                                 placeholder="Why this course? e.g. tutored it in T2, or scored a 7."
                                 onChange={(e) => setPrefs((p) => p.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} />
                        </div>

                        {!readOnly && (
                          <div className="flex shrink-0 flex-col gap-0.5">
                            <IconBtn label="Move up" disabled={i === 0}
                                     onClick={() => setPrefs((p) => swap(p, i, i - 1))} d="M10 15V5M5 10l5-5 5 5" />
                            <IconBtn label="Move down" disabled={i === prefs.length - 1}
                                     onClick={() => setPrefs((p) => swap(p, i, i + 1))} d="M10 5v10M5 10l5 5 5-5" />
                            <IconBtn label="Remove" danger
                                     onClick={() => setPrefs((p) => p.filter((_, j) => j !== i))} d="M5 5l10 10M15 5L5 15" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>

            {/* 4 — Statement --------------------------------------------- */}
            <Section n={4} title="Why you are qualified">
              <Textarea value={statement} disabled={readOnly} rows={9} maxLength={4000}
                        onChange={(e) => setStatement(e.target.value)}
                        placeholder="Describe your experience with the course material, any teaching or mentoring you have done, and how you would run a tutorial." />
              <div className="mt-2 flex items-center justify-between gap-3">
                <Meter value={Math.min(statementChars, MIN_STATEMENT)} max={MIN_STATEMENT} />
                <p className={`shrink-0 text-xs tabular-nums ${statementChars >= MIN_STATEMENT ? 'text-emerald-700' : 'text-ink-500'}`}>
                  {statementChars < MIN_STATEMENT ? `${MIN_STATEMENT - statementChars} more characters` : `${statementChars} characters`}
                </p>
              </div>
            </Section>

            {/* 5 — Availability ------------------------------------------ */}
            <Section n={5} title="Availability">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Maximum hours per week" hint="Includes delivery, preparation and marking.">
                  <Select value={hours} disabled={readOnly} onChange={(e) => setHours(Number(e.target.value))}>
                    {[2, 4, 6, 8, 10, 12, 14, 16, 20].map((h) => <option key={h} value={h}>{h} hours</option>)}
                  </Select>
                </Field>
                <Field label="Link to your CV (optional)">
                  <Input type="url" disabled={readOnly} placeholder="https://…" value={resumeUrl}
                         onChange={(e) => setResumeUrl(e.target.value)} />
                </Field>
              </div>
              <fieldset className="mt-4" disabled={readOnly}>
                <legend className="label">Days you can teach</legend>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const on = days.includes(d)
                    return (
                      <button key={d} type="button" aria-pressed={on}
                              onClick={() => setDays((v) => on ? v.filter((x) => x !== d) : [...v, d])}
                              className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                                on ? 'border-griffith-700 bg-griffith-700 text-white'
                                   : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-50'}`}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </Section>

            {/* Submit ----------------------------------------------------- */}
            <div className="flex justify-end">
              <Button size="lg" onClick={() => save(true)}
                      loading={saving === 'submitting'} disabled={!canSubmit}>
                {submitted ? 'Update application' : 'Submit application'}
              </Button>
            </div>
          </div>
        </>

      <ExperienceModal
        open={expOpen}
        onClose={() => setExpOpen(false)}
        onSaved={() => { setExpOpen(false); state.reload() }}
      />
    </div>
  )
}

// --- helpers ----------------------------------------------------------------

function swap<T>(arr: T[], a: number, b: number): T[] {
  if (b < 0 || b >= arr.length) return arr
  const next = arr.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function IconBtn({ label, d, onClick, disabled, danger }: {
  label: string; d: string; onClick: () => void; disabled?: boolean; danger?: boolean
}) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
            className={`rounded p-1 text-ink-400 disabled:opacity-30 ${
              danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-ink-200 hover:text-ink-700'}`}>
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d={d} />
      </svg>
    </button>
  )
}

function Section({ n, title, description, action, children }: {
  n: number; title: string; description?: string
  action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 px-6 py-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-griffith-700 text-sm font-semibold text-white">
            {n}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </Card>
  )
}

function ExperienceModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const provider = getProvider()
  const { push } = useToast()
  const thisYear = new Date().getFullYear()

  const [atGriffith, setAtGriffith] = useState(true)
  const [courseCode, setCourseCode] = useState('')
  const [externalName, setExternalName] = useState('')
  const [institution, setInstitution] = useState('')
  const [year, setYear] = useState(thisYear)
  const [trimester, setTrimester] = useState<Trimester>(1)
  const [role, setRole] = useState<TutorRole>('tutor')
  const [hoursPerWeek, setHours] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const valid = atGriffith ? Boolean(courseCode) : Boolean(externalName.trim() && institution.trim())

  async function submit() {
    setBusy(true)
    try {
      await provider.addExperience({
        courseCode: atGriffith ? courseCode : null,
        externalCourseName: atGriffith ? null : externalName.trim(),
        institution: atGriffith ? 'Griffith University' : institution.trim(),
        year, trimester, role,
        hoursPerWeek: hoursPerWeek === '' ? null : Number(hoursPerWeek),
        description: description.trim() || null,
      })
      push('success', 'Experience added.')
      setCourseCode(''); setExternalName(''); setInstitution(''); setDescription(''); setHours('')
      onSaved()
    } catch (e) {
      push('error', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="Add tutoring experience"
      description="Include teaching, demonstrating, marking or peer mentoring."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={busy} disabled={!valid}>Add</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {[{ v: true, l: 'At Griffith' }, { v: false, l: 'Another institution' }].map((o) => (
            <button key={o.l} type="button" onClick={() => setAtGriffith(o.v)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      atGriffith === o.v ? 'border-griffith-700 bg-griffith-50 text-griffith-800'
                                         : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-50'}`}>
              {o.l}
            </button>
          ))}
        </div>

        {atGriffith ? (
          <Field label="Course" required>
            <Select value={courseCode} onChange={(e) => setCourseCode(e.target.value)}>
              <option value="">Select a course…</option>
              {ICT_COURSES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
            </Select>
          </Field>
        ) : (
          <>
            <Field label="Course name" required>
              <Input value={externalName} onChange={(e) => setExternalName(e.target.value)}
                     placeholder="e.g. CS1102 Networking Fundamentals" />
            </Field>
            <Field label="Institution" required>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value)}
                     placeholder="e.g. University of Queensland" />
            </Field>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Year">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
          <Field label="Trimester">
            <Select value={trimester} onChange={(e) => setTrimester(Number(e.target.value) as Trimester)}>
              <option value={1}>T1</option>
              <option value={2}>T2</option>
              <option value={3}>T3</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as TutorRole)}>
              {Object.entries(TUTOR_ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Hours per week">
            <Input type="number" min={0} max={40} value={hoursPerWeek}
                   onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))} />
          </Field>
        </div>

        <Field label="What did you do?">
          <Textarea rows={3} value={description} maxLength={500}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Ran two tutorial groups of 25 and held weekly consultation hours." />
        </Field>
      </div>
    </Modal>
  )
}
