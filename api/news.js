import { enforceRateLimit } from './_lib/ratelimit.js'
import { fetchNews } from './_lib/world.js'

// Thin HTTP wrapper. The logic lives in _lib/world.js so api/agent.js can call
// it in-process instead of fetching this endpoint over the network.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 30 news lookups per IP per hour.
  if (enforceRateLimit(req, res, 'news', 30, 60 * 60 * 1000)) return

  const { query } = req.body || {}
  res.json({ articles: await fetchNews(query, { timeoutMs: 10000 }) })
}
