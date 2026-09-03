// ---------------------------------------------------------------------------
// Everything known about one person, on one page.
//
// No review pipeline: the School's decision-making happens over email, so this
// gives a convenor what they need to write that email and nothing else.
// ---------------------------------------------------------------------------
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, LoadingState,
} from '@/components/ui'
import { courseLabel } from '@/data/courses'
import { formatDate, mailto, relativeTime, trimesterShort } from '@/lib/utils'
import { TUTOR_ROLE_LABEL } from '@/types'

export function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const provider = getProvider()
  const { profile: me } = useAuth()
  const navigate = useNavigate()

  const state = useAsync(async () => {
    const [person, experience, assignments] = await Promise.all([
      provider.getProfile(id!),
      provider.studentExperience(id!),
      provider.listAssignments({ profileId: id! }),
    ])
    // Their application, if they have one.
    const rows = await provider.listStudents()
    const row = rows.find((r) => r.id === id)
    const application = row?.applicationId
      ? await provider.getApplicationDetail(row.applicationId)
      : null
    return { person, experience, assignments, application, row }
  }, [id])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />
  if (!state.data?.person) return <EmptyState title="Candidate not found" />

  const { person, experience, assignments, application, row } = state.data
  const active = assignments.filter((a) => a.status !== 'cancelled')

  const emailBody = [
    `Dear ${person.fullName.split(' ')[0]},`,
    '',
    'I am staffing tutorials in the School of ICT and would like to discuss a tutoring role with you.',
    '',
    'Kind regards,',
    me?.fullName ?? '',
    'School of Information and Communication Technology',
    'Griffith University',
  ].join('\n')

  return (
    <>
      <button onClick={() => navigate(-1)}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 15l-5-5 5-5" /></svg>
        Back
      </button>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Avatar name={person.fullName} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{person.fullName}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {person.studentNumber} · {person.program ?? '—'}
            {person.campus && <> · {person.campus}</>}
          </p>
          <p className="mt-0.5 text-sm text-ink-500">
            Registered {formatDate(person.createdAt)}
            {row?.appliedAt && <> · applied {formatDate(row.appliedAt)}</>}
          </p>
        </div>
        <a href={mailto(person.email, 'ICT tutoring', emailBody)}>
          <Button icon={
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6l7 5 7-5M3 5h14v10H3z" /></svg>
          }>Email {person.fullName.split(' ')[0]}</Button>
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

          <Card>
            <CardHeader title="Teaching experience"
                        description={`${experience.length} recorded ${experience.length === 1 ? 'role' : 'roles'}`} />
            {experience.length === 0 ? (
              <EmptyState title="No teaching recorded"
                          description="This would be their first tutoring role." />
            ) : (
              <ul className="divide-y divide-ink-200">
                {experience.map((e) => (
                  <li key={e.id} className="px-5 py-3.5">
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
                    {e.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{e.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {application ? (
            <>
              <Card>
                <CardHeader
                  title="Applied courses"
                  description={`Their ranked order · updated ${relativeTime(application.updatedAt)}`}
                />
                <ul className="divide-y divide-ink-200">
                  {application.preferences.map((p) => {
                    const taught = experience.filter((e) => e.courseCode === p.courseCode).length
                    return (
                      <li key={p.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                          {p.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-ink-900">{courseLabel(p.courseCode)}</p>
                            {taught > 0 && <Badge tone="success">Taught {taught}×</Badge>}
                          </div>
                          {p.note && <p className="mt-1 text-sm text-ink-600">{p.note}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card>

              <Card>
                <CardHeader title="Why they are qualified" description="In their own words" />
                <div className="px-5 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                    {application.statement}
                  </p>
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState
                title="No application on file"
                description="They have registered but not filled in an application. Their teaching history above is still current, and you can email them directly."
              />
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Contact" />
            <dl className="divide-y divide-ink-200 text-sm">
              {[
                ['Email', <a key="e" href={`mailto:${person.email}`} className="break-all text-griffith-700 hover:underline">{person.email}</a>],
                ['Phone', person.phone ?? '—'],
                ['Student number', person.studentNumber ?? '—'],
                ['Program', person.program ?? '—'],
                ['Campus', person.campus ?? '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 px-5 py-2.5">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {application && (
            <Card>
              <CardHeader title="Availability" />
              <dl className="divide-y divide-ink-200 text-sm">
                <div className="flex justify-between gap-3 px-5 py-2.5">
                  <dt className="text-ink-500">Max hours/week</dt>
                  <dd className="font-medium text-ink-800">{application.hoursPerWeek}</dd>
                </div>
                <div className="flex justify-between gap-3 px-5 py-2.5">
                  <dt className="text-ink-500">Days</dt>
                  <dd className="font-medium text-ink-800">{application.availableDays.join(', ') || '—'}</dd>
                </div>
                <div className="flex justify-between gap-3 px-5 py-2.5">
                  <dt className="text-ink-500">Work rights</dt>
                  <dd className="font-medium text-ink-800">{person.hasWorkRights ? 'Yes' : 'Not stated'}</dd>
                </div>
                <div className="flex justify-between gap-3 px-5 py-2.5">
                  <dt className="text-ink-500">Blue Card</dt>
                  <dd className="font-medium text-ink-800">{person.hasBlueCard ? 'Yes' : 'Not stated'}</dd>
                </div>
                {application.resumeUrl && (
                  <div className="px-5 py-2.5">
                    <a href={application.resumeUrl} target="_blank" rel="noreferrer"
                       className="text-sm font-medium text-griffith-700 hover:underline">View CV →</a>
                  </div>
                )}
              </dl>
            </Card>
          )}

          <Card>
            <CardHeader title="Current allocations" description="Across the School" />
            {active.length === 0 ? (
              <EmptyState title="Not currently allocated" />
            ) : (
              <ul className="divide-y divide-ink-200">
                {active.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-ink-900">{a.courseCode}</p>
                    <p className="text-xs text-ink-500">
                      {trimesterShort(a.year, a.trimester)} · {TUTOR_ROLE_LABEL[a.role]} · {a.hoursPerWeek} hrs/week
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
