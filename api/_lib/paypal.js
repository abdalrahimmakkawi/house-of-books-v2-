// api/_lib/paypal.js — shared PayPal REST helpers (Subscriptions v1 API).
//
// PAYPAL_MODE controls which PayPal environment we talk to: 'sandbox' (default,
// safe to test with) or 'live'. Never hardcode credentials — PAYPAL_CLIENT_ID /
// PAYPAL_CLIENT_SECRET live in Vercel env vars only.
//
// PayPal is the sole payment provider (Stripe was removed — no Stripe account
// available). Subscriptions give real auto-renewal instead of one-time,
// manually-renewed charges.

const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
const PAYPAL_BASE = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

let cachedToken = null // { value, expiresAt }

export async function getPayPalAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value
  }
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    signal: AbortSignal.timeout(10000),
    body: 'grant_type=client_credentials',
  })
  if (!r.ok) throw new Error(`PayPal auth failed (${r.status})`)
  const j = await r.json()
  cachedToken = { value: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 }
  return cachedToken.value
}

export async function paypalFetch(path, options = {}) {
  const token = await getPayPalAccessToken()
  const r = await fetch(`${PAYPAL_BASE}${path}`, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(j.message || `PayPal request failed (${r.status})`)
    err.details = j
    err.status = r.status
    throw err
  }
  return j
}

export const PAYPAL_MODE_ACTIVE = PAYPAL_MODE
export const PAYPAL_BASE_URL = PAYPAL_BASE

// Billing Plan IDs — created once via scripts/setup-paypal-plans.mjs
// (the Subscriptions API needs a pre-created Plan; amounts aren't passed
// inline the way the one-time Orders API allows).
export const PLAN_IDS = {
  monthly: process.env.PAYPAL_PLAN_MONTHLY_ID,
  yearly: process.env.PAYPAL_PLAN_YEARLY_ID,
}

export function periodEndFromPlan(plan) {
  const now = new Date()
  if (plan === 'yearly') {
    now.setFullYear(now.getFullYear() + 1)
  } else {
    now.setMonth(now.getMonth() + 1)
  }
  return now.toISOString()
}
