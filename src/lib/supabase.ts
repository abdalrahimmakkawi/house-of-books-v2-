import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
// Publishable key (safe to expose in a browser bundle — RLS is what actually
// protects the data, not secrecy of this key). Rotated 2026-07-14 after the
// old legacy anon key was found exposed in this repo's public git history;
// the new key system's keys are independently revocable, unlike the old
// shared-JWT-secret anon/service_role pair.
const supabaseKey = 'sb_publishable_I_-Cu0SkBkJAQcU1c2mqqA__lKBABRt'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Auth helpers
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
  return { data, error }
}

export const signInWithTwitter = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: window.location.origin
    }
  })
  return { data, error }
}

export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  })
  return { data, error }
}

export const signOut = async () => {
  await supabase.auth.signOut()
}

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export interface Book {
  id: string
  title: string
  author: string
  cover_url: string
  category: string
  read_time_mins?: number
  summary?: string | null
  key_insights?: string | null
  audio_url?: string | null
  summary_generated?: boolean
  // long-form (~2000-2500 word) text summary, batch-generated separately —
  // null until scripts/backfill-long-summaries.mjs has run for this book
  long_summary?: string | null
  // true once the per-book detail fetch (summary/key_insights/audio_url)
  // has run for this session — prevents refetching books with no summary yet
  detail_loaded?: boolean
}
