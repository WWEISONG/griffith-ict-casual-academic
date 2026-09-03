import { useState } from 'react'
import { getProvider } from '@/lib/provider'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Modal, Select } from '@/components/ui'
import { formatDate, trimesterLabel } from '@/lib/utils'
import type { Trimester } from '@/types'

export function Rounds() {
  const provider = getProvider()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const state = useAsync(() => provider.listRounds(), [])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />

  const rounds = state.data ?? []

  async function activate(id: string) {
    const r = rounds.find((x) => x.id === id)!
    try {
      await provider.upsertRound({ ...r, isActive: true })
      push('success', `${r.name} is now the open round.`)
      state.reload()
    } catch (e) { push('error', (e as Error).message) }
  }

  return (
    <>
      <PageHeader
        title="Recruitment rounds"
        description="Students can only apply while a round is open. One round is open at a time."
        action={<Button onClick={() => setOpen(true)}>New round</Button>}
      />

      <Card className="overflow-hidden">
        {rounds.length === 0 ? (
          <EmptyState title="No rounds yet"
                      description="Create a round to open applications for the coming trimester."
                      action={<Button onClick={() => setOpen(true)}>Create the first round</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th scope="col" className="px-4 py-2.5">Round</th>
                  <th scope="col" className="px-4 py-2.5">Opens</th>
                  <th scope="col" className="px-4 py-2.5">Closes</th>
                  <th scope="col" className="px-4 py-2.5">State</th>
                  <th scope="col" className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rounds.map((r) => {
                  const closed = new Date() > new Date(r.closesAt)
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-ink-900">{r.name}</td>
                      <td className="px-4 py-3 text-ink-600">{formatDate(r.opensAt)}</td>
                      <td className="px-4 py-3 text-ink-600">{formatDate(r.closesAt)}</td>
                      <td className="px-4 py-3">
                        {r.isActive
                          ? <Badge tone={closed ? 'warning' : 'success'}>{closed ? 'Open — past close date' : 'Open'}</Badge>
                          : <Badge tone="neutral">Closed</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!r.isActive && (
                          <Button size="sm" variant="secondary" onClick={() => activate(r.id)}>Make open round</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NewRoundModal open={open} onClose={() => setOpen(false)}
                     onSaved={() => { setOpen(false); state.reload() }} />
    </>
  )
}

function NewRoundModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const provider = getProvider()
  const { push } = useToast()
  const thisYear = new Date().getFullYear()

  const [year, setYear] = useState(thisYear + 1)
  const [trimester, setTrimester] = useState<Trimester>(1)
  const [opensAt, setOpensAt] = useState(new Date().toISOString().slice(0, 10))
  const [closesAt, setClosesAt] = useState(new Date(Date.now() + 42 * 86400000).toISOString().slice(0, 10))
  const [makeActive, setMakeActive] = useState(true)
  const [busy, setBusy] = useState(false)

  const valid = new Date(closesAt) > new Date(opensAt)

  async function save() {
    setBusy(true)
    try {
      await provider.upsertRound({
        name: trimesterLabel(year, trimester),
        year, trimester,
        opensAt: new Date(opensAt).toISOString(),
        closesAt: new Date(`${closesAt}T23:59:59`).toISOString(),
        isActive: makeActive,
      })
      push('success', 'Recruitment round created.')
      onSaved()
    } catch (e) { push('error', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New recruitment round"
           description="Opens applications for a trimester."
           footer={<>
             <Button variant="secondary" onClick={onClose}>Cancel</Button>
             <Button onClick={save} loading={busy} disabled={!valid}>Create round</Button>
           </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Year">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear, thisYear + 1, thisYear + 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
          <Field label="Trimester">
            <Select value={trimester} onChange={(e) => setTrimester(Number(e.target.value) as Trimester)}>
              <option value={1}>T1</option><option value={2}>T2</option><option value={3}>T3</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Applications open">
            <Input type="date" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </Field>
          <Field label="Applications close"
                 error={valid ? undefined : 'Close date must be after the open date.'}>
            <Input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)}
                 className="mt-0.5 h-4 w-4 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600" />
          <span className="text-sm text-ink-800">
            Open this round now
            <span className="mt-0.5 block text-xs text-ink-500">Any currently open round will be closed.</span>
          </span>
        </label>
      </div>
    </Modal>
  )
}
