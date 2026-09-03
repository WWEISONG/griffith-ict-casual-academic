import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Button, Card, EmptyState, Input, Select } from '@/components/ui'
import { ICT_COURSES, levelShortLabel } from '@/data/courses'
import { downloadTextFile, toCsv } from '@/lib/utils'

/**
 * The School of ICT course catalogue.
 *
 * Reference only. Convenor assignment is deliberately absent: the School has no
 * reliable course-to-staff mapping, and since migration 0005 staff see all
 * applicants regardless, so the mapping is a personal filter each staff member
 * sets for themselves rather than something administered here.
 */
export function Courses() {
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('')

  let rows = ICT_COURSES
  if (q) rows = rows.filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase()))
  if (level) rows = rows.filter((c) => String(c.level) === level)

  function exportCsv() {
    downloadTextFile(
      `ict-courses-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(['Course code', 'Title', 'Level'], rows.map((r) => [r.code, r.title, levelShortLabel(r.level)])),
    )
  }

  return (
    <>
      <PageHeader
        title="Course catalogue"
        description={`${ICT_COURSES.length} courses in the School of ICT.`}
        action={
          <div className="flex gap-2">
            <Link to="/app/demand"><Button variant="secondary">Applicant coverage</Button></Link>
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
          </div>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input placeholder="Search by code or title…" value={q}
                   onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
          </div>
          <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level">
            <option value="">All levels</option>
            <option value="1">Undergraduate — Year 1</option>
            <option value="2">Undergraduate — Year 2</option>
            <option value="3">Undergraduate — Year 3</option>
            <option value="6">Honours / Research</option>
            <option value="7">Postgraduate</option>
          </Select>
        </div>
        <div className="border-t border-ink-200 px-4 py-2.5 text-right text-sm text-ink-500">
          {rows.length} shown
        </div>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState title="No courses match" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left">
                <tr className="text-xs font-medium text-ink-500">
                  <th scope="col" className="px-4 py-2.5">Code</th>
                  <th scope="col" className="px-4 py-2.5">Title</th>
                  <th scope="col" className="px-4 py-2.5">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {rows.map((c) => (
                  <tr key={c.code}>
                    <td className="px-4 py-2.5 font-medium text-ink-900">{c.code}</td>
                    <td className="px-4 py-2.5 text-ink-700">{c.title}</td>
                    <td className="px-4 py-2.5"><Badge tone="neutral">{levelShortLabel(c.level)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
