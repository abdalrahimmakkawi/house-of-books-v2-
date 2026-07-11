// api/stripe-webhook.js — Stripe webhook handler covering both payment shapes:
//   - Card: real subscriptions, auto-renew, tracked via customer.subscription.*
//   - Alipay / WeChat Pay: one-time payment per period (checkout.session.completed
//     with mode 'payment'), current_period_end computed manually since there's
//     no underlying Stripe subscription object.
//
// Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env vars.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = []
    req.on('data', chunk => data.push(chunk))
    req.on('end', () => resolve(Buffer.concat(data)))
    req.on('error', reject)
  })
}

export const config = {
  api: { bodyParser: false },
}

function periodEndFromPlan(plan) {
  const now = new Date()
  if (plan === 'yearly') now.setFullYear(now.getFullYear() + 1)
  else now.setMonth(now.getMonth() + 1)
  return now.toISOString()
}

async function upsertPremium(fields) {
  const { error } = await supabase
    .from('premium_users')
    .upsert({ ...fields, updated_at: new Date().toISOString() }, { onConflict: 'email' })
  if (error) throw error
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured yet.' })

  const rawBody = await getRawBody(req)
  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.warn('[Stripe webhook] Signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  console.log(`[Stripe webhook] Event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { plan, email, one_time } = session.metadata || {}
        if (!plan || !email) break

        if (one_time === 'true') {
          // Alipay / WeChat Pay — pay-per-period, no Stripe subscription object.
          const method = session.payment_method_types?.[0] || 'unknown'
          await upsertPremium({
            email,
            active: true,
            plan,
            provider: `stripe_${method}`,
            current_period_end: periodEndFromPlan(plan),
            stripe_customer_id: session.customer || null,
          })
          console.log(`[Stripe webhook] Premium activated (one-time, ${method}) for ${email}`)
        }
        // Card subscriptions are handled by customer.subscription.created below —
        // Stripe fires both events for a subscription checkout, so avoid double-writing here.
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const { plan, email } = sub.metadata || {}
        if (!plan || !email) break
        const active = sub.status === 'active' || sub.status === 'trialing'
        await upsertPremium({
          email,
          active,
          plan,
          provider: 'stripe_card',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
        })
        console.log(`[Stripe webhook] Subscription ${sub.status} for ${email}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { email } = sub.metadata || {}
        if (!email) break
        await upsertPremium({ email, active: false })
        console.log(`[Stripe webhook] Subscription cancelled for ${email}`)
        break
      }
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[Stripe webhook] Database error:', err)
    return res.status(500).json({ error: 'Database error' })
  }
}
