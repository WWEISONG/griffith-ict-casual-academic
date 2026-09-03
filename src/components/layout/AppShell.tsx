import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { Avatar, Badge, Button } from '@/components/ui'
import { Brand } from '@/components/ui/Brand'
import { cn } from '@/lib/utils'
import { backendIsLive } from '@/lib/provider'

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

const I = {
  home: <path d="M3 9.5L10 4l7 5.5V16a1 1 0 01-1 1h-3.5v-4h-5v4H4a1 1 0 01-1-1V9.5z" />,
  doc: <path d="M6 3h5l3 3v11a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM11 3v4h4" />,
  users: <path d="M7 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM13 10a2 2 0 100-4 2 2 0 000 4zM2.5 16c0-2.2 2-3.5 4.5-3.5s4.5 1.3 4.5 3.5M13 12.5c2 .2 3.5 1.3 3.5 3.5" />,
  book: <path d="M4 4.5A1.5 1.5 0 015.5 3H16v12H5.5A1.5 1.5 0 004 16.5v-12zM4 16.5A1.5 1.5 0 015.5 15H16v2H5.5A1.5 1.5 0 014 15.5" />,
  clip: <path d="M7 4h6a1 1 0 011 1v11a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1zM8.5 3h3v2h-3zM8.5 9h3M8.5 12h3" />,
  cog: <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM10 2.5v2M10 15.5v2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M2.5 10h2M15.5 10h2M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />,
  chart: <path d="M4 16V9M8.5 16V4M13 16v-5M17 16H3" />,
}

function Icon({ path }: { path: ReactNode }) {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 20 20" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  )
}

// Deliberately short. Convenors open this system a handful of times a
// trimester; every extra nav item is something they have to think about.
const ADMIN_NAV: NavItem[] = [
  { to: '/app', label: 'All candidates', icon: <Icon path={I.users} />, end: true },
  { to: '/app/people', label: 'Accounts', icon: <Icon path={I.cog} /> },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut, role } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Only administrators reach this shell; students and convenors each have a
  // single page and get plain chrome instead (see App.tsx).
  const nav = ADMIN_NAV

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Skip link — keyboard and screen-reader users should not have to tab
          through the whole sidebar to reach the page content. */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lift">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button className="rounded-md p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
                  onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            <Brand size={28} className="shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-ink-900">Casual Academic Portal</p>
              <p className="truncate text-[11px] text-ink-500">School of ICT · Griffith University</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {!backendIsLive && (
              <Badge tone="warning" className="hidden sm:inline-flex">Local data</Badge>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink-900">{profile?.fullName}</p>
              <p className="text-[11px] capitalize leading-tight text-ink-500">
                {role === 'admin' ? 'Administrator' : role === 'lecturer' ? 'Course convenor' : 'Applicant'}
              </p>
            </div>
            <Avatar name={profile?.fullName ?? '?'} size={32} />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className={cn(
          'fixed inset-y-14 left-0 z-20 w-64 shrink-0 border-r border-ink-200 bg-white p-3 transition-transform lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
          <nav className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-griffith-50 text-griffith-800' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-10 bg-ink-950/20 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
        )}

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, action }: {
  title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
