// api/payments.js — single JSON entrypoint for all payment actions, kept in one
// file to stay under Vercel Hobby's 12-Serverless-Function limit. Dispatches on
// the `action` field in the request body:
//   - check-premium         → is this email premium (and not expired)?
//   - create-paypal-order    → start a PayPal Orders v2 checkout (redirect flow)
//   - capture-paypal-order   → capture an approved PayPal order + unlock premium
//   - create-checkout        → Stripe Checkout Session (card sub / Alipay / WeChat)

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'
import { paypalFetch, periodEndFromPlan, PLAN_PRICES } from './_lib/paypal.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
}
const ONE_TIME_AMOUNTS = { monthly: 899, yearly: 8000 } // cents, for Alipay/WeChat

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

async function createPaypalOrder(req, res, body) {
  const { plan, email } = body
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  const price = PLAN_PRICES[plan]
  if (!price) return res.status(400).json({ error: 'Invalid plan' })
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
          return_url: `${siteUrl()}/?paypal_return=1&plan=${plan}`,
          cancel_url: `${siteUrl()}/?paypal_cancel=1`,
        },
      }),
    })
    const approveUrl = order.links?.find(l => l.rel === 'approve')?.href
    if (!approveUrl) throw new Error('No approval link returned')
    return res.status(200).json({ orderID: order.id, approveUrl })
  } catch (err) {
    console.error('[payments create-paypal-order]', err.message, err.details)
    return res.status(502).json({ error: 'Could not start PayPal checkout. Please try again.' })
  }
}

async function capturePaypalOrder(req, res, body) {
  const { orderID, email, plan } = body
  if (!orderID) return res.status(400).json({ error: 'Missing orderID' })
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' })
  try {
    const capture = await paypalFetch(`/v2/checkout/orders/${orderID}/capture`, { method: 'POST' })
    const captureStatus = capture.purchase_units?.[0]?.payments?.captures?.[0]?.status
    if (capture.status !== 'COMPLETED' || captureStatus !== 'COMPLETED') {
      return res.status(402).json({ error: 'Payment was not completed' })
    }
    const { error } = await supabase.from('premium_users').upsert({
      email: email.toLowerCase().trim(),
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
    console.error('[payments capture-paypal-order]', err.message, err.details)
    return res.status(502).json({ error: 'Could not confirm PayPal payment. Contact support if you were charged.' })
  }
}

async function createCheckout(req, res, body) {
  if (!stripe) return res.status(503).json({ error: 'Card/Alipay/WeChat checkout is not configured yet.' })
  const { plan, email, method } = body
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
  if (!STRIPE_PRICE_IDS[plan]) return res.status(400).json({ error: 'Invalid plan' })
  const paymentMethod = ['card', 'alipay', 'wechat_pay'].includes(method) ? method : 'card'
  try {
    let session
    if (paymentMethod === 'card') {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
        metadata: { plan, email: email.toLowerCase().trim() },
        subscription_data: { metadata: { plan, email: email.toLowerCase().trim() } },
        success_url: `${siteUrl()}/?checkout=success`,
        cancel_url: `${siteUrl()}/?checkout=cancelled`,
      })
    } else {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: [paymentMethod],
        payment_method_options: paymentMethod === 'wechat_pay' ? { wechat_pay: { client: 'web' } } : undefined,
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
        success_url: `${siteUrl()}/?checkout=success`,
        cancel_url: `${siteUrl()}/?checkout=cancelled`,
      })
    }
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[payments create-checkout]', err.message)
    return res.status(502).json({ error: 'Could not start checkout. Please try again.' })
  }
}

const HANDLERS = {
  'check-premium': checkPremium,
  'create-paypal-order': createPaypalOrder,
  'capture-paypal-order': capturePaypalOrder,
  'create-checkout': createCheckout,
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
