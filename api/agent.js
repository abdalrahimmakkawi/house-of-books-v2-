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

// Live pricing. Keep in sync with the paywall UI in src/App.tsx.
const PRICING = { monthly: 8.99, annual: 85 }

// ── Real platform metrics ────────────────────────────────────────────
// Single source of truth for "how is the app actually doing". Used BOTH by
// the `metrics` action (so the admin dashboard can prefill its modules with
// live numbers instead of invented defaults) and by the chat context below,
// so the panel and the model can never disagree with each other.
//
// This exists because the dashboard used to seed its revenue/growth modules
// with hardcoded placeholders — freeUsers:500, conv:4%, moPrice:$10 — and
// then asked the model to analyse them. With 14 real users, 0 premium and a
// real price of $8.99, every projection it produced was fiction built on
// fiction. Everything below is read live; nothing is assumed.
async function getPlatformMetrics() {
  const iso = (d) => new Date(Date.now() - d * 86400000).toISOString()

  const [
    premium, books, withSummary, withAudio, premiumBooks,
    written, chat, features,
  ] = await Promise.all([
    supabase.from('premium_users').select('*', { count: 'exact', head: true }),
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase.from('books').select('*', { count: 'exact', head: true }).not('summary', 'is', null),
    supabase.from('books').select('*', { count: 'exact', head: true }).not('audio_url', 'is', null),
    supabase.from('books').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    supabase.from('app_feedback').select('category, rating, message, created_at').order('created_at', { ascending: false }).limit(40),
    supabase.from('ai_feedback').select('sentiment, book_category, created_at').limit(500),
    supabase.from('feedback_insights').select('insight_value, count').order('count', { ascending: false }).limit(10),
  ])

  // auth.users isn't reachable through PostgREST, so count via the admin API.
  let totalUsers = 0, new7 = 0, new30 = 0, act7 = 0
  try {
    const all = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const list = all?.data?.users || []
    totalUsers = list.length
    const c7 = iso(7), c30 = iso(30)
    new7 = list.filter(u => u.created_at > c7).length
    new30 = list.filter(u => u.created_at > c30).length
    act7 = list.filter(u => u.last_sign_in_at && u.last_sign_in_at > c7).length
  } catch { /* leave zeros; never fabricate */ }

  const premiumCount = premium?.count ?? 0
  const writtenRows = written?.data || []
  const chatRows = chat?.data || []
  const ratings = writtenRows.map(w => w.rating).filter(r => typeof r === 'number')

  const sentiment = { positive: 0, neutral: 0, negative: 0 }
  const categories = {}
  chatRows.forEach(r => {
    if (r.sentiment && sentiment[r.sentiment] !== undefined) sentiment[r.sentiment]++
    if (r.book_category) categories[r.book_category] = (categories[r.book_category] || 0) + 1
  })

  const mrr = +(premiumCount * PRICING.monthly).toFixed(2)

  return {
    generatedAt: new Date().toISOString(),
    users: { total: totalUsers, new7d: new7, new30d: new30, active7d: act7 },
    revenue: {
      premiumUsers: premiumCount,
      conversionPct: totalUsers ? +((premiumCount / totalUsers) * 100).toFixed(1) : 0,
      estMrr: mrr,
      estArr: +(mrr * 12).toFixed(2),
      pricing: PRICING,
    },
    catalog: {
      books: books?.count ?? 0,
      withSummary: withSummary?.count ?? 0,
      withAudio: withAudio?.count ?? 0,
      premiumBooks: premiumBooks?.count ?? 0,
      freeBooks: (books?.count ?? 0) - (premiumBooks?.count ?? 0),
    },
    feedback: {
      writtenCount: writtenRows.length,
      avgRating: ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : null,
      recent: writtenRows.slice(0, 15).map(w => ({
        date: (w.created_at || '').slice(0, 10),
        category: w.category || 'general',
        rating: typeof w.rating === 'number' ? w.rating : null,
        message: String(w.message || '').replace(/\s+/g, ' ').trim().slice(0, 300),
      })),
      chatSessions: chatRows.length,
      sentiment,
      topCategories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ category: k, count: v })),
      featureRequests: (features?.data || []).map(f => ({ value: f.insight_value, count: f.count })),
    },
  }
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

  // Metrics-only call: the admin dashboard fetches this on load to prefill its
  // modules with live numbers. Same function the chat context uses below, so
  // the panel and the model can never show different figures.
  if (req.body?.action === 'metrics') {
    try {
      return res.status(200).json(await getPlatformMetrics())
    } catch (e) {
      return res.status(500).json({ error: 'Could not load metrics' })
    }
  }

  if (!messages || !systemPrompt) return res.status(400).json({ error: 'Missing messages or systemPrompt' })

  // Extract user's latest message
  const lastMessage = messages[messages.length - 1]?.content || ''

  // Feeds the model what users ACTUALLY said. Two things were wrong before:
  //
  //  1. `app_feedback` was never queried. That is the table the in-app and
  //     website feedback forms write to (via api/feedback.js) — i.e. the only
  //     place real, written, human feedback lands. The agent read only
  //     `ai_feedback` (auto-derived keywords/sentiment scraped from AI chat
  //     turns) and `feedback_insights` (an aggregation that only fills when a
  //     chat message happens to parse as a feature request). So the one source
  //     of genuine user opinion was invisible to it.
  //
  //  2. The block was labelled "REAL USER INSIGHTS" and told the model to give
  //     "data-driven advice" with no indication of sample size. With a handful
  //     of rows — most of them the owner testing the app — the model would
  //     confidently report trends like "your users prefer Philosophy" as fact.
  //     Sample sizes are now stated explicitly and the model is told to say so
  //     when the data is too thin to generalise, which is the honest answer
  //     early on.
  async function getUserInsights() {
    try {
      const m = await getPlatformMetrics()
      const f = m.feedback

      const quotes = f.recent.map(w =>
        `  - [${w.date}] (${w.category}, ${w.rating != null ? w.rating + '/5' : 'no rating'}) "${w.message}"`)

      return `

=== LIVE PLATFORM DATA (read from this app's own database just now) ===
Everything in this block is measured, not estimated. Snapshot: ${m.generatedAt}

USERS
  - Total registered: ${m.users.total}
  - New in last 7 days: ${m.users.new7d}   |  last 30 days: ${m.users.new30d}
  - Signed in within last 7 days: ${m.users.active7d}

REVENUE (pricing is live: $${m.revenue.pricing.monthly}/mo, $${m.revenue.pricing.annual}/yr)
  - Paying premium users: ${m.revenue.premiumUsers}
  - Free-to-paid conversion: ${m.revenue.conversionPct}%
  - Estimated MRR: $${m.revenue.estMrr}   |  ARR: $${m.revenue.estArr}

CATALOG
  - Books: ${m.catalog.books} (${m.catalog.freeBooks} free / ${m.catalog.premiumBooks} premium)
  - With summary: ${m.catalog.withSummary}
  - With narrated audio cached: ${m.catalog.withAudio}  <- the rest generate on first listen

WRITTEN FEEDBACK — ${f.writtenCount} submission(s)${f.avgRating ? `, average ${f.avgRating}/5` : ''}
${quotes.length ? quotes.join('\n') : '  (none submitted yet)'}

CHAT TELEMETRY — ${f.chatSessions} AI-chat session(s)
  NOTE: auto-classified from what users typed to the book AI. A weak signal of
  interest, NOT stated opinion about the app. Do not present it as user opinion.
  - Sentiment: ${f.sentiment.positive} positive / ${f.sentiment.neutral} neutral / ${f.sentiment.negative} negative
  - Categories touched: ${f.topCategories.length ? f.topCategories.map(c => `${c.category}(${c.count})`).join(', ') : 'none recorded'}

FEATURE REQUESTS DETECTED — ${f.featureRequests.length}
${f.featureRequests.length ? '  - ' + f.featureRequests.map(x => `${x.value} (${x.count})`).join('\n  - ') : '  (none detected yet)'}

HOW TO USE THIS
  - Use these figures. Do NOT use placeholder or illustrative numbers, and do
    not carry over any figures the user's own prompt template mentions as
    examples — those are not real.
  - Quote written feedback verbatim when it is relevant.
  - These samples are small. If asked for a conclusion the data cannot support,
    say so and state what would be needed to answer it properly.
  - Never invent feedback, quotes, trends, users or revenue.
=== END LIVE PLATFORM DATA ===`
    } catch(e) {
      return '\n\nLIVE PLATFORM DATA: unavailable right now (database read failed). Say so if asked about numbers; do not estimate.'
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
