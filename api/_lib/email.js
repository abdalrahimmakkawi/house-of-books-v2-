// api/_lib/email.js — transactional email via Resend. Kept in _lib/ so it does
// NOT count against Vercel Hobby's 12-Serverless-Function limit.
//
// Every send is fail-soft: a mail error is logged and swallowed, never thrown,
// so an email hiccup can never break a payment/cancel flow. If RESEND_API_KEY
// is unset (e.g. sandbox before email is configured), sends are skipped.
//
// Env:
//   RESEND_API_KEY   — from resend.com (required to actually send)
//   RESEND_FROM      — verified sender, e.g. "House of Books <noreply@houseofbooks.site>"
//                      (defaults to Resend's onboarding sender, which can only
//                       email your own account until you verify a domain)
//   SUPPORT_EMAIL    — shown to users for refunds/help (defaults below)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'House of Books <onboarding@resend.dev>'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'abdalrahimmakkawi@gmail.com'

const PLAN_LABEL = { monthly: 'Monthly', yearly: 'Annual' }
const PLAN_PRICE = { monthly: '$8.99 / month', yearly: '$85 / year' }

async function send({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to)
    return
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!r.ok) console.error('[email] Resend error', r.status, (await r.text()).slice(0, 200))
  } catch (e) {
    console.error('[email] send failed:', e.message)
  }
}

const shell = (inner) => `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2a2a2a;line-height:1.6">
  <div style="text-align:center;padding:8px 0 20px"><span style="font-size:22px;color:#b8912f">📚 House of Books</span></div>
  ${inner}
  <hr style="border:none;border-top:1px solid #eee;margin:28px 0 14px"/>
  <p style="font-size:12px;color:#999">Questions or need a refund? Just reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#b8912f">${SUPPORT_EMAIL}</a>.</p>
</div>`

// Sent when a subscription is first confirmed (welcome + receipt).
export async function sendPaymentReceipt({ to, plan }) {
  const label = PLAN_LABEL[plan] || plan
  const price = PLAN_PRICE[plan] || ''
  await send({
    to,
    subject: 'Your House of Books Premium is active ✦',
    html: shell(`
      <h2 style="color:#b8912f;font-weight:500">Welcome to Premium</h2>
      <p>Thanks for subscribing — your <strong>${label}</strong> plan (${price}) is now active.</p>
      <p>You now have the full library, unlimited AI chat, and everything Premium unlocks. Enjoy your reading.</p>
      <p style="margin-top:20px"><a href="https://house-of-books-v2.vercel.app/" style="background:#b8912f;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;display:inline-block">Open House of Books</a></p>
      <p style="font-size:12px;color:#999;margin-top:18px">Your subscription renews automatically each period. You can cancel anytime from your account or your PayPal dashboard — no cancellation fees.</p>
    `),
  })
}

// Sent on every successful renewal charge.
export async function sendRenewalReceipt({ to, plan }) {
  const label = PLAN_LABEL[plan] || plan
  const price = PLAN_PRICE[plan] || ''
  await send({
    to,
    subject: 'House of Books Premium — renewal receipt',
    html: shell(`
      <h2 style="color:#b8912f;font-weight:500">Subscription renewed</h2>
      <p>Your <strong>${label}</strong> plan (${price}) renewed successfully. Thanks for staying with House of Books.</p>
      <p style="font-size:12px;color:#999;margin-top:18px">To stop future renewals, cancel anytime from your account or your PayPal dashboard.</p>
    `),
  })
}

// Sent when a subscription is cancelled (from the app or PayPal side).
export async function sendCancellationEmail({ to, plan }) {
  const label = PLAN_LABEL[plan] || plan
  await send({
    to,
    subject: 'Your House of Books subscription was cancelled',
    html: shell(`
      <h2 style="color:#b8912f;font-weight:500">Subscription cancelled</h2>
      <p>Your <strong>${label}</strong> subscription has been cancelled and won't renew again. You'll keep Premium access until the end of your current paid period.</p>
      <p>Changed your mind? You can resubscribe anytime from the app.</p>
    `),
  })
}
