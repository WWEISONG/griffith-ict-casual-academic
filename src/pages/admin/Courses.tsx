import { useMemo, useState } from 'react'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/layout/AppShell'
import { Avatar, Badge, Card, EmptyState, ErrorState, Input, LoadingState, Select } from '@/components/ui'
import { ICT_COURSES, levelShortLabel } from '@/data/courses'

export function Courses() {
  const provider = getProvider()
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)

  const state = useAsync(async () => {
    const [courseLecturers, profiles] = await Promise.all([
      provider.listCourseLecturers(),
      provider.listProfiles(),
    ])
    return { courseLecturers, profiles }
  }, [])

  const byCourse = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const cl of state.data?.courseLecturers ?? []) {
      m.set(cl.courseCode, [...(m.get(cl.courseCode) ?? []), cl.lecturerId])
    }
    return m
  }, [state.data])

  const nameById = useMemo(
    () => new Map((state.data?.profiles ?? []).map((p) => [p.id, p.fullName])),
    [state.data],
  )

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />

  let rows = ICT_COURSES
  if (q) rows = rows.filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase()))
  if (level) rows = rows.filter((c) => String(c.level) === level)
  if (onlyUnassigned) rows = rows.filter((c) => !byCourse.has(c.code))

  const assignedCount = ICT_COURSES.filter((c) => byCourse.has(c.code)).length

  return (
    <>
      <PageHeader
        title="Courses & convenors"
        description={`${ICT_COURSES.length} courses in the School of ICT catalogue. Assign convenors from the Accounts page.`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Courses</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{ICT_COURSES.length}</p>
        </div>
        <div className="card px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">With a convenor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{assignedCount}</p>
        </div>
        <div className="card px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Unassigned</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">{ICT_COURSES.length - assignedCount}</p>
        </div>
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input placeholder="Search by code or title…" value={q}
                   onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
          </div>
          <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level">
            <option value="">All levels</option>
            <option value="1">Undergraduate — Year 1</option>
            <option value="2">Undergraduate — Year 2</option>
            <option value="3">Undergraduate — Year 3</option>
            <option value="6">Honours / Research</option>
            <option value="7">Postgraduate</option>
          </Select>
        </div>
        <div className="flex items-center gap-4 border-t border-ink-200 px-4 py-2.5">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={onlyUnassigned} onChange={(e) => setOnlyUnassigned(e.target.checked)}
                   className="h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
            Only courses without a convenor
          </label>
          <p className="ml-auto text-sm text-ink-500">{rows.length} shown</p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState title="No courses match" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th scope="col" className="px-4 py-2.5">Code</th>
                  <th scope="col" className="px-4 py-2.5">Title</th>
                  <th scope="col" className="px-4 py-2.5">Level</th>
                  <th scope="col" className="px-4 py-2.5">Convenor(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rows.map((c) => {
                  const lecturers = byCourse.get(c.code) ?? []
                  return (
                    <tr key={c.code} className={lecturers.length === 0 ? 'bg-amber-50/40' : undefined}>
                      <td className="px-4 py-2.5 font-medium text-ink-900">{c.code}</td>
                      <td className="px-4 py-2.5 text-ink-700">{c.title}</td>
                      <td className="px-4 py-2.5"><Badge tone="neutral">{levelShortLabel(c.level)}</Badge></td>
                      <td className="px-4 py-2.5">
                        {lecturers.length === 0 ? (
                          <span className="text-xs text-amber-700">Not assigned</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {lecturers.map((id) => (
                              <span key={id} className="inline-flex items-center gap-1.5 text-xs text-ink-700">
                                <Avatar name={nameById.get(id) ?? '?'} size={20} />
                                {nameById.get(id) ?? 'Unknown'}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
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
