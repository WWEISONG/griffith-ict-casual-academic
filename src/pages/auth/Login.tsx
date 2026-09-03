import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { backendIsLive } from '@/lib/provider'
import { LOCAL_PASSWORD } from '@/lib/provider/mock/seed'
import { Button, Field, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

/**
 * Accounts available when the app runs on sample data. Shown on the sign-in
 * screen in that mode only — without this, the sample build is unusable,
 * because the password is a build-time fallback nobody could guess.
 *
 * This panel disappears the moment a real backend is configured.
 */
const SAMPLE_ACCOUNTS = [
  { email: 'w.song@griffith.edu.au', role: 'Administrator' },
  { email: 'a.nguyen@griffith.edu.au', role: 'Course convenor' },
  { email: 'liam.chen@griffithuni.edu.au', role: 'Student applicant' },
]

/** Address staff should contact for an account. */
const ADMIN_CONTACT = 'w.song@griffith.edu.au'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  // The landing page's "Staff sign in" button arrives with ?staff=1. Staff
  // accounts are created by the School, so that route must not offer signup.
  const [params] = useSearchParams()
  const staffMode = params.get('staff') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // The sample-account panel is a means to an end: once an account has been
  // chosen it has served its purpose and only adds noise.
  const [showSamples, setShowSamples] = useState(true)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      navigate('/app')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle={staffMode
        ? 'For course convenors and School administrators.'
        : 'Use your Griffith University account.'}
      footer={staffMode ? (
        <>
          Staff accounts are created by the School administrator.<br />
          <a href={`mailto:${ADMIN_CONTACT}?subject=${encodeURIComponent('Casual Academic Portal — convenor access')}`}
             className="font-medium text-griffith-700 hover:underline">
            {ADMIN_CONTACT}
          </a>
        </>
      ) : (
        <>New here? <Link to="/register" className="font-medium text-griffith-700 hover:underline">Create an account</Link></>
      )}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        <Field label="Griffith email" htmlFor="email" required>
          <Input
            id="email" type="email" autoComplete="username" required autoFocus
            placeholder={staffMode ? 'j.citizen@griffith.edu.au' : 's1234567@griffithuni.edu.au'}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <Input
            id="password" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={busy}>Sign in</Button>
      </form>

      {!backendIsLive && !showSamples && (
        <button
          type="button"
          onClick={() => setShowSamples(true)}
          className="mt-4 text-xs font-medium text-ink-500 hover:text-ink-800 hover:underline"
        >
          Show sample accounts
        </button>
      )}

      {!backendIsLive && showSamples && (
        <div className="mt-6 rounded-lg border border-ink-200 bg-ink-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
            Running on sample data
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
            No database is connected to this build, so it uses illustrative
            records held in your browser. Choose an account to see that role's view.
          </p>
          <ul className="mt-3 space-y-1">
            {SAMPLE_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email)
                    setPassword(LOCAL_PASSWORD)
                    setShowSamples(false)
                    setError(null)
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white"
                >
                  <span className="truncate font-mono text-xs text-ink-800">{a.email}</span>
                  <span className="shrink-0 text-[11px] font-medium text-griffith-700">{a.role}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 border-t border-ink-200 pt-2.5 text-xs text-ink-500">
            Password <code className="rounded bg-white px-1.5 py-0.5 font-mono text-ink-800">{LOCAL_PASSWORD}</code>
            {' '}— click any account above to fill both fields.
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
