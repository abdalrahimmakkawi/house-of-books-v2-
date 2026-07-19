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

// Send a sign-in code.
//
// `shouldCreateUser` is what actually distinguishes Sign in from Sign up.
// With OTP there is otherwise no difference — Supabase silently creates an
// account for any address you send a code to. Passing false on the Sign in
// path makes Supabase reject unknown addresses instead, so a returning user
// who mistypes their email gets "no account found" rather than a brand-new
// empty account and a confusing "where did my shelf go?".
export const signInWithEmail = async (email: string, shouldCreateUser = true) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser,
      emailRedirectTo: window.location.origin
    }
  })
  return { data, error }
}

// Verify the 6-digit code from the login email.
//
// This exists because the emailed LINK cannot sign you into the installed
// Android app. The link's first hop is on Supabase's domain
// (…supabase.co/auth/v1/verify?…&redirect_to=…), and Android only hands a URL
// to an app when the app is verified for THAT host — we're only verified for
// our own domain. So Android opens the link in a browser, Supabase redirects
// to us *inside that browser*, and the session ends up on the website instead
// of in the app. (Server-side redirects never hand off to an app, and Gmail's
// in-app browser would swallow the hand-off even if they did.)
//
// Typing a code keeps the whole exchange inside the app, so it works
// identically in the Android app, an iOS home-screen PWA, and the browser.
export const verifyEmailCode = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: 'email',
  })
  return { data, error }
}

// Verify a link that landed on our OWN domain as ?token_hash=…&type=…
// (used when the email template points at us directly rather than at
// Supabase's verify endpoint — that form CAN open the installed app).
export const verifyTokenHash = async (tokenHash: string, type: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: (type || 'email') as 'email' | 'magiclink' | 'recovery' | 'invite',
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
