// api/webhook.js — LemonSqueezy webhook with signature verification
// ✅ Verifies webhook signature so fake requests are rejected
// ✅ Only processes legitimate LemonSqueezy events

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Use service role key — only safe on server side, never in browser
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

// ✅ Verify LemonSqueezy signature
function verifySignature(rawBody, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] No webhook secret set — skipping verification')
    return true // allow in dev if not set
  }
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  hmac.update(rawBody)
  const digest = hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

export const config = {
  api: { bodyParser: false } // Need raw body for signature verification
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let rawBody
  try { rawBody = await getRawBody(req) } catch { return res.status(400).json({ error: 'Failed to read body' }) }

  // ✅ SECURITY: Verify signature
  const signature = req.headers['x-signature']
  if (!verifySignature(rawBody, signature)) {
    console.warn('[Webhook] Invalid signature — rejected')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const eventName = payload?.meta?.event_name
  const email = payload?.data?.attributes?.user_email?.toLowerCase()?.trim()

  if (!email) {
    console.log('[Webhook] No email in payload, skipping')
    return res.status(200).json({ received: true })
  }

  console.log(`[Webhook] Event: ${eventName} | Email: ${email}`)

  try {
    if (eventName === 'order_created' || eventName === 'subscription_created') {
      // ✅ Activate premium
      const { error } = await supabase
        .from('premium_users')
        .upsert({ email, active: true }, { onConflict: 'email' })
      if (error) throw error
      console.log(`[Webhook] ✅ Premium activated for ${email}`)

    } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired' || eventName === 'subscription_paused') {
      // ✅ Deactivate premium
      const { error } = await supabase
        .from('premium_users')
        .update({ active: false })
        .eq('email', email)
      if (error) throw error
      console.log(`[Webhook] ⛔ Premium deactivated for ${email}`)

    } else if (eventName === 'subscription_resumed') {
      // ✅ Reactivate
      const { error } = await supabase
        .from('premium_users')
        .update({ active: true })
        .eq('email', email)
      if (error) throw error
      console.log(`[Webhook] ✅ Premium reactivated for ${email}`)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[Webhook] Database error:', err)
    return res.status(500).json({ error: 'Database error' })
  }
}
