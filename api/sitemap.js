// api/sitemap.js — sitemap for SEO, served at /sitemap.xml (see vercel.json).
//
// It used to emit a URL per book (/book/<id>). Nothing routes those paths —
// the app opens books from state, never from the URL — so all 300+ of them
// rendered the identical landing page. Submitting that many duplicates is
// worse for the domain than submitting nothing, so the sitemap now lists only
// paths that actually render distinct content. Put the book URLs back the day
// real per-book pages exist, and not before.
//
// No database access is needed for that, which also removes the old failure
// mode where a missing service key made the sitemap 503.

const PAGES = [
  { path: '',              changefreq: 'weekly',  priority: '1.0' },
  { path: '/welcome.html', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy.html', changefreq: 'yearly',  priority: '0.3' },
  { path: '/terms.html',   changefreq: 'yearly',  priority: '0.3' },
  { path: '/refund.html',  changefreq: 'yearly',  priority: '0.3' },
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const baseUrl = (process.env.SITE_URL || 'https://house-of-books-v2.vercel.app').replace(/\/$/, '')
  const today = new Date().toISOString().split('T')[0]

  const urls = PAGES.map(p => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(sitemap)
}
