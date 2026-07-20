import { createClient, type EmailOtpType } from '@supabase/supabase-js'

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

// X / Twitter sign-in is intentionally NOT offered.
//
// It was previously exposed as `provider: 'twitter'`, which Supabase rejects
// with "Unsupported provider: provider is not enabled" — that maps to the
// deprecated OAuth 1.0a provider, which is disabled on this project. The
// modern key is `'x'`, and that DOES redirect, but the project's X provider is
// configured with the GOOGLE client id (…apps.googleusercontent.com), so X
// rejects the request and the user lands on an error page.
//
// Re-enabling it properly needs real credentials from the X developer portal
// (Authentication → Sign In / Providers → "X / Twitter (OAuth 2.0)"), after
// which this becomes signInWithOAuth({ provider: 'x' }).

// OTP-based auth: sends a magic link / 6-digit code via email.
// shouldCreateUser controls whether Supabase creates a new account or rejects
// unknown addresses — the Sign in / Sign up toggle in App.tsx sets this.
export const signInWithEmail = async (email: string, shouldCreateUser = true) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser, emailRedirectTo: window.location.origin }
  })
  return { data, error }
}

// Verify the 6-digit code the user enters after signInWithEmail.
// On success, onAuthStateChange fires SIGNED_IN and the app routes in.
export const verifyEmailCode = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email, token: token.trim(), type: 'email',
  })
  return { data, error }
}

// Verify a link that landed on our OWN domain as ?token_hash=…&type=…
// (used when an email template points at us directly rather than at
// Supabase's verify endpoint — that form CAN open the installed app, for the
// same reason the old magic link couldn't: Android only hands a URL to an
// installed app when the app is verified for THAT URL's own host, and we're
// only verified for our own domain, not supabase.co).
//
// Used for both signup confirmation (type 'signup') and password reset
// (type 'recovery') links — see the two email templates and their App.tsx
// handlers (the token_hash effect, and the PASSWORD_RECOVERY case).
export const verifyTokenHash = async (tokenHash: string, type: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: (type || 'email') as EmailOtpType,
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
  // Whether this title is behind the paywall. Set by the database and
  // enforced there too — the UI reads it only to decide whether to draw the
  // lock, never as the security boundary.
  is_premium?: boolean
  // long-form (~2000-2500 word) text summary, batch-generated separately —
  // null until scripts/backfill-long-summaries.mjs has run for this book
  long_summary?: string | null
  // true once the per-book detail fetch (summary/key_insights/audio_url)
  // has run for this session — prevents refetching books with no summary yet
  detail_loaded?: boolean
}
