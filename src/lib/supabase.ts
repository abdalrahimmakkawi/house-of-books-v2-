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

// Password auth. This is now the primary path — see App.tsx's Sign in / Sign
// up screen. A password is a real secret only the account owner knows, which
// is what makes "returning users just type email + password, no email
// round-trip" safe. Email-only "sign in" (no password, no code) was
// explicitly rejected: anyone who knows a user's address would be able to
// open their account, admin included.
//
// Sign up: create the account. Confirm email is ON for this project, so the
// account exists but can't sign in until the confirmation link is clicked —
// see the "Confirm sign up" email template, which (like magic link) had to be
// pointed at our own domain rather than Supabase's, or the confirmation link
// would open the website instead of the installed app for the same reason
// the old magic link did.
export const signUpWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin }
  })
  return { data, error }
}

// Sign in: no email round-trip at all when the password is right.
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

// "Forgot password" — sends a reset link. Also points at our own domain via
// the "Reset password" template for the same app-vs-website reason as above.
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  })
  return { data, error }
}

// Sets a new password. Requires the short-lived session that verifyTokenHash
// establishes after a recovery link is confirmed (see App.tsx).
export const updatePassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({ password })
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
