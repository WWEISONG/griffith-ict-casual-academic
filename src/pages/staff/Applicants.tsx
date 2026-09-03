// ---------------------------------------------------------------------------
// The applicant list — a convenor's landing page and main workspace.
//
// Designed around the fact that convenors are busy: the list arrives already
// filtered to their courses and already ranked, bulk actions cover the common
// case of triaging many people at once, and the coverage warning appears here
// rather than on a separate dashboard nobody would open.
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, Select } from '@/components/ui'
import { COURSE_BY_CODE } from '@/data/courses'
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

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
    setSelected(new Set())
  }

  const filter = useMemo(() => ({
    courseCode: courseCode || undefined,
    status: status ? [status as ApplicationStatus] : undefined,
    search: search || undefined,
    experiencedOnly: experiencedOnly || undefined,
  }), [courseCode, status, search, experiencedOnly])

  const state = useAsync(async () => {
    const [rows, myCourses, demand] = await Promise.all([
      provider.listApplicants(filter),
      isAdmin ? provider.listCourses() : provider.coursesForLecturer(profile!.id),
      provider.getCourseDemand(),
    ])
    return { rows, myCourses, demand }
  }, [filter, isAdmin, profile?.id])

  const rows = state.data?.rows ?? []
  const courses = state.data?.myCourses ?? []
  const covered = new Set((state.data?.demand ?? []).map((d) => d.courseCode))
  const uncovered = courses.filter((c) => !covered.has(c.code))

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
      {uncovered.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-900">
              {uncovered.length} of your {courses.length} courses {uncovered.length === 1 ? 'has' : 'have'} no applicants
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
          <Select value={courseCode} onChange={(e) => setParam('course', e.target.value)} aria-label="Filter by course">
            <option value="">{isAdmin ? 'All courses' : 'All my courses'}</option>
            {courses.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
          </Select>
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
            description={courses.length === 0
              ? 'You are not listed as the convenor of any course yet. Ask the School administrator to assign your courses.'
              : 'Try clearing a filter, or check back once more applications are submitted.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium uppercase tracking-wide text-ink-500">
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
                  <th scope="col" className="px-4 py-2.5 text-center">GPA</th>
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
                      <td className="px-4 py-3 text-center tabular-nums text-ink-700" onClick={() => open(r)}>
                        {r.gpa?.toFixed(2) ?? '—'}
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
    </>
  )
}

/** A row is identified by application + the course it matched on. */
function key(r: ApplicantRow): string {
  return `${r.applicationId}::${r.matchedCourseCode}`
}
