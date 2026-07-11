// api/_lib/paypal.js — shared PayPal REST helpers (Orders v2 API).
//
// PAYPAL_MODE controls which PayPal environment we talk to: 'sandbox' (default,
// safe to test with) or 'live'. Never hardcode credentials — PAYPAL_CLIENT_ID /
// PAYPAL_CLIENT_SECRET live in Vercel env vars only.

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

// Plan pricing — pay-per-period (one-time PayPal order), matches the Stripe prices.
export const PLAN_PRICES = {
  monthly: { amount: '8.99', label: 'House of Books Premium — Monthly' },
  yearly: { amount: '80.00', label: 'House of Books Premium — Yearly' },
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
