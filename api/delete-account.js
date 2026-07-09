// api/delete-account.js — permanently delete a user's account + data.
// Requires the user's Supabase access token; verifies it server-side,
// then deletes their data rows and their auth account using the service
// role key (SUPABASE_SERVICE_ROLE_KEY). Never expose the service key.

import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (enforceRateLimit(req, res, 'delete', 5, 60 * 60 * 1000)) return

  const { accessToken } = req.body || {}
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({ error: 'Missing access token' })
  }
  if (!SERVICE_KEY) {
    // Client still clears local data + signs out; surface this so it can be configured.
    return res.status(503).json({ error: 'Account deletion is not configured on the server.', code: 'no_service_key' })
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // Verify the token and resolve the user it belongs to.
    const { data: { user }, error: userErr } = await admin.auth.getUser(accessToken)
    if (userErr || !user) return res.status(401).json({ error: 'Invalid or expired session' })

    const email = (user.email || '').toLowerCase().trim()

    // Best-effort cleanup of the user's data rows.
    if (email) {
      try { await admin.from('discussions').delete().eq('user_email', email) } catch {}
      try { await admin.from('premium_users').delete().eq('email', email) } catch {}
    }

    // Delete the auth account itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
    if (delErr) {
      console.error('[delete-account] deleteUser failed:', delErr.message)
      return res.status(500).json({ error: 'Could not delete account. Please contact support.' })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[delete-account] error:', e.message)
    return res.status(500).json({ error: 'Could not delete account. Please contact support.' })
  }
}
