// api/create-checkout.js — creates a Stripe Checkout Session.
//
// Card payments use mode:'subscription' against a recurring Price (real
// auto-renewal). Alipay and WeChat Pay don't support Stripe subscriptions,
// so those use mode:'payment' for a one-time charge covering one billing
// period — the user renews manually before it lapses (same model as PayPal).
//
// Requires env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY.
// Not set yet — this endpoint is code-ready but inactive until the real
// Stripe account/prices are created and the keys are added in Vercel.

import Stripe from 'stripe'
import { enforceRateLimit } from './_lib/ratelimit.js'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
}

// One-time amounts (in cents) for Alipay/WeChat Pay, mirroring the card prices.
const ONE_TIME_AMOUNTS = {
  monthly: 899,
  yearly: 8000,
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 254
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (enforceRateLimit(req, res, 'create-checkout', 20, 60 * 60 * 1000)) return

  if (!stripe) {
    return res.status(503).json({ error: 'Card/Alipay/WeChat checkout is not configured yet.' })
  }

  const { plan, email, method } = req.body || {}
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  if (!PRICE_IDS[plan]) return res.status(400).json({ error: 'Invalid plan — must be "monthly" or "yearly"' })
  const paymentMethod = ['card', 'alipay', 'wechat_pay'].includes(method) ? method : 'card'

  const siteUrl = process.env.SITE_URL || 'https://house-of-books-v2.vercel.app'

  try {
    let session
    if (paymentMethod === 'card') {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
        metadata: { plan, email: email.toLowerCase().trim() },
        subscription_data: { metadata: { plan, email: email.toLowerCase().trim() } },
        success_url: `${siteUrl}/?checkout=success`,
        cancel_url: `${siteUrl}/?checkout=cancelled`,
      })
    } else {
      // Alipay / WeChat Pay — one-time payment for one billing period.
      const paymentMethodOptions = paymentMethod === 'wechat_pay'
        ? { wechat_pay: { client: 'web' } }
        : undefined
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: [paymentMethod],
        payment_method_options: paymentMethodOptions,
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `House of Books Premium — ${plan === 'yearly' ? 'Yearly' : 'Monthly'}` },
            unit_amount: ONE_TIME_AMOUNTS[plan],
          },
          quantity: 1,
        }],
        metadata: { plan, email: email.toLowerCase().trim(), one_time: 'true' },
        success_url: `${siteUrl}/?checkout=success`,
        cancel_url: `${siteUrl}/?checkout=cancelled`,
      })
    }
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout] Error:', err.message)
    return res.status(502).json({ error: 'Could not start checkout. Please try again.' })
  }
}
