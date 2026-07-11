// api/payments-webhook.js — one raw-body webhook endpoint for both providers,
// merged to stay under Vercel Hobby's 12-function limit. Route by query param:
//   /api/payments-webhook?provider=paypal
//   /api/payments-webhook?provider=stripe
// Register each provider's dashboard webhook at its matching URL.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { paypalFetch, periodEndFromPlan } from './_lib/paypal.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export const config = { api: { bodyParser: false } }

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function upsertPremium(fields) {
  const { error } = await supabase
    .from('premium_users')
    .upsert({ ...fields, updated_at: new Date().toISOString() }, { onConflict: 'email' })
  if (error) throw error
}

// ── PayPal ───────────────────────────────────────────────────────
async function handlePaypal(req, res, rawBody) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  let verified = true
  if (webhookId) {
    try {
      const v = await paypalFetch('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: JSON.stringify({
          transmission_id: req.headers['paypal-transmission-id'],
          transmission_time: req.headers['paypal-transmission-time'],
          cert_url: req.headers['paypal-cert-url'],
          auth_algo: req.headers['paypal-auth-algo'],
          transmission_sig: req.headers['paypal-transmission-sig'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody.toString()),
        }),
      })
      verified = v.verification_status === 'SUCCESS'
    } catch (err) {
      console.error('[payments-webhook paypal] verify error', err.message)
      return res.status(400).json({ error: 'Signature verification failed' })
    }
  } else {
    console.warn('[payments-webhook paypal] PAYPAL_WEBHOOK_ID not set — skipping verification')
  }
  if (!verified) return res.status(401).json({ error: 'Invalid signature' })

  const payload = JSON.parse(rawBody.toString())
  if (payload.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const [plan, email] = (payload.resource?.custom_id || '').split(':')
    if (email && plan) {
      await upsertPremium({
        email: email.toLowerCase().trim(),
        active: true,
        plan,
        provider: 'paypal',
        current_period_end: periodEndFromPlan(plan),
        paypal_order_id: payload.resource?.id,
      })
      console.log(`[payments-webhook paypal] premium activated for ${email}`)
    }
  }
  return res.status(200).json({ received: true })
}

// ── Stripe ───────────────────────────────────────────────────────
async function handleStripe(req, res, rawBody) {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })
  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.warn('[payments-webhook stripe] bad signature', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object
      const { plan, email, one_time } = s.metadata || {}
      if (plan && email && one_time === 'true') {
        const method = s.payment_method_types?.[0] || 'unknown'
        await upsertPremium({
          email, active: true, plan,
          provider: `stripe_${method}`,
          current_period_end: periodEndFromPlan(plan),
          stripe_customer_id: s.customer || null,
        })
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const { plan, email } = sub.metadata || {}
      if (plan && email) {
        await upsertPremium({
          email,
          active: sub.status === 'active' || sub.status === 'trialing',
          plan,
          provider: 'stripe_card',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
        })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const { email } = event.data.object.metadata || {}
      if (email) await upsertPremium({ email, active: false })
      break
    }
  }
  return res.status(200).json({ received: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  let rawBody
  try { rawBody = await getRawBody(req) } catch { return res.status(400).json({ error: 'Failed to read body' }) }

  const provider = req.query?.provider
  try {
    if (provider === 'paypal') return await handlePaypal(req, res, rawBody)
    if (provider === 'stripe') return await handleStripe(req, res, rawBody)
    return res.status(400).json({ error: 'Unknown provider' })
  } catch (err) {
    console.error('[payments-webhook] db error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
