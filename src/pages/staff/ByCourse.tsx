// ---------------------------------------------------------------------------
// Second list: pick a course, see who could teach it.
//
// Two groups, because they answer different questions: people who applied for
// it this time, and people who have taught it before — the latter often being
// the faster route to a tutor.
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/layout/AppShell'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Input, LoadingState } from '@/components/ui'
import { ICT_COURSES, levelShortLabel } from '@/data/courses'
import { formatDate } from '@/lib/utils'
import type { StudentRow } from '@/types'

export function ByCourse() {
  const provider = getProvider()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const code = params.get('course') ?? ''
  const [q, setQ] = useState('')

  const students = useAsync(() => provider.listStudents(), [])
  const all = students.data ?? []

  // Applicant counts per course drive the picker, so a convenor can see at a
  // glance which of their courses has nobody.
  const counts = useMemo(() => {
    const m = new Map<string, { applied: number; taught: number }>()
    for (const s of all) {
      for (const c of s.appliedCourses) {
        const e = m.get(c) ?? { applied: 0, taught: 0 }; e.applied++; m.set(c, e)
      }
      for (const c of s.tutoredCourses) {
        const e = m.get(c) ?? { applied: 0, taught: 0 }; e.taught++; m.set(c, e)
      }
    }
    return m
  }, [all])

  const listed = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ICT_COURSES
      .filter((c) => !needle || `${c.code} ${c.title}`.toLowerCase().includes(needle))
      .map((c) => ({ ...c, ...(counts.get(c.code) ?? { applied: 0, taught: 0 }) }))
      .sort((a, b) => (b.applied + b.taught) - (a.applied + a.taught) || a.code.localeCompare(b.code))
  }, [q, counts])

  if (students.loading) return <LoadingState />
  if (students.error) return <ErrorState message={students.error} onRetry={students.reload} />

  if (code) {
    const course = ICT_COURSES.find((c) => c.code === code)
    const applied = all.filter((s) => s.appliedCourses.includes(code))
    const taught = all.filter((s) => s.tutoredCourses.includes(code) && !s.appliedCourses.includes(code))

    return (
      <>
        <button onClick={() => setParams(new URLSearchParams(), { replace: true })}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 15l-5-5 5-5" /></svg>
          All courses
        </button>

        <PageHeader
          title={`${code} — ${course?.title ?? ''}`}
          description={`${applied.length} asked to teach it · ${taught.length} more have taught it before`}
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader title="Asked to teach this course"
                        description="Applied for it, most experienced first" />
            {applied.length === 0
              ? <EmptyState title="Nobody has applied for this course" />
              : <PersonList rows={applied} onOpen={(id) => navigate(`/app/people/${id}`)} highlight={code} />}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Has taught it before"
                        description="Did not apply this time — but worth asking" />
            {taught.length === 0
              ? <EmptyState title="No previous tutors on record" />
              : <PersonList rows={taught} onOpen={(id) => navigate(`/app/people/${id}`)} highlight={code} />}
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="By course"
        description="Pick a course to see who could teach it."
      />

      <Card className="mb-5">
        <div className="p-4">
          <Input placeholder="Search by code or title…" value={q}
                 onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left">
              <tr className="text-xs font-medium text-ink-500">
                <th scope="col" className="px-4 py-2.5">Course</th>
                <th scope="col" className="px-4 py-2.5">Level</th>
                <th scope="col" className="px-4 py-2.5 text-center">Applied</th>
                <th scope="col" className="px-4 py-2.5 text-center">Taught before</th>
                <th scope="col" className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {listed.map((c) => {
                const none = c.applied === 0 && c.taught === 0
                return (
                  <tr key={c.code} className="row-link" tabIndex={0}
                      onClick={() => setParams({ course: c.code })}
                      onKeyDown={(e) => { if (e.key === 'Enter') setParams({ course: c.code }) }}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink-900">{c.code}</p>
                      <p className="truncate text-xs text-ink-500">{c.title}</p>
                    </td>
                    <td className="px-4 py-2.5"><Badge tone="neutral">{levelShortLabel(c.level)}</Badge></td>
                    <td className="px-4 py-2.5 text-center tabular-nums">
                      {c.applied > 0 ? <Badge tone="info">{c.applied}</Badge> : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums">
                      {c.taught > 0 ? <Badge tone="success">{c.taught}</Badge> : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {none ? <span className="text-xs text-ink-400">Nobody yet</span>
                            : <span className="text-sm font-medium text-griffith-700">View</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function PersonList({ rows, onOpen, highlight }: {
  rows: StudentRow[]; onOpen: (id: string) => void; highlight: string
}) {
  return (
    <ul className="divide-y divide-ink-200">
      {rows.map((r) => (
        <li key={r.id} className="row-link px-5 py-3.5" tabIndex={0}
            onClick={() => onOpen(r.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(r.id) }}>
          <div className="flex items-start gap-3">
            <Avatar name={r.fullName} size={34} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink-900">{r.fullName}</p>
                {r.tutoredCourses.includes(highlight) && <Badge tone="success">Taught it</Badge>}
                {r.currentLoadHours >= 12 && <Badge tone="warning">{r.currentLoadHours}h load</Badge>}
              </div>
              <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()}
                 className="block truncate text-xs text-griffith-700 hover:underline">{r.email}</a>
              <p className="mt-0.5 text-xs text-ink-500">
                {r.program ?? '—'}
                {r.timesTutored > 0 && ` · ${r.timesTutored} tutoring ${r.timesTutored === 1 ? 'role' : 'roles'}`}
                {r.appliedAt && ` · applied ${formatDate(r.appliedAt)}`}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
