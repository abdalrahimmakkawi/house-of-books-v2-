import { enforceRateLimit } from './_lib/ratelimit.js'
export default async function handler(req, res) {
  // 30 trends lookups per IP per hour.
  if (enforceRateLimit(req, res, 'trends', 30, 60 * 60 * 1000)) return

  try {
    // Use Google Trends RSS feed — no API key needed
    const r = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const text = await r.text()
    const matches = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
      .slice(1, 8)
      .map(m => m[1])
    res.json({ trending: matches })
  } catch(e) {
    res.json({ trending: [] })
  }
}
