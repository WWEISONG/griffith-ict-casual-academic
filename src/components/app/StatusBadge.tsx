import { Badge } from '@/components/ui'
import { APPLICATION_STATUS_LABEL, type ApplicationStatus, type AssignmentStatus } from '@/types'

const TONE: Record<ApplicationStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand'> = {
  draft: 'neutral',
  submitted: 'info',
  under_review: 'info',
  shortlisted: 'brand',
  offered: 'warning',
  accepted: 'success',
  declined: 'neutral',
  unsuccessful: 'neutral',
  withdrawn: 'neutral',
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={TONE[status]}>{APPLICATION_STATUS_LABEL[status]}</Badge>
}

const ASSIGNMENT_TONE: Record<AssignmentStatus, 'neutral' | 'info' | 'success' | 'warning'> = {
  proposed: 'warning',
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'neutral',
}
const ASSIGNMENT_LABEL: Record<AssignmentStatus, string> = {
  proposed: 'Proposed',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function AssignmentBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={ASSIGNMENT_TONE[status]}>{ASSIGNMENT_LABEL[status]}</Badge>
}
