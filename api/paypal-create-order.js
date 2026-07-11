// api/paypal-create-order.js — creates a PayPal Order for one billing period
// (monthly or yearly). PayPal doesn't support silent auto-renewing subscriptions
// the way card payments do, so premium bought via PayPal is pay-per-period:
// the user pays once, gets access until current_period_end, and renews manually.

import { enforceRateLimit } from './_lib/ratelimit.js'
import { paypalFetch, PLAN_PRICES } from './_lib/paypal.js'

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 254
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (enforceRateLimit(req, res, 'paypal-create-order', 20, 60 * 60 * 1000)) return

  const { plan, email } = req.body || {}
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  const price = PLAN_PRICES[plan]
  if (!price) return res.status(400).json({ error: 'Invalid plan — must be "monthly" or "yearly"' })

  const siteUrl = process.env.SITE_URL || 'https://house-of-books-v2.vercel.app'

  try {
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          description: price.label,
          custom_id: `${plan}:${email.toLowerCase().trim()}`,
          amount: { currency_code: 'USD', value: price.amount },
        }],
        application_context: {
          brand_name: 'House of Books',
          user_action: 'PAY_NOW',
          return_url: `${siteUrl}/?paypal_return=1&plan=${plan}`,
          cancel_url: `${siteUrl}/?paypal_cancel=1`,
        },
      }),
    })
    const approveLink = order.links?.find(l => l.rel === 'approve')?.href
    if (!approveLink) throw new Error('No approval link returned by PayPal')
    return res.status(200).json({ orderID: order.id, approveUrl: approveLink })
  } catch (err) {
    console.error('[PayPal create-order] Error:', err.message, err.details)
    return res.status(502).json({ error: 'Could not start PayPal checkout. Please try again.' })
  }
}
