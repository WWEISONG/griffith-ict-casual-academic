import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Brand } from '@/components/ui/Brand'
import { useAuth } from '@/lib/auth/AuthContext'

/**
 * Two entrances, so each audience sees only what applies to them.
 *
 *   /            candidates — the link given to students
 *   /#/staff     course convenors — the link given to staff
 *
 * Neither redirects a signed-in visitor away. They used to, which meant a
 * convenor opening the candidate link landed in the convenor view without
 * explanation, and anyone on a shared machine could not reach the entrance at
 * all. Now the page says who is signed in and offers both continuing and
 * signing out.
 *
 * These are signposts, not gates: the site is static, so anyone can reach
 * either URL. The boundary is in the database.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const { session, profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  const roleLabel = role === 'admin' ? 'Administrator'
    : role === 'lecturer' ? 'Course convenor' : 'Candidate'

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

        {session ? (
          <div className="mt-8 rounded-xl border border-ink-200 bg-white p-5">
            <p className="text-sm text-ink-600">Signed in as</p>
            <p className="mt-0.5 font-medium text-ink-900">{profile?.fullName}</p>
            <p className="text-xs text-ink-500">{roleLabel}</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Button size="lg" onClick={() => navigate('/app')}>Continue</Button>
              <Button variant="secondary" size="lg" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : children}
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
