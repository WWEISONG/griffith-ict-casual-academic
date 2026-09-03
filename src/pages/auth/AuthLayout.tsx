import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '@/components/ui/Brand'

/**
 * Branding sits above the card rather than in a top bar — these pages have a
 * single purpose, so a navigation strip only competes with the form.
 */
export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-7 block text-center">
          <Brand size={44} className="mx-auto" />
          <p className="mt-3 text-base font-semibold text-ink-900">Casual Academic Portal</p>
          <p className="mt-0.5 text-xs text-ink-500">School of ICT · Griffith University</p>
        </Link>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <p className="mt-5 text-center text-sm leading-relaxed text-ink-600">{footer}</p>}
      </div>
    </div>
  )
}
