// api/paypal-webhook.js — independent server-to-server confirmation that a
// PayPal payment actually completed. Verifies the webhook signature via
// PayPal's own verification endpoint before trusting anything in the payload.
//
// Register this endpoint's URL in the PayPal Developer Dashboard (Webhooks),
// subscribed to at least PAYMENT.CAPTURE.COMPLETED, then set PAYPAL_WEBHOOK_ID
// to the Webhook ID it gives you.

import { createClient } from '@supabase/supabase-js'
import { paypalFetch, periodEndFromPlan } from './_lib/paypal.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyWebhookSignature(req, rawBody) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) {
    console.warn('[PayPal webhook] PAYPAL_WEBHOOK_ID not set — skipping verification')
    return true // allow in early dev before the webhook is registered
  }
  const verification = await paypalFetch('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      transmission_id: req.headers['paypal-transmission-id'],
      transmission_time: req.headers['paypal-transmission-time'],
      cert_url: req.headers['paypal-cert-url'],
      auth_algo: req.headers['paypal-auth-algo'],
      transmission_sig: req.headers['paypal-transmission-sig'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  })
  return verification.verification_status === 'SUCCESS'
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export const config = {
  api: { bodyParser: false },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let rawBody
  try { rawBody = await getRawBody(req) } catch { return res.status(400).json({ error: 'Failed to read body' }) }

  let verified
  try {
    verified = await verifyWebhookSignature(req, rawBody)
  } catch (err) {
    console.error('[PayPal webhook] Verification error:', err.message)
    return res.status(400).json({ error: 'Signature verification failed' })
  }
  if (!verified) {
    console.warn('[PayPal webhook] Invalid signature — rejected')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const eventType = payload.event_type
  console.log(`[PayPal webhook] Event: ${eventType}`)

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    const resource = payload.resource || {}
    const customId = resource.custom_id || '' // format set in create-order: "plan:email"
    const [plan, email] = customId.split(':')

    if (!email || !plan) {
      console.log('[PayPal webhook] No plan/email in custom_id, skipping')
      return res.status(200).json({ received: true })
    }

    try {
      const { error } = await supabase
        .from('premium_users')
        .upsert({
          email: email.toLowerCase().trim(),
          active: true,
          plan,
          provider: 'paypal',
          current_period_end: periodEndFromPlan(plan),
          paypal_order_id: resource.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' })
      if (error) throw error
      console.log(`[PayPal webhook] Premium activated for ${email} (${plan})`)
    } catch (err) {
      console.error('[PayPal webhook] Database error:', err)
      return res.status(500).json({ error: 'Database error' })
    }
  }

  return res.status(200).json({ received: true })
}
