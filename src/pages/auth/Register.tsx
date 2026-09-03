import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button, Field, Input, Select } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { isGriffithEmail } from '@/lib/utils'

const CAMPUSES = ['Nathan', 'Gold Coast', 'Mount Gravatt', 'South Bank', 'Logan', 'Online']

/** Programs whose students are eligible to tutor in the School of ICT. */
const PROGRAMS = [
  'Bachelor of Computer Science',
  'Bachelor of Information Technology',
  'Bachelor of Applied Information Technology',
  'Bachelor of Cyber Security',
  'Bachelor of Data Science',
  'Bachelor of Computer Science (Honours)',
  'Bachelor of Information Technology (Honours)',
  'Master of Information Technology',
  'Master of Cyber Security',
  'Master of Data Analytics',
  'PhD (Information and Communication Technology)',
  'Other',
]

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '', email: '', studentNumber: '', program: '', campus: '',
    password: '', confirm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const emailError = useMemo(() => {
    if (!form.email) return undefined
    if (!isGriffithEmail(form.email)) {
      return 'Use your Griffith University address (@griffithuni.edu.au or @griffith.edu.au).'
    }
    return undefined
  }, [form.email])

  const studentNumberError = useMemo(() => {
    if (!form.studentNumber) return undefined
    return /^s\d{7}$/.test(form.studentNumber.trim())
      ? undefined
      : 'Student numbers look like s1234567.'
  }, [form.studentNumber])

  const passwordError = useMemo(() => {
    if (!form.password) return undefined
    if (form.password.length < 8) return 'Use at least 8 characters.'
    return undefined
  }, [form.password])

  const confirmError = form.confirm && form.confirm !== form.password ? 'Passwords do not match.' : undefined

  const canSubmit =
    form.fullName.trim().length > 1 &&
    isGriffithEmail(form.email) &&
    !passwordError && !confirmError && form.confirm &&
    /^s\d{7}$/.test(form.studentNumber.trim()) && Boolean(form.program)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true); setError(null); setNotice(null)
    try {
      await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        studentNumber: form.studentNumber.trim(),
        program: form.program,
        campus: form.campus || undefined,
      })
      navigate('/app')
    } catch (err) {
      const msg = (err as Error).message
      // Supabase is configured to confirm addresses before first sign-in.
      if (msg === 'CONFIRM_EMAIL') {
        setNotice('Almost there — check your Griffith inbox and click the verification link to activate your account.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  if (notice) {
    return (
      <AuthLayout title="Confirm your email" subtitle="One more step.">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </div>
        <p className="mt-4 text-sm text-ink-600">
          The link was sent to <strong className="font-medium text-ink-900">{form.email}</strong>. Once
          confirmed you can <Link to="/login" className="font-medium text-griffith-700 hover:underline">sign in</Link>.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Apply to tutor"
      subtitle="For Griffith students, including higher degree research candidates."
      footer={<>Already registered? <Link to="/login" className="font-medium text-griffith-700 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        <Field label="Full name" htmlFor="fullName" required>
          <Input id="fullName" required autoFocus autoComplete="name"
                 placeholder="Jane Citizen" value={form.fullName} onChange={set('fullName')} />
        </Field>

        <Field
          label="Griffith email" htmlFor="email" required error={emailError}
          hint={!form.email ? 'Either @griffithuni.edu.au or @griffith.edu.au.' : undefined}
        >
          <Input id="email" type="email" required autoComplete="username"
                 aria-invalid={Boolean(emailError)}
                 placeholder="s1234567@griffithuni.edu.au"
                 value={form.email} onChange={set('email')} />
        </Field>

        <Field label="Student number" htmlFor="studentNumber" required error={studentNumberError}
               hint="Higher degree research candidates have one too.">
          <Input id="studentNumber" required placeholder="s1234567"
                 aria-invalid={Boolean(studentNumberError)}
                 value={form.studentNumber} onChange={set('studentNumber')} />
        </Field>

        <Field label="Program" htmlFor="program" required>
          <Select id="program" required value={form.program} onChange={set('program')}>
            <option value="">Select your program…</option>
            {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>

        <Field label="Campus" htmlFor="campus">
          <Select id="campus" value={form.campus} onChange={set('campus')}>
            <option value="">Select…</option>
            {CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <Field label="Password" htmlFor="password" required error={passwordError} hint="At least 8 characters.">
          <Input id="password" type="password" required autoComplete="new-password"
                 aria-invalid={Boolean(passwordError)}
                 value={form.password} onChange={set('password')} />
        </Field>

        <Field label="Confirm password" htmlFor="confirm" required error={confirmError}>
          <Input id="confirm" type="password" required autoComplete="new-password"
                 aria-invalid={Boolean(confirmError)}
                 value={form.confirm} onChange={set('confirm')} />
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!canSubmit}>
          Create account
        </Button>

        <p className="text-xs leading-relaxed text-ink-500">
          Your details are used to assess casual academic applications within the School
          of ICT and are visible to the convenors of the courses you nominate.
        </p>

        {/* Staff accounts are provisioned by the School, not self-registered,
            because a Griffith staff address does not distinguish a convenor
            from an HDR candidate. */}
        <p className="border-t border-ink-200 pt-4 text-xs leading-relaxed text-ink-500">
          <strong className="font-medium text-ink-700">Course convenor?</strong>{' '}
          Staff accounts are set up by the School administrator — contact{' '}
          <a href="mailto:w.song@griffith.edu.au?subject=Casual%20Academic%20Portal%20—%20convenor%20access"
             className="font-medium text-griffith-700 hover:underline">w.song@griffith.edu.au</a>{' '}
          rather than registering here.
        </p>
      </form>
    </AuthLayout>
  )
}
