import { useMemo, useState } from 'react'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/layout/AppShell'
import {
  Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Input,
  LoadingState, Modal, Select,
} from '@/components/ui'
import { ICT_COURSES } from '@/data/courses'
import { formatDate, isGriffithEmail } from '@/lib/utils'
import type { Role } from '@/types'

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  lecturer: 'Course convenor',
  student: 'Student applicant',
}

export function People() {
  const provider = getProvider()
  const { push } = useToast()
  const [role, setRole] = useState<Role | ''>('')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [coursesFor, setCoursesFor] = useState<string | null>(null)

  const state = useAsync(async () => {
    const [profiles, courseLecturers] = await Promise.all([
      provider.listProfiles(),
      provider.listCourseLecturers(),
    ])
    return { profiles, courseLecturers }
  }, [])

  const countByLecturer = useMemo(() => {
    const m = new Map<string, number>()
    for (const cl of state.data?.courseLecturers ?? []) {
      m.set(cl.lecturerId, (m.get(cl.lecturerId) ?? 0) + 1)
    }
    return m
  }, [state.data])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />

  let rows = state.data!.profiles
  if (role) rows = rows.filter((p) => p.role === role)
  if (q) {
    const needle = q.toLowerCase()
    rows = rows.filter((p) => `${p.fullName} ${p.email} ${p.studentNumber ?? ''}`.toLowerCase().includes(needle))
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await provider.setProfileActive(id, isActive)
      push('success', isActive ? 'Account reactivated.' : 'Account deactivated.')
      state.reload()
    } catch (e) { push('error', (e as Error).message) }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Everyone with access to the portal. Students register themselves; staff accounts are created here."
        action={<Button onClick={() => setCreateOpen(true)}>Add staff account</Button>}
      />

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input placeholder="Search name, email or student number…" value={q}
                   onChange={(e) => setQ(e.target.value)} aria-label="Search accounts" />
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role | '')} aria-label="Filter by role">
            <option value="">All roles</option>
            <option value="admin">Administrators</option>
            <option value="lecturer">Course convenors</option>
            <option value="student">Student applicants</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState title="No accounts match" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium text-ink-500">
                  <th scope="col" className="px-4 py-2.5">Person</th>
                  <th scope="col" className="px-4 py-2.5">Role</th>
                  <th scope="col" className="px-4 py-2.5">Courses</th>
                  <th scope="col" className="px-4 py-2.5">Joined</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.fullName} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{p.fullName}</p>
                          <p className="truncate text-xs text-ink-500">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.role === 'admin' ? 'brand' : p.role === 'lecturer' ? 'info' : 'neutral'}>
                        {ROLE_LABEL[p.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {p.role === 'lecturer' || p.role === 'admin'
                        ? `${countByLecturer.get(p.id) ?? 0} assigned`
                        : (p.program ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      {p.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {(p.role === 'lecturer' || p.role === 'admin') && (
                          <Button size="sm" variant="secondary" onClick={() => setCoursesFor(p.id)}>
                            Courses
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(p.id, !p.isActive)}>
                          {p.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateStaffModal open={createOpen} onClose={() => setCreateOpen(false)}
                        onSaved={() => { setCreateOpen(false); state.reload() }} />

      {coursesFor && (
        <AssignCoursesModal
          lecturerId={coursesFor}
          name={state.data!.profiles.find((p) => p.id === coursesFor)?.fullName ?? ''}
          current={state.data!.courseLecturers.filter((c) => c.lecturerId === coursesFor).map((c) => c.courseCode)}
          onClose={() => setCoursesFor(null)}
          onSaved={() => { setCoursesFor(null); state.reload() }}
        />
      )}
    </>
  )
}

function CreateStaffModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const provider = getProvider()
  const { push } = useToast()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [role, setRole] = useState<'lecturer' | 'admin'>('lecturer')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const emailOk = !email || (isGriffithEmail(email) && email.endsWith('@griffith.edu.au'))
  const valid = fullName.trim() && emailOk && email && password.length >= 10

  async function save() {
    setBusy(true)
    try {
      await provider.createStaffAccount({ email, fullName, role, position, password })
      push('success', `${fullName} can now sign in.`)
      setEmail(''); setFullName(''); setPosition(''); setPassword('')
      onSaved()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a staff account"
           description="For course convenors and School administrators."
           footer={<>
             <Button variant="secondary" onClick={onClose}>Cancel</Button>
             <Button onClick={save} loading={busy} disabled={!valid}>Create account</Button>
           </>}>
      <div className="space-y-4">
        <Field label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr Jane Citizen" />
        </Field>
        <Field label="Griffith staff email" required
               error={emailOk ? undefined : 'Staff accounts require a @griffith.edu.au address.'}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 aria-invalid={!emailOk} placeholder="j.citizen@griffith.edu.au" />
        </Field>
        <Field label="Position" hint="Shown to applicants, e.g. 'Course Convenor — Cyber Security'.">
          <Input value={position} onChange={(e) => setPosition(e.target.value)} />
        </Field>
        <Field label="Role" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as 'lecturer' | 'admin')}>
            <option value="lecturer">Course convenor</option>
            <option value="admin">Administrator</option>
          </Select>
        </Field>
        <Field label="Initial password" required
               hint="At least 10 characters. Ask them to change it after first sign-in.">
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

function AssignCoursesModal({ lecturerId, name, current, onClose, onSaved }: {
  lecturerId: string; name: string; current: string[]; onClose: () => void; onSaved: () => void
}) {
  const provider = getProvider()
  const { push } = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set(current))
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const shown = q
    ? ICT_COURSES.filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase()))
    : ICT_COURSES

  async function save() {
    setBusy(true)
    try {
      await provider.setCourseLecturers(lecturerId, [...selected])
      push('success', `Courses updated for ${name}.`)
      onSaved()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open wide onClose={onClose} title={`Courses for ${name}`}
           description="They will see applicants who nominated any of these courses."
           footer={<>
             <span className="mr-auto text-sm text-ink-500">{selected.size} selected</span>
             <Button variant="secondary" onClick={onClose}>Cancel</Button>
             <Button onClick={save} loading={busy}>Save</Button>
           </>}>
      <Input placeholder="Filter courses…" value={q} onChange={(e) => setQ(e.target.value)}
             className="mb-3" aria-label="Filter courses" />
      <div className="max-h-96 divide-y divide-ink-200 overflow-y-auto rounded-lg border border-ink-200">
        {shown.map((c) => (
          <label key={c.code} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink-50">
            <input type="checkbox" checked={selected.has(c.code)}
                   onChange={(e) => setSelected((s) => {
                     const next = new Set(s)
                     if (e.target.checked) next.add(c.code); else next.delete(c.code)
                     return next
                   })}
                   className="h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
            <span className="min-w-0">
              <span className="text-sm font-medium text-ink-900">{c.code}</span>
              <span className="ml-2 text-sm text-ink-600">{c.title}</span>
            </span>
          </label>
        ))}
      </div>
    </Modal>
  )
}
