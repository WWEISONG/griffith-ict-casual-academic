import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/hooks/useToast'
import { StatusBadge, AssignmentBadge } from '@/components/app/StatusBadge'
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field,
  Input, LoadingState, Modal, Select, Textarea,
} from '@/components/ui'
import { courseLabel, COURSE_BY_CODE } from '@/data/courses'
import { formatDate, formatDateTime, mailto, relativeTime, trimesterShort } from '@/lib/utils'
import {
  APPLICATION_STATUS_LABEL, TUTOR_ROLE_LABEL,
  type ApplicationStatus, type TutorRole, type Trimester,
} from '@/types'

/** The statuses a convenor moves an application through, in order. */
const PIPELINE: ApplicationStatus[] = [
  'submitted', 'under_review', 'shortlisted', 'offered', 'accepted', 'declined', 'unsuccessful',
]

export function ApplicantDetail() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const focusCourse = params.get('course') ?? undefined
  const provider = getProvider()
  const { profile } = useAuth()
  const { push } = useToast()

  const state = useAsync(() => provider.getApplicationDetail(id!), [id])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [allocOpen, setAllocOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />
  if (!state.data) return <EmptyState title="Application not found" />

  const a = state.data
  const app = a.applicant

  async function setStatus(status: ApplicationStatus) {
    setBusy(true)
    try {
      await provider.setApplicationStatus(a.id, status)
      push('success', `Marked as ${APPLICATION_STATUS_LABEL[status].toLowerCase()}.`)
      state.reload()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  async function addNote() {
    if (!note.trim()) return
    setBusy(true)
    try {
      await provider.addNote(a.id, note)
      setNote('')
      push('success', 'Note added.')
      state.reload()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  // Pre-written email so a convenor can reach out in one click. Contact happens
  // in their own mail client; we only record that it happened.
  const emailSubject = `${focusCourse ?? 'ICT'} tutoring — School of ICT`
  const emailBody = [
    `Dear ${app.fullName.split(' ')[0]},`,
    '',
    `Thank you for applying to tutor ${focusCourse ? courseLabel(focusCourse) : 'in the School of ICT'}.`,
    '',
    'I would like to discuss the role with you. Are you available for a short meeting in the coming week?',
    '',
    'Kind regards,',
    profile?.fullName ?? '',
    'School of Information and Communication Technology',
    'Griffith University',
  ].join('\n')

  return (
    <>
      <Link to="/app/applicants" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 15l-5-5 5-5" /></svg>
        Back to applicants
      </Link>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Avatar name={app.fullName} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">{app.fullName}</h1>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-1 text-sm text-ink-600">
            {app.studentNumber} · {app.program ?? '—'}
            {app.campus && <> · {app.campus}</>}
          </p>
          <p className="mt-0.5 text-sm text-ink-500">
            Applied {formatDate(a.submittedAt)}
            {a.updatedAt && a.updatedAt !== a.submittedAt && (
              <> · last updated {relativeTime(a.updatedAt)}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={mailto(app.email, emailSubject, emailBody)}>
            <Button icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6l7 5 7-5M3 5h14v10H3z" /></svg>
            }>Email applicant</Button>
          </a>
          <Button variant="secondary" onClick={() => setContactOpen(true)}>Log contact</Button>
          <Button variant="secondary" onClick={() => setAllocOpen(true)}>Allocate</Button>
        </div>
      </div>

      {/* Decision bar — the primary action on this page. */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <p className="text-sm font-medium text-ink-800">Move to:</p>
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE.map((s) => (
              <button
                key={s}
                disabled={busy || a.status === s}
                onClick={() => setStatus(s)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                  a.status === s
                    ? 'border-griffith-700 bg-griffith-700 text-white'
                    : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-50 disabled:opacity-50'
                }`}
              >
                {APPLICATION_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Statement ------------------------------------------------ */}
          <Card>
            <CardHeader title="Why they are qualified" description="In the applicant's own words" />
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{a.statement}</p>
            </div>
          </Card>

          {/* Course preferences --------------------------------------- */}
          <Card>
            <CardHeader title="Courses nominated" description="In the applicant's ranked order" />
            <ul className="divide-y divide-ink-200">
              {a.preferences.map((p) => {
                const isFocus = p.courseCode === focusCourse
                const timesTaught = a.experience.filter((e) => e.courseCode === p.courseCode).length
                return (
                  <li key={p.id} className={`px-5 py-3.5 ${isFocus ? 'bg-griffith-50/50' : ''}`}>
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                        {p.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-ink-900">{courseLabel(p.courseCode)}</p>
                          {isFocus && <Badge tone="brand">Your course</Badge>}
                          {timesTaught > 0 && <Badge tone="success">Tutored {timesTaught}×</Badge>}
                        </div>
                        {p.note && <p className="mt-1 text-sm text-ink-600">{p.note}</p>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* Teaching history ------------------------------------------ */}
          <Card>
            <CardHeader title="Teaching history" description={`${a.experience.length} recorded ${a.experience.length === 1 ? 'role' : 'roles'}`} />
            {a.experience.length === 0 ? (
              <EmptyState title="No prior teaching recorded"
                          description="This would be their first tutoring role." />
            ) : (
              <ul className="divide-y divide-ink-200">
                {a.experience.map((e) => (
                  <li key={e.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink-900">
                        {e.courseCode ? courseLabel(e.courseCode) : e.externalCourseName}
                      </p>
                      {e.isVerified
                        ? <Badge tone="success">Verified</Badge>
                        : <Badge tone="neutral">Self-reported</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {trimesterShort(e.year, e.trimester)} · {TUTOR_ROLE_LABEL[e.role]}
                      {e.hoursPerWeek ? ` · ${e.hoursPerWeek} hrs/week` : ''}
                      {e.institution !== 'Griffith University' ? ` · ${e.institution}` : ''}
                    </p>
                    {e.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{e.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Review notes ----------------------------------------------- */}
          <Card>
            <CardHeader title="Review notes" description="Visible to staff only — never to the applicant" />
            <div className="border-b border-ink-200 p-5">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="Record your assessment, or what you agreed with the applicant." />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={addNote} loading={busy} disabled={!note.trim()}>Add note</Button>
              </div>
            </div>
            {a.notes.length === 0 ? (
              <EmptyState title="No notes yet" description="Notes help other convenors and the School office follow the decision." />
            ) : (
              <ul className="divide-y divide-ink-200">
                {a.notes.map((n) => (
                  <li key={n.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={n.authorName} size={22} />
                      <p className="text-sm font-medium text-ink-900">{n.authorName}</p>
                      <p className="text-xs text-ink-400">{relativeTime(n.createdAt)}</p>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Sidebar ------------------------------------------------------ */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Contact details" />
            <dl className="divide-y divide-ink-200 text-sm">
              {[
                ['Email', <a key="e" href={`mailto:${app.email}`} className="text-griffith-700 hover:underline break-all">{app.email}</a>],
                ['Phone', app.phone ?? '—'],
                ['Student number', app.studentNumber ?? '—'],
                ['Program', app.program ?? '—'],
                ['Campus', app.campus ?? '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 px-5 py-2.5">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Availability" />
            <dl className="divide-y divide-ink-200 text-sm">
              <div className="flex justify-between gap-3 px-5 py-2.5">
                <dt className="text-ink-500">Max hours/week</dt>
                <dd className="font-medium text-ink-800">{a.hoursPerWeek}</dd>
              </div>
              <div className="flex justify-between gap-3 px-5 py-2.5">
                <dt className="text-ink-500">Days</dt>
                <dd className="font-medium text-ink-800">{a.availableDays.join(', ') || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3 px-5 py-2.5">
                <dt className="text-ink-500">Work rights</dt>
                <dd className="font-medium text-ink-800">{app.hasWorkRights ? 'Yes' : 'Not stated'}</dd>
              </div>
              <div className="flex justify-between gap-3 px-5 py-2.5">
                <dt className="text-ink-500">Blue Card</dt>
                <dd className="font-medium text-ink-800">{app.hasBlueCard ? 'Yes' : 'Not stated'}</dd>
              </div>
              {a.resumeUrl && (
                <div className="px-5 py-2.5">
                  <a href={a.resumeUrl} target="_blank" rel="noreferrer"
                     className="text-sm font-medium text-griffith-700 hover:underline">View CV →</a>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Current allocations"
                        description="Existing teaching load across the School" />
            {a.currentAssignments.length === 0 ? (
              <EmptyState title="No current allocations" />
            ) : (
              <ul className="divide-y divide-ink-200">
                {a.currentAssignments.map((asg) => (
                  <li key={asg.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">{asg.courseCode}</p>
                        <p className="text-xs text-ink-500">
                          {trimesterShort(asg.year, asg.trimester)} · {asg.hoursPerWeek} hrs/week
                        </p>
                      </div>
                      <AssignmentBadge status={asg.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Contact log" description="Who has already reached out" />
            {a.contactLog.length === 0 ? (
              <EmptyState title="No contact recorded"
                          description="Log your emails so other convenors do not approach the same person twice." />
            ) : (
              <ul className="divide-y divide-ink-200">
                {a.contactLog.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-ink-900">{c.subject}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {c.lecturerName} · {c.method} · {formatDateTime(c.contactedAt)}
                    </p>
                    {c.notes && <p className="mt-1 text-sm text-ink-600">{c.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <AllocateModal
        open={allocOpen} onClose={() => setAllocOpen(false)}
        profileId={app.id} name={app.fullName}
        defaultCourse={focusCourse ?? a.preferences[0]?.courseCode ?? ''}
        courses={a.preferences.map((p) => p.courseCode)}
        onSaved={() => { setAllocOpen(false); state.reload() }}
      />

      <ContactModal
        open={contactOpen} onClose={() => setContactOpen(false)}
        applicationId={a.id} defaultSubject={emailSubject}
        onSaved={() => { setContactOpen(false); state.reload() }}
      />
    </>
  )
}

function AllocateModal({ open, onClose, profileId, name, defaultCourse, courses, onSaved }: {
  open: boolean; onClose: () => void; profileId: string; name: string
  defaultCourse: string; courses: string[]; onSaved: () => void
}) {
  const provider = getProvider()
  const { push } = useToast()
  const thisYear = new Date().getFullYear()

  const [courseCode, setCourseCode] = useState(defaultCourse)
  const [year, setYear] = useState(thisYear)
  const [trimester, setTrimester] = useState<Trimester>(1)
  const [role, setRole] = useState<TutorRole>('tutor')
  const [hours, setHours] = useState(6)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await provider.createAssignment({
        profileId, courseCode, year, trimester, role,
        hoursPerWeek: hours, status: 'proposed',
      })
      push('success', `${name} allocated to ${courseCode}.`)
      onSaved()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Allocate ${name}`}
           description="Creates a proposed allocation. Confirm it once the applicant accepts."
           footer={<>
             <Button variant="secondary" onClick={onClose}>Cancel</Button>
             <Button onClick={save} loading={busy} disabled={!courseCode}>Create allocation</Button>
           </>}>
      <div className="space-y-4">
        <Field label="Course" required hint="Limited to courses you convene.">
          <Select value={courseCode} onChange={(e) => setCourseCode(e.target.value)}>
            <option value="">Select…</option>
            {courses.map((c) => <option key={c} value={c}>{courseLabel(c)}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Year">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
          <Field label="Trimester">
            <Select value={trimester} onChange={(e) => setTrimester(Number(e.target.value) as Trimester)}>
              <option value={1}>T1</option><option value={2}>T2</option><option value={3}>T3</option>
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
            <Input type="number" min={1} max={30} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

function ContactModal({ open, onClose, applicationId, defaultSubject, onSaved }: {
  open: boolean; onClose: () => void; applicationId: string; defaultSubject: string; onSaved: () => void
}) {
  const provider = getProvider()
  const { push } = useToast()
  const [method, setMethod] = useState<'email' | 'meeting' | 'phone' | 'other'>('email')
  const [subject, setSubject] = useState(defaultSubject)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await provider.logContact({
        applicationId, method, subject: subject.trim(),
        notes: notes.trim() || null, contactedAt: new Date().toISOString(),
      })
      push('success', 'Contact recorded.')
      setNotes('')
      onSaved()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log contact"
           description="Keeps a record so two convenors do not approach the same applicant unknowingly."
           footer={<>
             <Button variant="secondary" onClick={onClose}>Cancel</Button>
             <Button onClick={save} loading={busy} disabled={!subject.trim()}>Save</Button>
           </>}>
      <div className="space-y-4">
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="phone">Phone</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Subject" required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Notes" hint="Optional — what was discussed or agreed.">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
