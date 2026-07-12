import { enforceRateLimit } from './_lib/ratelimit.js'
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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 15 agent requests per IP per hour.
  if (enforceRateLimit(req, res, 'agent', 15, 60 * 60 * 1000)) return


  const { messages, systemPrompt, agentId } = req.body
  if (!messages || !systemPrompt) return res.status(400).json({ error: 'Missing messages or systemPrompt' })

  // Extract user's latest message
  const lastMessage = messages[messages.length - 1]?.content || ''

  async function getUserInsights() {
    try {
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      )

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

  // NVIDIA (meta/llama-3.3-70b-instruct — the same model used for book
  // summaries, chosen here for its stronger reasoning on agent tasks).
  try {
    const nvidiaApiKey = process.env.NVIDIA_SUMMARY_API_KEY
    if (!nvidiaApiKey) {
      throw new Error('NVIDIA API key not configured')
    }

    const res1 = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaApiKey}`
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: 'system', content: enhancedPrompt },
          ...messages.slice(-4)
        ]
      })
    })

    if (!res1.ok) {
      const err = await res1.text()
      throw new Error(`NVIDIA error: ${res1.status} - ${err}`)
    }

    const data = await res1.json()
    const content = data.choices?.[0]?.message?.content || ''

    return res.json({ content, provider: 'nvidia' })

  } catch(nvidiaError) {
    console.error('AI provider failed:', nvidiaError.message)
    return res.status(500).json({ error: 'AI provider failed. Please try again.' })
  }
}
