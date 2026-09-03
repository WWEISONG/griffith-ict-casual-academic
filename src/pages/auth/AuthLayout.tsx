import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-griffith-700 text-base font-bold text-white">G</span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink-900">Casual Academic Portal</p>
              <p className="text-[11px] text-ink-500">School of ICT · Griffith University</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="card p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <p className="mt-5 text-center text-sm text-ink-600">{footer}</p>}
        </div>
      </main>
    </div>
  )
}
