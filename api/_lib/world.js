// Outside-world context (news + trends), as plain functions.
//
// api/agent.js used to reach these by fetching its OWN domain
// (https://$VERCEL_URL/api/news). That is worth avoiding for three reasons:
// it burns an extra serverless invocation per call, it pays a cold start
// inside a request that is already racing a timeout, and it goes back out
// through the edge — so anything guarding the domain (firewall rules, bot
// challenges) can hang or reject the app's own internal call.
//
// Files under api/_lib/ are not routed as functions, so importing this costs
// nothing against the Hobby plan's 12-function limit.
//
// Neither function throws and neither hangs: every call is bounded by its own
// AbortSignal, and failure returns empty rather than propagating. World data
// is decoration on an answer — it must never be the reason a request dies.

export async function fetchNews(query, { timeoutMs = 6000 } = {}) {
  if (!process.env.NEWS_API_KEY) return []
  if (typeof query !== 'string' || !query.trim() || query.length > 200) return []
  try {
    const r = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}` +
      `&sortBy=publishedAt&pageSize=5&language=en&apiKey=${process.env.NEWS_API_KEY}`,
      { signal: AbortSignal.timeout(timeoutMs) }
    )
    const data = await r.json()
    if (data.status !== 'ok') return []
    return (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      source: a.source?.name || '',
      publishedAt: a.publishedAt?.slice(0, 10),
      url: a.url,
    }))
  } catch {
    return []
  }
}

export async function fetchTrends({ timeoutMs = 6000 } = {}) {
  try {
    const r = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await r.text()
    return [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
      .slice(1, 8)
      .map(m => m[1])
  } catch {
    return []
  }
}
