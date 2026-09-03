import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Brand } from '@/components/ui/Brand'

/**
 * Deliberately minimal: who this belongs to, and the two things a visitor can
 * do. Anyone arriving here already knows what they came for.
 */
export function Landing() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <main className="w-full max-w-md text-center">
        <Brand size={52} className="mx-auto mb-6" />

        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Casual Academic Portal
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          School of Information and Communication Technology
          <br />
          Griffith University
        </p>

        <div className="mt-8 flex flex-col gap-2.5">
          {/* Sign in first: most applicants already have an account, and
              registration is offered from there if they do not. */}
          <Link to="/login" className="block">
            <Button size="lg" className="w-full">Apply to tutor</Button>
          </Link>
          <Link to="/login?staff=1" className="block">
            <Button variant="secondary" size="lg" className="w-full">Staff sign in</Button>
          </Link>
        </div>

        <p className="mt-6 text-sm text-ink-500">
          New to the portal?{' '}
          <Link to="/register" className="font-medium text-griffith-700 hover:underline">Create an account</Link>
        </p>
      </main>
    </div>
  )
}
