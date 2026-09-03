import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getProvider } from '@/lib/provider'
import type { AuthSession, RegisterInput } from '@/lib/provider'
import type { Profile, Role } from '@/types'

interface AuthValue {
  session: AuthSession | null
  profile: Profile | null
  role: Role | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: (patch: Partial<Profile>) => Promise<void>
  isStaff: boolean
  isAdmin: boolean
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const provider = getProvider()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    provider.getSession()
      .then((s) => { if (!cancelled) setSession(s) })
      .finally(() => { if (!cancelled) setLoading(false) })
    const unsub = provider.onAuthChange((s) => { if (!cancelled) setSession(s) })
    return () => { cancelled = true; unsub() }
  }, [provider])

  const value = useMemo<AuthValue>(() => ({
    session,
    profile: session?.profile ?? null,
    role: session?.profile.role ?? null,
    loading,
    isStaff: session?.profile.role === 'lecturer' || session?.profile.role === 'admin',
    isAdmin: session?.profile.role === 'admin',
    async signIn(email, password) { setSession(await provider.signIn(email, password)) },
    async register(input) { setSession(await provider.register(input)) },
    async signOut() { await provider.signOut(); setSession(null) },
    async refreshProfile(patch) {
      if (!session) return
      const updated = await provider.updateProfile(session.userId, patch)
      setSession({ ...session, profile: updated })
    },
  }), [session, loading, provider])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
