import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'
import { callNvidia, hasNvidiaKey } from './_lib/nvidia.js'

// This endpoint powers the admin-only Agent/Dashboard pages. The client UI
// hides those pages behind an email check, but that's cosmetic — anyone can
// POST here directly. The accessToken below is the real gate: it must belong
// to a currently-authenticated Supabase session whose email is an admin.
const ADMIN_EMAILS = ['abdalrahimmakkawi@gmail.com']
const isAdminEmail = (email) => ADMIN_EMAILS.map(e => e.toLowerCase()).includes(String(email || '').toLowerCase().trim())

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function gatherWorldData(query) {
  let context = ''
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:5173'

    const [newsRes, trendsRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      }).then(r => r.json()),
      fetch(`${baseUrl}/api/trends`).then(r => r.json())
    ])

    // Limit each news article to title only, no description
    let articles = ''
    if (newsRes.status === 'fulfilled' && newsRes.value.articles?.length) {
      articles = newsRes.value.articles
        .slice(0, 3)
        .map(a => `- ${a.title} (${a.source})`)
        .join('\n')
    }

    // Limit trends to 5 items only
    let trending = ''
    if (trendsRes.status === 'fulfilled' && trendsRes.value.trending?.length) {
      trending = trendsRes.value.trending
        .slice(0, 5)
        .join(', ')
    }

    // Cap the entire world data context at 300 characters
    const worldContext = (articles + '\n\nCURRENTLY TRENDING GLOBALLY:\n' + trending).slice(0, 300)
    context = worldContext

  } catch(e) {
    console.log('World data error:', e)
  }
  return context
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 15 agent requests per IP per hour.
  if (enforceRateLimit(req, res, 'agent', 15, 60 * 60 * 1000)) return

  // Server-side admin gate. The client only hides the Agent/Dashboard pages
  // in the UI — without this check, anyone could POST here directly and get
  // free, unthrottled-by-role access to the model, plus (once wired up)
  // aggregated user feedback data below.
  const { accessToken, messages, systemPrompt, agentId } = req.body || {}
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(401).json({ error: 'Sign in as an admin to use this.' })
  }
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken)
    if (authErr || !user?.email || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Admin access required.' })
    }
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  if (!messages || !systemPrompt) return res.status(400).json({ error: 'Missing messages or systemPrompt' })

  // Extract user's latest message
  const lastMessage = messages[messages.length - 1]?.content || ''

  async function getUserInsights() {
    try {
      const { data: features } = await supabase
        .from('feedback_insights')
        .select('insight_value, count')
        .order('count', { ascending: false })
        .limit(10)

      const { data: sentiments } = await supabase
        .from('ai_feedback')
        .select('sentiment, book_category')
        .limit(200)

      if (!features?.length && !sentiments?.length) return ''

      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
      sentiments?.forEach(s => {
        if (s.sentiment) sentimentCounts[s.sentiment]++
      })

      const categoryCounts = {}
      sentiments?.forEach(c => {
        if (c.book_category) {
          categoryCounts[c.book_category] = (categoryCounts[c.book_category] || 0) + 1
        }
      })
      const topCats = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat}(${count})`)

      return `
\n\nREAL USER INSIGHTS FROM YOUR PLATFORM (anonymized):
- Feature requests: ${features?.map(f => `${f.insight_value}(${f.count})`).join(', ')}
- User sentiment: ${sentimentCounts.positive} positive / ${sentimentCounts.neutral} neutral / ${sentimentCounts.negative} negative
- Popular categories: ${topCats.join(', ')}
Use this data to give more accurate, data-driven advice.`
    } catch(e) {
      return ''
    }
  }

  // Gather real-time world data
  const worldData = await gatherWorldData(lastMessage.slice(0, 100))

  // Get user insights
  const userInsights = await getUserInsights()

  // Append to system prompt
  const enhancedPrompt = systemPrompt + (worldData
    ? `\n\n--- REAL-WORLD CONTEXT (use this data in your analysis) ---${worldData}\n---` 
    : '') + (userInsights
    ? `\n\n${userInsights}\n---` 
    : '')

  // Tries NVIDIA_API_KEY (confirmed healthy) first, falls back to
  // NVIDIA_SUMMARY_API_KEY (higher-quality 70B model, but prone to getting
  // quota/auth-blocked under heavy use — see api/_lib/nvidia.js).
  if (!hasNvidiaKey()) {
    return res.status(503).json({ error: 'AI service not configured' })
  }
  try {
    const { content } = await callNvidia({
      messages: [
        { role: 'system', content: enhancedPrompt },
        ...messages.slice(-4)
      ],
      maxTokens: 600,
    })
    return res.json({ content, provider: 'nvidia' })
  } catch (nvidiaError) {
    console.error('AI provider failed:', nvidiaError.status, nvidiaError.message)
    const status = nvidiaError.status || 500
    return res.status(status >= 500 ? 502 : status).json({ error: 'AI provider failed. Please try again.' })
  }
}
