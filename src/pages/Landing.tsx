import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Brand } from '@/components/ui/Brand'

/**
 * Two entrances, so each audience sees only what applies to them.
 *
 * These are signposts, not gates: the site is static, so anyone can reach
 * either URL. The real boundary is in the database, where a candidate's
 * session returns only their own records whichever door they came through.
 *
 *   /            candidates — the link given to students
 *   /#/staff     course convenors — the link given to staff
 */
function Shell({ children }: { children: React.ReactNode }) {
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
        {children}
      </main>
    </div>
  )
}

/** Default entrance. Students are the great majority of visitors. */
export function Landing() {
  return (
    <Shell>
      <div className="mt-8 flex flex-col gap-2.5">
        <Link to="/login" className="block">
          <Button size="lg" className="w-full">Apply to tutor</Button>
        </Link>
        <Link to="/register" className="block">
          <Button variant="secondary" size="lg" className="w-full">Create an account</Button>
        </Link>
      </div>
    </Shell>
  )
}

/** The entrance given to course convenors. */
export function StaffLanding() {
  return (
    <Shell>
      <div className="mt-8">
        <Link to="/login?staff=1" className="block">
          <Button size="lg" className="w-full">Staff sign in</Button>
        </Link>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-ink-500">
        Staff accounts are created by the School administrator.
        <br />
        <a href="mailto:w.song@griffith.edu.au?subject=Casual%20Academic%20Portal%20—%20convenor%20access"
           className="font-medium text-griffith-700 hover:underline">
          w.song@griffith.edu.au
        </a>
      </p>
    </Shell>
  )
}
