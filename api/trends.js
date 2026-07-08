export default async function handler(req, res) {
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
