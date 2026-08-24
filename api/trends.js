import { enforceRateLimit } from './_lib/ratelimit.js'
import { fetchTrends } from './_lib/world.js'

// Thin HTTP wrapper. The logic lives in _lib/world.js so api/agent.js can call
// it in-process instead of fetching this endpoint over the network.
export default async function handler(req, res) {
  // 30 trends lookups per IP per hour.
  if (enforceRateLimit(req, res, 'trends', 30, 60 * 60 * 1000)) return

  res.json({ trending: await fetchTrends({ timeoutMs: 10000 }) })
}
