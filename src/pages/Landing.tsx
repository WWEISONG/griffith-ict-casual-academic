import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

/**
 * Deliberately minimal: who this belongs to, and the two things a visitor can
 * do. Anyone arriving here already knows what they came for.
 */
export function Landing() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <main className="w-full max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-griffith-700 text-2xl font-bold text-white">
          G
        </span>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-900">
          Casual Academic Portal
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          School of Information and Communication Technology
          <br />
          Griffith University
        </p>

        <div className="mt-8 flex flex-col gap-2.5">
          <Link to="/register" className="block">
            <Button size="lg" className="w-full">Apply to tutor</Button>
          </Link>
          <Link to="/login?staff=1" className="block">
            <Button variant="secondary" size="lg" className="w-full">Staff sign in</Button>
          </Link>
        </div>

        <p className="mt-6 text-sm text-ink-500">
          Already applied?{' '}
          <Link to="/login" className="font-medium text-griffith-700 hover:underline">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
