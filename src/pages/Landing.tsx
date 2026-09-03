import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
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

      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-griffith-700">
            School of Information and Communication Technology
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Tutor recruitment,<br />end to end.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
            A single place for senior students to apply for casual academic work, and for
            course convenors to find the right tutors.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register"><Button size="lg">Apply to tutor</Button></Link>
            <Link to="/login?staff=1"><Button variant="secondary" size="lg">Staff sign in</Button></Link>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Open to Griffith students and staff. Sign in with your university account.
          </p>
        </div>
      </section>

      <footer className="border-t border-ink-200">
        <div className="mx-auto max-w-6xl px-5 py-6">
          {/* Scope boundary, stated plainly: this system stops at selection.
              Contracts and pay remain with Griffith HR. */}
          <p className="text-xs leading-relaxed text-ink-500">
            Covers application and selection only. Employment offers, pay rates and
            onboarding are administered by Griffith University Human Resources.
          </p>
        </div>
      </footer>
    </div>
  )
}
