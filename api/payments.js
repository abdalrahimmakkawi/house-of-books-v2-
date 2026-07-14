// api/payments.js — single JSON entrypoint for all payment actions, kept in one
// file to stay under Vercel Hobby's 12-Serverless-Function limit. Dispatches on
// the `action` field in the request body:
//   - check-premium                  → is this email premium (and not expired)?
//   - create-paypal-subscription     → start a PayPal Subscriptions checkout (redirect flow)
//   - confirm-paypal-subscription    → verify an approved subscription + unlock premium
//   - cancel-paypal-subscription     → cancel the caller's own subscription (auth-gated)
//
// PayPal is the sole payment provider — Stripe was removed (no Stripe account
// available). Subscriptions give real auto-renewal instead of one-time,
// manually-renewed charges.

import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'
import { paypalFetch, PLAN_IDS, periodEndFromPlan } from './_lib/paypal.js'
import { sendPaymentReceipt, sendCancellationEmail } from './_lib/email.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 254
}

const siteUrl = () => process.env.SITE_URL || 'https://house-of-books-v2.vercel.app'

// ── action handlers ──────────────────────────────────────────────

async function checkPremium(req, res, body) {
  const { email } = body
  if (!isValidEmail(email)) return res.status(400).json({ active: false, error: 'Invalid email' })
  const { data, error } = await supabase
    .from('premium_users')
    .select('active, plan, provider, current_period_end')
    .eq('email', email.toLowerCase().trim())
    .single()
  if (error || !data) return res.status(200).json({ active: false })
  const notExpired = !data.current_period_end || new Date(data.current_period_end) > new Date()
  const active = data.active === true && notExpired
  return res.status(200).json({ active, plan: data.plan || null, provider: data.provider || null })
}

async function createPaypalSubscription(req, res, body) {
  const { plan, email } = body
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  const planId = PLAN_IDS[plan]
  if (!planId) return res.status(400).json({ error: 'Invalid plan' })
  try {
    const sub = await paypalFetch('/v1/billing/subscriptions', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': crypto.randomUUID() },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: `${plan}:${email.toLowerCase().trim()}`,
        subscriber: { email_address: email },
        application_context: {
          brand_name: 'House of Books',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${siteUrl()}/?paypal_return=1&plan=${plan}`,
          cancel_url: `${siteUrl()}/?paypal_cancel=1`,
        },
      }),
    })
    const approveUrl = sub.links?.find(l => l.rel === 'approve')?.href
    if (!approveUrl) throw new Error('No approval link returned')
    return res.status(200).json({ subscriptionID: sub.id, approveUrl })
  } catch (err) {
    console.error('[payments create-paypal-subscription]', err.message, err.details)
    return res.status(502).json({ error: 'Could not start PayPal checkout. Please try again.' })
  }
}

async function confirmPaypalSubscription(req, res, body) {
  const { subscriptionID, email, plan } = body
  if (!subscriptionID) return res.status(400).json({ error: 'Missing subscriptionID' })
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  if (!PLAN_IDS[plan]) return res.status(400).json({ error: 'Invalid plan' })
  try {
    const sub = await paypalFetch(`/v1/billing/subscriptions/${subscriptionID}`)
    if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
      return res.status(402).json({ error: `Subscription is not active yet (status: ${sub.status})` })
    }
    const { error } = await supabase.from('premium_users').upsert({
      email: email.toLowerCase().trim(),
      active: true,
      plan,
      provider: 'paypal_subscription',
      current_period_end: sub.billing_info?.next_billing_time || periodEndFromPlan(plan),
      paypal_subscription_id: subscriptionID,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })
    if (error) throw error
    // Welcome + receipt email (fail-soft — never blocks unlocking premium).
    sendPaymentReceipt({ to: email.toLowerCase().trim(), plan }).catch(() => {})
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[payments confirm-paypal-subscription]', err.message, err.details)
    return res.status(502).json({ error: 'Could not confirm your PayPal subscription. Contact support if you were charged.' })
  }
}

// Cancel the CALLER'S OWN subscription. Auth-gated: the client sends its
// Supabase access token, we resolve the authenticated email server-side, and
// only that email's subscription can be cancelled — so nobody can cancel
// someone else's by guessing an email. (Users without an app session can
// still cancel from their PayPal account directly.)
async function cancelPaypalSubscription(req, res, body) {
  const { accessToken } = body
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(401).json({ error: 'Sign in to cancel your subscription.' })
  }
  let email
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken)
    if (authErr || !user?.email) return res.status(401).json({ error: 'Invalid or expired session.' })
    email = user.email.toLowerCase().trim()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  const { data: row } = await supabase
    .from('premium_users')
    .select('paypal_subscription_id, plan, active')
    .eq('email', email)
    .single()
  if (!row?.paypal_subscription_id) {
    return res.status(404).json({ error: 'No active subscription found for your account.' })
  }

  try {
    // PayPal returns 204 No Content on success; paypalFetch tolerates empty bodies.
    await paypalFetch(`/v1/billing/subscriptions/${row.paypal_subscription_id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Cancelled by user from House of Books' }),
    })
  } catch (err) {
    // If PayPal says it's already cancelled, treat as success and just sync our DB.
    const alreadyGone = err.status === 422 || /already|not.*active/i.test(err.message || '')
    if (!alreadyGone) {
      console.error('[payments cancel]', err.message, err.details)
      return res.status(502).json({ error: 'Could not cancel with PayPal. Please try again or cancel from your PayPal account.' })
    }
  }

  // Mark inactive immediately (the webhook will also fire CANCELLED, which is
  // idempotent). Premium access naturally lapses at current_period_end anyway.
  await supabase.from('premium_users').update({ active: false, updated_at: new Date().toISOString() }).eq('email', email)
  sendCancellationEmail({ to: email, plan: row.plan }).catch(() => {})
  return res.status(200).json({ success: true })
}

const HANDLERS = {
  'check-premium': checkPremium,
  'create-paypal-subscription': createPaypalSubscription,
  'confirm-paypal-subscription': confirmPaypalSubscription,
  'cancel-paypal-subscription': cancelPaypalSubscription,
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (enforceRateLimit(req, res, 'payments', 30, 60 * 60 * 1000)) return

  const body = req.body || {}
  const handlerFn = HANDLERS[body.action]
  if (!handlerFn) return res.status(400).json({ error: 'Unknown action' })
  return handlerFn(req, res, body)
}
