import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'
import { ToastProvider } from '@/hooks/useToast'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState } from '@/components/ui'
import { Brand } from '@/components/ui/Brand'

import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { StudentPortal } from '@/pages/student/StudentPortal'
import { FindTutor } from '@/pages/staff/FindTutor'
import { ByCourse } from '@/pages/staff/ByCourse'
import { PersonDetail } from '@/pages/staff/PersonDetail'
import { Allocations } from '@/pages/staff/Allocations'
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
  // The student portal is deliberately one page — no sidebar to navigate.
  if (role === 'student') {
    return <StudentChrome>{children}</StudentChrome>
  }
  return <AppShell>{children}</AppShell>
}

function StudentChrome({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-5">
          <Brand size={30} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-ink-900">Casual Academic Portal</p>
            <p className="truncate text-[11px] text-ink-500">School of ICT · Griffith University</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-sm text-ink-700 sm:block">{profile?.fullName}</p>
            <button onClick={() => signOut()}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100">
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
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
      <Route path="/login" element={session ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/register" element={session ? <Navigate to="/app" replace /> : <Register />} />

      <Route path="/app" element={<Protected><Shell><AppHome /></Shell></Protected>} />

      {/* Staff */}
      <Route path="/app/courses" element={
        <Protected allow={['lecturer', 'admin']}><Shell><ByCourse /></Shell></Protected>} />
      <Route path="/app/people/:id" element={
        <Protected allow={['lecturer', 'admin']}><Shell><PersonDetail /></Shell></Protected>} />
      <Route path="/app/allocations" element={
        <Protected allow={['lecturer', 'admin']}><Shell><Allocations /></Shell></Protected>} />

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
