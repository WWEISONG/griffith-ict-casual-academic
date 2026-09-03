import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Button, Card, ErrorState, Input, LoadingState, Meter } from '@/components/ui'
import { ICT_COURSES, levelShortLabel } from '@/data/courses'
import { downloadTextFile, toCsv } from '@/lib/utils'

type Mode = 'all' | 'uncovered' | 'contested'

export function CourseDemand() {
  const provider = getProvider()
  const [mode, setMode] = useState<Mode>('all')
  const [q, setQ] = useState('')

  const state = useAsync(async () => {
    const round = await provider.getActiveRound()
    return { round, demand: await provider.getCourseDemand(round?.id) }
  }, [])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />

  const { round, demand } = state.data!
  const byCode = new Map(demand.map((d) => [d.courseCode, d]))
  const peak = Math.max(1, ...demand.map((d) => d.applicants))

  let rows = ICT_COURSES.map((c) => ({
    ...c,
    applicants: byCode.get(c.code)?.applicants ?? 0,
    firstPreference: byCode.get(c.code)?.firstPreference ?? 0,
  }))

  if (mode === 'uncovered') rows = rows.filter((r) => r.applicants === 0)
  if (mode === 'contested') rows = rows.filter((r) => r.applicants > 0)
  if (q) {
    const needle = q.toLowerCase()
    rows = rows.filter((r) => `${r.code} ${r.title}`.toLowerCase().includes(needle))
  }
  rows.sort((a, b) => b.applicants - a.applicants || a.code.localeCompare(b.code))

  const uncoveredCount = ICT_COURSES.filter((c) => !byCode.has(c.code)).length

  function exportCsv() {
    downloadTextFile(
      `ict-course-demand-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(['Course code', 'Title', 'Level', 'Applicants', 'First preference'],
        rows.map((r) => [r.code, r.title, r.level, r.applicants, r.firstPreference])),
    )
  }

  return (
    <>
      <PageHeader
        title="Course demand"
        description={round
          ? `Applicant coverage across all ${ICT_COURSES.length} ICT courses for ${round.name}.`
          : 'Applicant coverage across all ICT courses.'}
        action={<Button variant="secondary" onClick={exportCsv}>Export CSV</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Courses covered</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{demand.length}</p>
        </div>
        <div className="card px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">No applicants</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-red-700">{uncoveredCount}</p>
        </div>
        <div className="card px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Most applied-for</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{peak}</p>
        </div>
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex gap-1.5">
            {([['all', 'All courses'], ['contested', 'With applicants'], ['uncovered', 'No applicants']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        mode === v ? 'border-griffith-700 bg-griffith-700 text-white'
                                   : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="ml-auto w-full sm:w-64">
            <Input placeholder="Filter courses…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter courses" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left">
              <tr className="text-xs font-medium uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-4 py-2.5">Course</th>
                <th scope="col" className="px-4 py-2.5">Level</th>
                <th scope="col" className="w-1/3 px-4 py-2.5">Applicants</th>
                <th scope="col" className="px-4 py-2.5 text-center">First pref.</th>
                <th scope="col" className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {rows.map((r) => (
                <tr key={r.code} className={r.applicants === 0 ? 'bg-red-50/40' : undefined}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-ink-900">{r.code}</p>
                    <p className="truncate text-xs text-ink-500">{r.title}</p>
                  </td>
                  <td className="px-4 py-2.5"><Badge tone="neutral">{levelShortLabel(r.level)}</Badge></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-ink-900">{r.applicants}</span>
                      <Meter value={r.applicants} max={peak} tone={r.applicants === 0 ? 'neutral' : 'brand'} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-ink-700">{r.firstPreference || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.applicants > 0 && (
                      <Link to={`/app/applicants?course=${r.code}`}
                            className="text-sm font-medium text-griffith-700 hover:underline">View</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
