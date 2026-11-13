import { supabase } from './supabase'
import type { Profile, UserRole } from './types'

export interface AppUser {
  id: string
  email: string | null
  name: string
  avatarUrl: string | null
  role: UserRole | null
  /** false until the sign-up questions (role + personal details) are saved */
  onboarded: boolean
}

export function toAppUser(profile: Profile | null, fallback?: { email?: string | null; name?: string | null; avatar?: string | null }): AppUser | null {
  if (!profile) return null
  return {
    id: profile.id,
    email: profile.email ?? fallback?.email ?? null,
    name: profile.full_name || profile.name || fallback?.name || profile.email?.split('@')[0] || 'Friend',
    avatarUrl: profile.avatar_url ?? fallback?.avatar ?? null,
    role: profile.role ?? null,
    onboarded: Boolean(profile.onboarded_at),
  }
}

export interface OnboardingPayload {
  role: UserRole
  full_name: string
  age: number | null
  country: string
}

/** Save the answers from the sign-up step and mark the profile as onboarded. */
export async function saveOnboarding(payload: OnboardingPayload): Promise<Profile> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) throw new Error('You are not signed in.')

  const record = {
    id: user.id,
    email: user.email ?? null,
    role: payload.role,
    full_name: payload.full_name.trim(),
    name: payload.full_name.trim(),
    age: payload.age,
    country: payload.country.trim() || null,
    onboarded_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    const hint = /row-level security|403/i.test(error.message)
      ? ' — RLS is blocking writes. Apply database/migration-rls-supabase-auth.sql in the Supabase SQL editor.'
      : ''
    throw new Error(error.message + hint)
  }
  return data as Profile
}

/** Google sign-in through Supabase Auth (OAuth provider "google"). */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Make sure a profiles row exists for the signed-in user. */
export async function ensureProfile(): Promise<Profile | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) return null

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>
  const googleName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Friend'
  const payload = {
    id: user.id,
    email: user.email ?? null,
    name: googleName,
    avatar_url: meta.avatar_url || meta.picture || null,
  }

  // Read first, then insert-only-if-missing. A blanket upsert would reset
  // full_name (and therefore the display name) to the Google name on every
  // sign-in, wiping whatever the user typed during onboarding.
  const existing = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (existing.data) return existing.data as Profile

  const { data, error } = await supabase
    .from('profiles')
    .insert({ ...payload, full_name: googleName })
    .select()
    .single()

  if (error) {
    // 403 / row-level security means the RLS policies still target the `anon` role.
    // Run database/migration-rls-supabase-auth.sql once in the Supabase SQL editor.
    const hint = /row-level security|403/i.test(error.message)
      ? ' — RLS is blocking writes. Apply database/migration-rls-supabase-auth.sql in the Supabase SQL editor.'
      : ''
    console.warn('[SoulMate] profile insert failed:', error.message + hint)
    return {
      ...payload,
      timezone: null,
      role: null,
      full_name: googleName,
      age: null,
      country: null,
      onboarded_at: null,
    } as Profile
  }
  return data as Profile
}
