export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { query } = req.body
  try {
    const r = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${process.env.NEWS_API_KEY}` 
    )
    const data = await r.json()
    if (data.status !== 'ok') return res.json({ articles: [] })
    const articles = data.articles.map(a => ({
      title: a.title,
      description: a.description,
      source: a.source.name,
      publishedAt: a.publishedAt?.slice(0, 10),
      url: a.url
    }))
    res.json({ articles })
  } catch(e) {
    res.json({ articles: [] })
  }
}
