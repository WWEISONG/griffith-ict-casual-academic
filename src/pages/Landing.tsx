import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

const STEPS = [
  {
    role: 'Students',
    title: 'Apply once, for as many courses as you like',
    body: 'Register with your Griffith student account, record your teaching history, and nominate the courses you want to tutor in ranked order. Save a draft and come back to it.',
  },
  {
    role: 'Course convenors',
    title: 'See every candidate for your courses in one place',
    body: 'Applicants are filtered to the courses you convene, ranked by preference and prior teaching experience. Read their statement, check what they have taught, and contact them directly.',
  },
  {
    role: 'School administration',
    title: 'Know where recruitment stands across the School',
    body: 'Track applications across every ICT course, spot courses with no candidates before the trimester starts, and keep a record of who is tutoring what.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ink-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-griffith-700 text-base font-bold text-white">G</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink-900">Casual Academic Portal</p>
            <p className="text-[11px] text-ink-500">School of ICT · Griffith University</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Register</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-griffith-700">
            School of Information and Communication Technology
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Tutor recruitment,<br />end to end.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
            A single place for senior students to apply for casual academic work, and for
            course convenors to find the right tutors — replacing the spreadsheets and
            email threads currently used each trimester.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register"><Button size="lg">Apply to tutor</Button></Link>
            <Link to="/login"><Button variant="secondary" size="lg">Staff sign in</Button></Link>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Open to Griffith students and staff. Sign in with your university account.
          </p>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.role} className="card p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-griffith-700">{s.role}</p>
                <h2 className="mt-2 text-base font-semibold text-ink-900">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="text-xs leading-relaxed text-ink-500">
            This portal covers advertising, application and selection. Employment offers,
            pay rates and onboarding are administered separately by Griffith University
            Human Resources under the Academic Staff Enterprise Agreement.
          </p>
          <p className="mt-3 text-xs text-ink-400">
            School of Information and Communication Technology, Griffith University.
          </p>
        </div>
      </footer>
    </div>
  )
}
