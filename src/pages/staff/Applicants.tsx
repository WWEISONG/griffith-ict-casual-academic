// ---------------------------------------------------------------------------
// The applicant list — a convenor's landing page and main workspace.
//
// Designed around the fact that convenors are busy: the list arrives already
// filtered to their courses and already ranked, bulk actions cover the common
// case of triaging many people at once, and the coverage warning appears here
// rather than on a separate dashboard nobody would open.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, Modal, Select } from '@/components/ui'
import { COURSE_BY_CODE, ICT_COURSES } from '@/data/courses'
import { downloadTextFile, formatDate } from '@/lib/utils'
import { APPLICATION_STATUS_LABEL, type ApplicantRow, type ApplicationStatus } from '@/types'

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABEL)
  .filter(([v]) => v !== 'draft') as Array<[ApplicationStatus, string]>

/** Actions offered in the bulk bar, in the order a convenor works through them. */
const BULK: Array<[ApplicationStatus, string]> = [
  ['under_review', 'Mark reviewing'],
  ['shortlisted', 'Shortlist'],
  ['unsuccessful', 'Not successful'],
]

export function Applicants() {
  const provider = getProvider()
  const { isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()
  const [params, setParams] = useSearchParams()

  const courseCode = params.get('course') ?? ''
  const status = params.get('status') ?? ''
  const search = params.get('q') ?? ''
  const experiencedOnly = params.get('experienced') === '1'

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [myCourseCodes, setMyCourseCodes] = useState<string[]>([])

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
    setSelected(new Set())
  }

  // "__mine" is a scope rather than a course: it expands to whichever courses
  // this staff member has nominated as theirs.
  const filter = useMemo(() => ({
    courseCode: courseCode && courseCode !== '__mine' ? courseCode : undefined,
    courseCodes: courseCode === '__mine' ? myCourseCodes : undefined,
    status: status ? [status as ApplicationStatus] : undefined,
    search: search || undefined,
    experiencedOnly: experiencedOnly || undefined,
  }), [courseCode, myCourseCodes, status, search, experiencedOnly])

  const state = useAsync(async () => {
    const [rows, allCourses, myCourses, demand] = await Promise.all([
      provider.listApplicants(filter),
      provider.listCourses(),
      provider.coursesForLecturer(profile!.id),
      provider.getCourseDemand(),
    ])
    return { rows, allCourses, myCourses, demand }
  }, [filter, profile?.id, nonce])

  const rows = state.data?.rows ?? []
  const allCourses = state.data?.allCourses ?? ICT_COURSES
  const myCourses = state.data?.myCourses ?? []
  const covered = new Set((state.data?.demand ?? []).map((d) => d.courseCode))
  const uncovered = myCourses.filter((c) => !covered.has(c.code))

  useEffect(() => {
    if (state.data) setMyCourseCodes(state.data.myCourses.map((c) => c.code))
  }, [state.data])

  const open = (r: ApplicantRow) =>
    navigate(`/app/applicants/${r.applicationId}?course=${r.matchedCourseCode}`)

  async function bulkSet(newStatus: ApplicationStatus) {
    setBusy(true)
    const ids = [...new Set([...selected].map((k) => k.split('::')[0]))]
    try {
      await Promise.all(ids.map((id) => provider.setApplicationStatus(id, newStatus)))
      push('success', `${ids.length} ${ids.length === 1 ? 'application' : 'applications'} updated.`)
      setSelected(new Set())
      state.reload()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  /** Addresses for the current selection, de-duplicated. */
  function selectedEmails(): string[] {
    const wanted = new Set([...selected].map((k) => k.split('::')[0]))
    return [...new Set(rows.filter((r) => wanted.has(r.applicationId)).map((r) => r.email))]
  }

  async function copyEmails() {
    const list = selectedEmails().join('; ')
    try {
      await navigator.clipboard.writeText(list)
      push('success', `${selectedEmails().length} email ${selectedEmails().length === 1 ? 'address' : 'addresses'} copied.`)
    } catch {
      // Clipboard access can be refused; fall back to something usable.
      window.prompt('Copy these addresses:', list)
    }
  }

  /** Group email with everyone on Bcc, so applicants do not see each other. */
  function groupMailto(): string {
    const list = selectedEmails().join(',')
    const params = new URLSearchParams({
      bcc: list,
      subject: `ICT tutoring — ${courseCode || 'School of ICT'}`,
    })
    return `mailto:?${params.toString().replace(/\+/g, '%20')}`
  }

  async function exportCsv() {
    try {
      const csv = await provider.exportApplicantsCsv(filter)
      downloadTextFile(`ict-applicants-${courseCode || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`, csv)
      push('success', 'Export downloaded.')
    } catch (e) { push('error', (e as Error).message) }
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(key(r)))

  return (
    <>
      <PageHeader
        title={isAdmin ? 'All applicants' : 'Applicants'}
        description={isAdmin
          ? 'Every submitted application across the School of ICT.'
          : 'Everyone who nominated one of your courses, strongest matches first.'}
        action={<Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>}
      />

      {/* Coverage warning lives here, not on a dashboard — this is the page
          convenors actually open. */}
      {myCourses.length === 0 && !isAdmin && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900">Tell us which courses are yours</p>
            <p className="mt-0.5 text-xs text-ink-600">
              You can see every applicant in the School. Choosing your courses gives you a
              one-click filter and warns you when one of them has no applicants.
            </p>
          </div>
          <Button size="sm" onClick={() => setPickerOpen(true)}>Choose courses</Button>
        </div>
      )}

      {uncovered.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-900">
              {uncovered.length} of your {myCourses.length} courses {uncovered.length === 1 ? 'has' : 'have'} no applicants
            </p>
            <p className="mt-0.5 truncate text-xs text-amber-800">
              {uncovered.slice(0, 6).map((c) => c.code).join(', ')}
              {uncovered.length > 6 && ` and ${uncovered.length - 6} more`}
            </p>
          </div>
          <Link to="/app/demand"><Button size="sm" variant="secondary">See coverage</Button></Link>
        </div>
      )}

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Input placeholder="Search name, email or student number…" value={search}
                   onChange={(e) => setParam('q', e.target.value)} aria-label="Search applicants" />
          </div>
          <div className="flex gap-2">
            <Select value={courseCode} onChange={(e) => setParam('course', e.target.value)}
                    aria-label="Filter by course" className="min-w-0 flex-1">
              <option value="">All courses ({allCourses.length})</option>
              {myCourses.length > 0 && (
                <optgroup label="My courses">
                  <option value="__mine">★ My courses ({myCourses.length})</option>
                  {myCourses.map((c) => (
                    <option key={`mine-${c.code}`} value={c.code}>{c.code} — {c.title}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All School of ICT courses">
                {allCourses.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
              </optgroup>
            </Select>
            <Button variant="secondary" onClick={() => setPickerOpen(true)}
                    title="Choose which courses are yours">
              My courses
            </Button>
          </div>
          <Select value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by status">
            <option value="">Any status</option>
            {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-ink-200 px-4 py-2.5">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={experiencedOnly}
                   onChange={(e) => setParam('experienced', e.target.checked ? '1' : '')}
                   className="h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
            Has tutored this course before
          </label>
          <p className="ml-auto text-sm text-ink-500">
            {state.loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'match' : 'matches'}`}
          </p>
        </div>
      </Card>

      {/* Bulk action bar — appears only when something is selected. */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-griffith-200 bg-griffith-50 px-4 py-2.5 shadow-card">
          <p className="text-sm font-medium text-griffith-900">
            {selected.size} selected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BULK.map(([s, label]) => (
              <Button key={s} size="sm" variant="secondary" disabled={busy} onClick={() => bulkSet(s)}>
                {label}
              </Button>
            ))}
            <span className="mx-1 w-px self-stretch bg-griffith-200" aria-hidden="true" />
            <Button size="sm" variant="secondary" onClick={copyEmails}>Copy emails</Button>
            <a href={groupMailto()}>
              <Button size="sm" variant="secondary">Email all</Button>
            </a>
          </div>
          <button onClick={() => setSelected(new Set())}
                  className="ml-auto text-sm font-medium text-ink-600 hover:text-ink-900">
            Clear
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        {state.loading ? <LoadingState />
         : state.error ? <ErrorState message={state.error} onRetry={state.reload} />
         : rows.length === 0 ? (
          <EmptyState
            title="No applicants match"
            description="Try clearing a filter, or check back once more applications are submitted." 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium text-ink-500">
                  <th scope="col" className="w-10 px-4 py-2.5">
                    <input type="checkbox" aria-label="Select all"
                           checked={allSelected}
                           onChange={(e) => setSelected(e.target.checked ? new Set(rows.map(key)) : new Set())}
                           className="h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
                  </th>
                  <th scope="col" className="px-4 py-2.5">Applicant</th>
                  <th scope="col" className="px-4 py-2.5">Course</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Pref.</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Taught before</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Load</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rows.map((r) => {
                  const k = key(r)
                  return (
                    <tr key={k} className="row-link">
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.fullName}`}
                          checked={selected.has(k)}
                          onChange={(e) => setSelected((s) => {
                            const next = new Set(s)
                            if (e.target.checked) next.add(k); else next.delete(k)
                            return next
                          })}
                          className="h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600"
                        />
                      </td>
                      <td className="px-4 py-3" tabIndex={0} onClick={() => open(r)}
                          onKeyDown={(e) => { if (e.key === 'Enter') open(r) }}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.fullName} size={32} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">{r.fullName}</p>
                            {/* Contact happens over email, so the address belongs
                                here rather than one click away. */}
                            <a
                              href={`mailto:${r.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="truncate block text-xs text-griffith-700 hover:underline"
                            >
                              {r.email}
                            </a>
                            <p className="truncate text-xs text-ink-500">{r.studentNumber} · {r.program ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={() => open(r)}>
                        <p className="font-medium text-ink-800">{r.matchedCourseCode}</p>
                        <p className="truncate text-xs text-ink-500">{COURSE_BY_CODE[r.matchedCourseCode]?.title}</p>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={() => open(r)}>
                        <Badge tone={r.matchedRank === 1 ? 'brand' : 'neutral'}>#{r.matchedRank}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={() => open(r)}>
                        {r.priorTimesTaught > 0
                          ? <Badge tone="success">{r.priorTimesTaught}×</Badge>
                          : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={() => open(r)}>
                        {/* Heavy existing load is the usual reason not to offer
                            more work to an otherwise strong candidate. */}
                        <span className={r.currentLoadHours >= 12 ? 'font-semibold text-amber-700' : 'text-ink-600'}>
                          {r.currentLoadHours > 0 ? `${r.currentLoadHours}h` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={() => open(r)}><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-xs text-ink-500" onClick={() => open(r)}>{formatDate(r.submittedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <MyCoursesModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        lecturerId={profile!.id}
        current={myCourseCodes}
        onSaved={() => { setPickerOpen(false); setNonce((n) => n + 1) }}
      />
    </>
  )
}

/**
 * Lets a staff member nominate the courses they convene. This is a personal
 * filter, not an access grant — they can see every applicant either way.
 */
function MyCoursesModal({ open, onClose, lecturerId, current, onSaved }: {
  open: boolean; onClose: () => void; lecturerId: string
  current: string[]; onSaved: () => void
}) {
  const provider = getProvider()
  const { push } = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set(current))
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setSelected(new Set(current)) }, [current, open])

  const shown = q
    ? ICT_COURSES.filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase()))
    : ICT_COURSES

  async function save() {
    setBusy(true)
    try {
      await provider.setCourseLecturers(lecturerId, [...selected])
      push('success', 'Your courses have been saved.')
      onSaved()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} wide onClose={onClose} title="My courses"
           description="Used to filter your view and to warn you when one of your courses has no applicants. You can see all applicants regardless."
           footer={<>
             <span className="mr-auto text-sm text-ink-500">{selected.size} selected</span>
             <Button variant="secondary" onClick={onClose}>Cancel</Button>
             <Button onClick={save} loading={busy}>Save</Button>
           </>}>
      <Input placeholder="Search by code or title…" value={q} onChange={(e) => setQ(e.target.value)}
             className="mb-3" aria-label="Search courses" autoFocus />
      <div className="max-h-96 divide-y divide-ink-200 overflow-y-auto rounded-lg border border-ink-200">
        {shown.map((c) => (
          <label key={c.code} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink-50">
            <input type="checkbox" checked={selected.has(c.code)}
                   onChange={(e) => setSelected((s) => {
                     const next = new Set(s)
                     if (e.target.checked) next.add(c.code); else next.delete(c.code)
                     return next
                   })}
                   className="h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
            <span className="min-w-0">
              <span className="text-sm font-medium text-ink-900">{c.code}</span>
              <span className="ml-2 text-sm text-ink-600">{c.title}</span>
            </span>
          </label>
        ))}
        {shown.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-500">No courses match.</p>}
      </div>
    </Modal>
  )
}

/** A row is identified by application + the course it matched on. */
function key(r: ApplicantRow): string {
  return `${r.applicationId}::${r.matchedCourseCode}`
}
