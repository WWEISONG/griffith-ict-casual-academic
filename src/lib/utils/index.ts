import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

const GRIFFITH_DOMAINS = ['griffith.edu.au', 'griffithuni.edu.au'] as const

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? ''
}

export function isGriffithEmail(email: string): boolean {
  return GRIFFITH_DOMAINS.includes(emailDomain(email) as (typeof GRIFFITH_DOMAINS)[number])
}

/**
 * Both Griffith domains are valid for applicants.
 *
 * Role is deliberately NOT derived from the domain: HDR candidates (PhD
 * students) hold @griffith.edu.au addresses just as staff do, so the domain
 * cannot tell a professor from a PhD student who wants to tutor. Everyone who
 * self-registers is a student; staff accounts are created by an administrator.
 */
export function isStaffDomain(email: string): boolean {
  return emailDomain(email) === 'griffith.edu.au'
}

export function formatDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-AU', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (Math.abs(mins) < 1) return 'just now'
  if (Math.abs(mins) < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return `${days}d ago`
  return formatDate(iso)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Deterministic pastel-ish avatar colour derived from a string. */
export function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return `hsl(${h} 52% 42%)`
}

/** Full form, for headings and formal contexts: "Trimester 1, 2026". */
export function trimesterLabel(year: number, trimester: number): string {
  return `Trimester ${trimester}, ${year}`
}

/** Short form used across tables, chips and dense UI: "T1 2026". */
export function trimesterShort(year: number, trimester: number): string {
  return `T${trimester} ${year}`
}

/** Short form without the year, for when the year is already in context. */
export function trimesterTag(trimester: number): string {
  return `T${trimester}`
}

/** Escape a value for inclusion in a CSV cell. */
export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Build a mailto: link. Lecturers contact applicants through their own mail client. */
export function mailto(to: string, subject: string, body: string, cc?: string): string {
  const params = new URLSearchParams()
  params.set('subject', subject)
  params.set('body', body)
  if (cc) params.set('cc', cc)
  return `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, '%20')}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
