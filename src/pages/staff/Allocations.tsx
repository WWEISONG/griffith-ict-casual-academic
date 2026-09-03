import { useMemo, useState } from 'react'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/layout/AppShell'
import { AssignmentBadge } from '@/components/app/StatusBadge'
import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState, Select } from '@/components/ui'
import { COURSE_BY_CODE } from '@/data/courses'
import { downloadTextFile, toCsv, trimesterShort } from '@/lib/utils'
import { TUTOR_ROLE_LABEL, type AssignmentStatus } from '@/types'

export function Allocations() {
  const provider = getProvider()
  const { isAdmin } = useAuth()
  const { push } = useToast()
  const [period, setPeriod] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const state = useAsync(async () => {
    const [assignments, profiles] = await Promise.all([
      provider.listAssignments(),
      provider.listProfiles(),
    ])
    return { assignments, profiles }
  }, [])

  const byId = useMemo(
    () => new Map((state.data?.profiles ?? []).map((p) => [p.id, p])),
    [state.data],
  )

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />

  const all = state.data!.assignments
  const periods = [...new Set(all.map((a) => `${a.year}-${a.trimester}`))].sort().reverse()
  const rows = period ? all.filter((a) => `${a.year}-${a.trimester}` === period) : all

  async function setStatus(id: string, status: AssignmentStatus) {
    setBusy(id)
    try {
      await provider.updateAssignment(id, { status })
      push('success', 'Allocation updated.')
      state.reload()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(null) }
  }

  function exportCsv() {
    downloadTextFile(
      `ict-allocations-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(['Course', 'Title', 'Trimester', 'Tutor', 'Email', 'Role', 'Hours/week', 'Status'],
        rows.map((a) => {
          const p = byId.get(a.profileId)
          return [
            a.courseCode, COURSE_BY_CODE[a.courseCode]?.title ?? '',
            trimesterShort(a.year, a.trimester), p?.fullName ?? '', p?.email ?? '',
            TUTOR_ROLE_LABEL[a.role], a.hoursPerWeek, a.status,
          ]
        })),
    )
  }

  const totalHours = rows.filter((a) => a.status === 'confirmed').reduce((s, a) => s + a.hoursPerWeek, 0)

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Tutor allocations' : 'My tutors'}
        description="Who is teaching what, and for how many hours."
        action={<Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>}
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="w-full sm:w-56">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Filter by trimester">
              <option value="">All trimesters</option>
              {periods.map((p) => {
                const [y, t] = p.split('-')
                return <option key={p} value={p}>{trimesterShort(Number(y), Number(t))}</option>
              })}
            </Select>
          </div>
          <p className="ml-auto text-sm text-ink-600">
            <strong className="font-semibold text-ink-900">{rows.length}</strong> allocations ·{' '}
            <strong className="font-semibold text-ink-900">{totalHours}</strong> confirmed hrs/week
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No allocations yet"
                      description="Allocate a tutor from an applicant's page to see them here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium text-ink-500">
                  <th scope="col" className="px-4 py-2.5">Tutor</th>
                  <th scope="col" className="px-4 py-2.5">Course</th>
                  <th scope="col" className="px-4 py-2.5">Trimester</th>
                  <th scope="col" className="px-4 py-2.5">Role</th>
                  <th scope="col" className="px-4 py-2.5 text-center">Hrs/wk</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rows.map((a) => {
                  const p = byId.get(a.profileId)
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p?.fullName ?? '?'} size={30} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">{p?.fullName ?? 'Unknown'}</p>
                            <p className="truncate text-xs text-ink-500">{p?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-800">{a.courseCode}</p>
                        <p className="truncate text-xs text-ink-500">{COURSE_BY_CODE[a.courseCode]?.title}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-700">{trimesterShort(a.year, a.trimester)}</td>
                      <td className="px-4 py-3 text-ink-700">{TUTOR_ROLE_LABEL[a.role]}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-ink-700">{a.hoursPerWeek}</td>
                      <td className="px-4 py-3"><AssignmentBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {a.status === 'proposed' && (
                            <Button size="sm" loading={busy === a.id} onClick={() => setStatus(a.id, 'confirmed')}>
                              Confirm
                            </Button>
                          )}
                          {a.status === 'confirmed' && (
                            <Button size="sm" variant="secondary" loading={busy === a.id}
                                    onClick={() => setStatus(a.id, 'completed')}>
                              Mark complete
                            </Button>
                          )}
                          {a.status !== 'cancelled' && a.status !== 'completed' && (
                            <Button size="sm" variant="ghost" loading={busy === a.id}
                                    onClick={() => setStatus(a.id, 'cancelled')}>
                              Cancel
                            </Button>
                          )}
                        </div>
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
