// ---------------------------------------------------------------------------
// The tutor directory — the page that answers the actual problem.
//
// Convenors do not struggle to run a selection process; they struggle to find
// out who is available to teach a course at all. So this lists every
// registered student, and the primary filter is a course: everyone who has
// taught it, and everyone who has asked to.
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/layout/AppShell'
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, Select } from '@/components/ui'
import { ICT_COURSES } from '@/data/courses'
import { downloadTextFile, formatDate } from '@/lib/utils'
import type { StudentRow } from '@/types'

export function FindTutor() {
  const provider = getProvider()
  const navigate = useNavigate()
  const { push } = useToast()
  const [params, setParams] = useSearchParams()

  const search = params.get('q') ?? ''
  const course = params.get('course') ?? ''

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
  }

  const state = useAsync(() => provider.listStudents(search || undefined), [search])
  const courses = useAsync(() => provider.listCourses(), [])

  const rows = useMemo(() => {
    let r = state.data ?? []
    if (course) {
      // Anyone connected to the course, either way: they have taught it, or
      // they have asked to. Splitting that into a second control made the
      // convenor choose before seeing anything.
      r = r.filter((s) => s.tutoredCourses.includes(course) || s.appliedCourses.includes(course))
      // People who have actually taught it first.
      r = [...r].sort((a, b) => {
        const at = a.tutoredCourses.includes(course) ? 1 : 0
        const bt = b.tutoredCourses.includes(course) ? 1 : 0
        return bt - at || b.timesTutored - a.timesTutored
      })
    }
    return r
  }, [state.data, course])

  async function exportCsv() {
    try {
      downloadTextFile(
        `ict-tutors-${course || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`,
        await provider.exportStudentsCsv(search || undefined),
      )
      push('success', 'Export downloaded.')
    } catch (e) { push('error', (e as Error).message) }
  }

  const experienced = rows.filter((r) => r.timesTutored > 0).length

  return (
    <>
      <PageHeader
        title="All candidates"
        action={
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Input
            placeholder="Search name, email, student number or program…"
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
            aria-label="Search people"
          />
          <Select value={course} onChange={(e) => setParam('course', e.target.value)}
                  aria-label="Filter by course">
            <option value="">Any course</option>
            {(courses.data ?? ICT_COURSES).map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.title}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-ink-200 px-4 py-2.5 text-sm text-ink-500">
          {course && (
            <span>
              Everyone who has taught or applied for{' '}
              <strong className="font-medium text-ink-800">{course}</strong>
            </span>
          )}
          <span className="ml-auto">
            {state.loading ? 'Loading…'
              : `${rows.length} ${rows.length === 1 ? 'person' : 'people'} · ${experienced} with teaching experience`}
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {state.loading ? <LoadingState />
         : state.error ? <ErrorState message={state.error} onRetry={state.reload} />
         : rows.length === 0 ? (
          <EmptyState
            title={course ? `Nobody is connected to ${course} yet` : 'No one has registered yet'}
            description={course
              ? 'Nobody has taught this course or asked to. Try "Any course", or check back as students register.'
              : 'People appear here as soon as they register, whether or not they have applied.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium text-ink-500">
                  <th scope="col" className="px-4 py-2.5">Person</th>
                  <th scope="col" className="px-4 py-2.5">Teaching experience</th>
                  <th scope="col" className="px-4 py-2.5">Applied courses</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Load</th>
                  <th scope="col" className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rows.map((r) => (
                  <StudentLine key={r.id} row={r} course={course}
                               onOpen={() => navigate(`/app/people/${r.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

function StudentLine({ row, course, onOpen }: {
  row: StudentRow; course: string; onOpen: () => void
}) {
  const CourseChips = ({ codes, tone }: { codes: string[]; tone: 'success' | 'info' }) => {
    if (codes.length === 0) return <span className="text-ink-400">—</span>
    const shown = codes.slice(0, 3)
    return (
      <div className="flex flex-wrap gap-1">
        {shown.map((c) => (
          <Badge key={c} tone={c === course ? 'brand' : tone}>{c}</Badge>
        ))}
        {codes.length > shown.length && (
          <span className="self-center text-xs text-ink-500">+{codes.length - shown.length}</span>
        )}
      </div>
    )
  }

  return (
    <tr className="row-link" onClick={onOpen} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={row.fullName} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{row.fullName}</p>
            <a href={`mailto:${row.email}`} onClick={(e) => e.stopPropagation()}
               className="block truncate text-xs text-griffith-700 hover:underline">
              {row.email}
            </a>
            <p className="truncate text-xs text-ink-500">{row.program ?? '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><CourseChips codes={row.tutoredCourses} tone="success" /></td>
      <td className="px-4 py-3"><CourseChips codes={row.appliedCourses} tone="info" /></td>
      <td className="px-4 py-3 text-center">
        <span className={row.currentLoadHours >= 12 ? 'font-semibold text-amber-700' : 'text-ink-600'}>
          {row.currentLoadHours > 0 ? `${row.currentLoadHours}h` : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {row.applicationId
          ? <span className="text-xs text-ink-500">Applied {formatDate(row.appliedAt)}</span>
          : <span className="text-xs text-ink-400">No application</span>}
      </td>
    </tr>
  )
}
