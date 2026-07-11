// api/paypal-capture-order.js — captures an approved PayPal order and unlocks
// premium immediately. The PayPal webhook (api/paypal-webhook.js) independently
// confirms the same payment server-to-server, so premium activation doesn't
// depend solely on this client-triggered call completing.

import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'
import { paypalFetch, periodEndFromPlan, PLAN_PRICES } from './_lib/paypal.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 254
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (enforceRateLimit(req, res, 'paypal-capture-order', 20, 60 * 60 * 1000)) return

  const { orderID, email, plan } = req.body || {}
  if (!orderID) return res.status(400).json({ error: 'Missing orderID' })
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' })

  try {
    const capture = await paypalFetch(`/v2/checkout/orders/${orderID}/capture`, { method: 'POST' })
    const status = capture.status
    const captureStatus = capture.purchase_units?.[0]?.payments?.captures?.[0]?.status

    if (status !== 'COMPLETED' || captureStatus !== 'COMPLETED') {
      return res.status(402).json({ error: 'Payment was not completed', status, captureStatus })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const { error } = await supabase
      .from('premium_users')
      .upsert({
        email: normalizedEmail,
        active: true,
        plan,
        provider: 'paypal',
        current_period_end: periodEndFromPlan(plan),
        paypal_order_id: orderID,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })

    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[PayPal capture-order] Error:', err.message, err.details)
    return res.status(502).json({ error: 'Could not confirm PayPal payment. Please contact support if you were charged.' })
  }
}
