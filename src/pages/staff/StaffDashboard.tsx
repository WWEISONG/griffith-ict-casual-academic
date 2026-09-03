import { Link } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/lib/auth/AuthContext'
import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, LoadingState, Stat } from '@/components/ui'
import { COURSE_BY_CODE } from '@/data/courses'
import { formatDate } from '@/lib/utils'

export function StaffDashboard() {
  const provider = getProvider()
  const { profile, isAdmin } = useAuth()

  const state = useAsync(async () => {
    const round = await provider.getActiveRound()
    const [stats, demand, myCourses] = await Promise.all([
      provider.getDashboardStats(round?.id),
      provider.getCourseDemand(round?.id),
      isAdmin ? provider.listCourses() : provider.coursesForLecturer(profile!.id),
    ])
    return { round, stats, demand, myCourses }
  }, [isAdmin, profile?.id])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />

  const { round, stats, demand, myCourses } = state.data!
  const demandByCode = new Map(demand.map((d) => [d.courseCode, d]))

  // Courses I am responsible for that nobody has applied to — the number that
  // most often causes a scramble in week one.
  const uncovered = myCourses.filter((c) => !demandByCode.has(c.code))

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile?.fullName.split(' ')[0]}`}
        description={round
          ? `${round.name} · applications close ${formatDate(round.closesAt)}`
          : 'No recruitment round is currently open.'}
        action={<Link to="/app/applicants"><Button>Review applicants</Button></Link>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applicants" value={stats.totalApplicants} sub={`${stats.totalApplications} course nominations`} tone="brand" />
        <Stat label="Awaiting review" value={stats.submitted} sub="Not yet opened" />
        <Stat label="Shortlisted" value={stats.shortlisted} sub={`${stats.offered} offers made`} />
        <Stat label="Accepted" value={stats.accepted} sub={`${stats.activeAssignments} confirmed allocations`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Uncovered courses — deliberately first, because it is the item
            that needs action rather than the item that looks good. */}
        <Card>
          <CardHeader
            title={isAdmin ? 'Courses with no applicants' : 'Your courses with no applicants'}
            description="These need attention before the trimester starts"
            action={uncovered.length > 0 ? <Badge tone="danger">{uncovered.length}</Badge> : <Badge tone="success">All covered</Badge>}
          />
          {uncovered.length === 0 ? (
            <EmptyState title="Every course has at least one applicant"
                        description="Nothing needs chasing right now." />
          ) : (
            <ul className="max-h-80 divide-y divide-ink-200 overflow-y-auto">
              {uncovered.slice(0, 40).map((c) => (
                <li key={c.code} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900">{c.code}</p>
                    <p className="truncate text-xs text-ink-500">{c.title}</p>
                  </div>
                  <Badge tone="danger">0</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Most contested courses"
            description="Where you have the most choice"
            action={<Link to="/app/demand"><Button variant="ghost" size="sm">See all</Button></Link>}
          />
          {demand.length === 0 ? (
            <EmptyState title="No applications yet" />
          ) : (
            <ul className="divide-y divide-ink-200">
              {demand.slice(0, 8).map((d) => (
                <li key={d.courseCode} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900">{d.courseCode}</p>
                    <p className="truncate text-xs text-ink-500">{COURSE_BY_CODE[d.courseCode]?.title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink-900">{d.applicants}</p>
                    <p className="text-[11px] text-ink-500">{d.firstPreference} first pref.</p>
                  </div>
                  <Link to={`/app/applicants?course=${d.courseCode}`}
                        className="shrink-0 text-sm font-medium text-griffith-700 hover:underline">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
