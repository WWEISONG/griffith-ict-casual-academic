import { useState } from 'react'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/layout/AppShell'
import {
  Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Input,
  LoadingState, Modal, Select,
} from '@/components/ui'
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

  const state = useAsync(() => provider.listProfiles(), [])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />

  let rows = state.data!
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
                  <th scope="col" className="px-4 py-2.5">Program / position</th>
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
                      {p.role === 'student' ? (p.program ?? '—') : (p.position ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      {p.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(p.id, !p.isActive)}>
                        {p.isActive ? 'Disable' : 'Enable'}
                      </Button>
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
