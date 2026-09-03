import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when a real backend is configured for this build. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * The anon key is intended to be public. It carries no privileges of its own —
 * every table is guarded by row level security, evaluated against the signed-in
 * user. See supabase/migrations/0003_rls.sql.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
