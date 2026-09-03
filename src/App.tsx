import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'
import { ToastProvider } from '@/hooks/useToast'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState } from '@/components/ui'
import { Brand } from '@/components/ui/Brand'

import { Landing, StaffLanding } from '@/pages/Landing'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { StudentPortal } from '@/pages/student/StudentPortal'
import { FindTutor } from '@/pages/staff/FindTutor'
import { PersonDetail } from '@/pages/staff/PersonDetail'
import { People } from '@/pages/admin/People'

/** Blocks a route until the session is known, then enforces the role. */
function Protected({ allow, children }: { allow?: Array<'student' | 'lecturer' | 'admin'>; children: React.ReactNode }) {
  const { session, loading, role } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><LoadingState label="Checking your session…" /></div>
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (allow && role && !allow.includes(role)) {
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}

/** Students get a bare single page; staff get the full shell with navigation. */
function AppHome() {
  const { role } = useAuth()
  if (role === 'student') return <StudentPortal />
  return <FindTutor />
}

function Shell({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()
  // Students and convenors each have a single page, so neither needs a sidebar.
  // Only administrators, who have several, get the full navigation shell.
  if (role === 'admin') return <AppShell>{children}</AppShell>
  return <PlainChrome wide={role === 'lecturer'}>{children}</PlainChrome>
}

function PlainChrome({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const { profile, signOut, role } = useAuth()
  const width = wide ? 'max-w-7xl' : 'max-w-5xl'
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
        <div className={`mx-auto flex h-14 ${width} items-center gap-3 px-6`}>
          <Brand size={30} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-ink-900">Casual Academic Portal</p>
            <p className="truncate text-[11px] text-ink-500">School of ICT · Griffith University</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink-900">{profile?.fullName}</p>
              {role === 'lecturer' && <p className="text-[11px] text-ink-500">Course convenor</p>}
            </div>
            <button onClick={() => signOut()}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100">
              Sign out
            </button>
          </div>
        </div>
      </header>
      {wide ? <main className={`mx-auto ${width} px-6 py-8`}>{children}</main> : children}
    </div>
  )
}

function Router() {
  const { session, loading } = useAuth()

  return (
    <Routes>
      <Route path="/" element={
        loading ? <div className="grid min-h-screen place-items-center"><LoadingState /></div>
                : session ? <Navigate to="/app" replace /> : <Landing />
      } />
      <Route path="/staff" element={
        loading ? <div className="grid min-h-screen place-items-center"><LoadingState /></div>
                : session ? <Navigate to="/app" replace /> : <StaffLanding />
      } />
      <Route path="/login" element={session ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/register" element={session ? <Navigate to="/app" replace /> : <Register />} />

      <Route path="/app" element={<Protected><Shell><AppHome /></Shell></Protected>} />

      {/* Staff */}
      <Route path="/app/people/:id" element={
        <Protected allow={['lecturer', 'admin']}><Shell><PersonDetail /></Shell></Protected>} />

      {/* Administration */}
      <Route path="/app/people" element={
        <Protected allow={['admin']}><Shell><People /></Shell></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ToastProvider>
  )
}
