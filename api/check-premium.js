// api/check-premium.js
// Securely checks premium status server-side
// Uses service role key — never exposed to browser

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Simple email validation
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 254
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body || {}

  if (!isValidEmail(email)) {
    return res.status(400).json({ active: false, error: 'Invalid email' })
  }

  try {
    const { data, error } = await supabase
      .from('premium_users')
      .select('active')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !data) return res.status(200).json({ active: false })
    return res.status(200).json({ active: data.active === true })

  } catch (err) {
    console.error('[CheckPremium] Error:', err)
    return res.status(500).json({ active: false, error: 'Server error' })
  }
}
