// api/payments-webhook.js — PayPal subscription webhook (raw body, signature
// verified). PayPal is the sole payment provider — Stripe was removed (no
// Stripe account available). Register this URL in PayPal Developer Dashboard
// → Webhooks, subscribed to:
//   BILLING.SUBSCRIPTION.ACTIVATED, BILLING.SUBSCRIPTION.CANCELLED,
//   BILLING.SUBSCRIPTION.SUSPENDED, BILLING.SUBSCRIPTION.EXPIRED,
//   PAYMENT.SALE.COMPLETED (fires on every renewal charge)

import { createClient } from '@supabase/supabase-js'
import { paypalFetch, periodEndFromPlan, PAYPAL_MODE_ACTIVE } from './_lib/paypal.js'
import { sendRenewalReceipt, sendCancellationEmail } from './_lib/email.js'

// NOTE: the project URL fallback is REQUIRED, not cosmetic. createClient throws
// "supabaseUrl is required" on undefined, and because this runs at module scope
// that throw kills the whole function before the handler executes — every PayPal
// event 500s (FUNCTION_INVOCATION_FAILED). That silently breaks renewals and
// cancellations while first-time checkout keeps working, so it doesn't surface
// until a customer's first renewal. Keep this in sync with api/payments.js.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

// resource is a PayPal subscription object: has custom_id ("plan:email"),
// id, status, and billing_info.next_billing_time once active.
async function upsertFromSubscriptionResource(resource, activeOverride) {
  const [plan, email] = (resource.custom_id || '').split(':')
  if (!email || !plan) return
  const active = activeOverride !== undefined ? activeOverride : resource.status === 'ACTIVE'
  await upsertPremium({
    email: email.toLowerCase().trim(),
    active,
    plan,
    provider: 'paypal_subscription',
    current_period_end: resource.billing_info?.next_billing_time || periodEndFromPlan(plan),
    paypal_subscription_id: resource.id,
  })
  console.log(`[payments-webhook paypal] ${resource.id} → active=${active} for ${email}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  let rawBody
  try { rawBody = await getRawBody(req) } catch { return res.status(400).json({ error: 'Failed to read body' }) }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) {
    // FAIL CLOSED in live mode: an unverified webhook lets anyone POST a fake
    // "payment succeeded" event and grant themselves premium. Only tolerate a
    // missing webhook id in sandbox (for local/dev testing).
    if (PAYPAL_MODE_ACTIVE === 'live') {
      console.error('[payments-webhook] PAYPAL_WEBHOOK_ID missing in LIVE mode — rejecting')
      return res.status(503).json({ error: 'Webhook not configured' })
    }
    console.warn('[payments-webhook] PAYPAL_WEBHOOK_ID not set — skipping verification (sandbox only)')
  } else {
    let verified = false
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
      console.error('[payments-webhook] verify error', err.message)
      return res.status(400).json({ error: 'Signature verification failed' })
    }
    if (!verified) return res.status(401).json({ error: 'Invalid signature' })
  }

  let payload
  try { payload = JSON.parse(rawBody.toString()) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  const type = payload.event_type
  const resource = payload.resource || {}

  try {
    if (type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      await upsertFromSubscriptionResource(resource, true)
    } else if (
      type === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      type === 'BILLING.SUBSCRIPTION.SUSPENDED' ||
      type === 'BILLING.SUBSCRIPTION.EXPIRED'
    ) {
      await upsertFromSubscriptionResource(resource, false)
      // Email on a genuine cancel (from PayPal side). Idempotent-ish: if the
      // user cancelled in-app they already got one, but a second is harmless.
      const [plan, email] = (resource.custom_id || '').split(':')
      if (email && type === 'BILLING.SUBSCRIPTION.CANCELLED') {
        sendCancellationEmail({ to: email.toLowerCase().trim(), plan }).catch(() => {})
      }
    } else if (type === 'PAYMENT.SALE.COMPLETED' && resource.billing_agreement_id) {
      // A renewal charge succeeded — look up the subscription for the
      // custom_id (plan/email) and the fresh next_billing_time.
      const sub = await paypalFetch(`/v1/billing/subscriptions/${resource.billing_agreement_id}`)
      await upsertFromSubscriptionResource(sub, true)
      const [plan, email] = (sub.custom_id || '').split(':')
      // Only email on RENEWALS, not the first charge (confirm-subscription
      // already sent the welcome receipt). PayPal sends this ~immediately for
      // the first payment too, so skip if the sub was created moments ago.
      const isFirstCharge = sub.create_time && (Date.now() - new Date(sub.create_time).getTime()) < 10 * 60 * 1000
      if (email && !isFirstCharge) {
        sendRenewalReceipt({ to: email.toLowerCase().trim(), plan }).catch(() => {})
      }
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[payments-webhook] db error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
