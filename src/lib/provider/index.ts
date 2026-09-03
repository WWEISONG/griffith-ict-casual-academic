// ---------------------------------------------------------------------------
// Provider selection.
//
// The single place that decides which backend the application talks to.
// Migrating to AWS means adding one case here and one new class — no page,
// component or hook changes.
// ---------------------------------------------------------------------------
import type { DataProvider } from './types'
import { supabase, isSupabaseConfigured } from './supabase/client'
import { SupabaseProvider } from './supabase/SupabaseProvider'
import { LocalProvider } from './mock/LocalProvider'

let instance: DataProvider | null = null

export function getProvider(): DataProvider {
  if (instance) return instance
  instance = isSupabaseConfigured && supabase
    ? new SupabaseProvider(supabase)
    : new LocalProvider()
  return instance
}

export const backendIsLive = isSupabaseConfigured

export type { DataProvider } from './types'
export type { AuthSession, ApplicantFilter, ApplicationDraft, RegisterInput } from './types'
