// api/feedback.js — user-submitted app feedback (bug reports, feature
// requests, general comments), saved to Supabase, with an admin-only
// listing action so the founder can review it from the Dashboard.
//
//   action: 'submit' — anyone, rate-limited, writes to app_feedback
//   action: 'list'   — admin-only (Supabase access token required),
//                       returns recent submissions for the Dashboard

import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'

const ADMIN_EMAILS = ['abdalrahimmakkawi@gmail.com']
const isAdminEmail = (email) => ADMIN_EMAILS.map(e => e.toLowerCase()).includes(String(email || '').toLowerCase().trim())

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CATEGORIES = ['bug', 'feature', 'general', 'praise', 'other']
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function submitFeedback(req, res, body) {
  if (enforceRateLimit(req, res, 'feedback', 5, 60 * 60 * 1000)) return

  const { name, email, category, message, rating, source, pageUrl } = body
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Please include a message.' })
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: 'Message is too long.' })
  }
  if (email && (typeof email !== 'string' || !emailRegex.test(email) || email.length > 254)) {
    return res.status(400).json({ error: 'Invalid email.' })
  }
  const safeCategory = CATEGORIES.includes(category) ? category : 'general'
  const safeRating = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null

  const { error } = await supabase.from('app_feedback').insert({
    name: typeof name === 'string' ? name.trim().slice(0, 200) : null,
    email: typeof email === 'string' ? email.toLowerCase().trim() : null,
    category: safeCategory,
    message: message.trim(),
    rating: safeRating,
    source: source === 'website' ? 'website' : 'app',
    page_url: typeof pageUrl === 'string' ? pageUrl.slice(0, 500) : null,
    user_agent: (req.headers['user-agent'] || '').slice(0, 500),
  })

  if (error) {
    console.error('[feedback] insert failed:', error.message)
    return res.status(500).json({ error: 'Could not save feedback. Please try again.' })
  }
  return res.status(200).json({ success: true })
}

async function listFeedback(req, res, body) {
  const { accessToken, limit, status } = body
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(401).json({ error: 'Sign in as an admin to view feedback.' })
  }
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken)
    if (authErr || !user?.email || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Admin access required.' })
    }
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  let query = supabase
    .from('app_feedback')
    .select('id, name, email, category, message, rating, source, page_url, status, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit) || 100, 200))
  if (typeof status === 'string' && status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[feedback] list failed:', error.message)
    return res.status(500).json({ error: 'Could not load feedback.' })
  }
  return res.status(200).json({ feedback: data || [] })
}

const HANDLERS = { submit: submitFeedback, list: listFeedback }

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  const handlerFn = HANDLERS[body.action]
  if (!handlerFn) return res.status(400).json({ error: 'Unknown action' })
  return handlerFn(req, res, body)
}
