import { enforceRateLimit } from './_lib/ratelimit.js'
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 30 news lookups per IP per hour.
  if (enforceRateLimit(req, res, 'news', 30, 60 * 60 * 1000)) return

  const { query } = req.body || {}
  if (typeof query !== 'string' || !query.trim() || query.length > 200) {
    return res.json({ articles: [] })
  }
  if (!process.env.NEWS_API_KEY) return res.json({ articles: [] })
  try {
    const r = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${process.env.NEWS_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    )
    const data = await r.json()
    if (data.status !== 'ok') return res.json({ articles: [] })
    const articles = (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      source: a.source?.name || '',
      publishedAt: a.publishedAt?.slice(0, 10),
      url: a.url
    }))
    res.json({ articles })
  } catch(e) {
    res.json({ articles: [] })
  }
}
