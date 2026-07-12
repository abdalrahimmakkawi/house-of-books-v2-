// api/sitemap.js — Dynamic sitemap for SEO
// Generates sitemap.xml with all book URLs

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const baseUrl = process.env.SITE_URL || 'https://house-of-books-v2.vercel.app'
    const currentDate = new Date().toISOString().split('T')[0]

    // Fetch all books from Supabase (was reading NEXT_PUBLIC_SUPABASE_URL,
    // which is never set in this project, so the sitemap always 500'd)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseKey) {
      return res.status(503).json({ error: 'Database configuration missing' })
    }

    const booksResponse = await fetch(`${supabaseUrl}/rest/v1/books?select=id,title,author,category,created_at&order=title.asc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!booksResponse.ok) {
      console.error('Failed to fetch books for sitemap:', await booksResponse.text())
      return res.status(500).json({ error: 'Failed to fetch books' })
    }

    const books = await booksResponse.json()

    // Generate sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`

    // Add book pages
    books.forEach(book => {
      const bookUrl = `${baseUrl}/book/${book.id}`
      const lastMod = book.created_at ? book.created_at.split('T')[0] : currentDate
      sitemap += `
  <url>
    <loc>${bookUrl}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    })

    sitemap += '\n</urlset>'

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    
    return res.status(200).send(sitemap)
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
