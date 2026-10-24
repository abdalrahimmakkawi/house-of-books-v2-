// Additive content migration. No existing book is updated or removed.
// Production Vercel builds run it after Vite succeeds; preview/local builds skip.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const books = JSON.parse(readFileSync(new URL('../data/marine-biology.json', import.meta.url), 'utf8'))

export function validateBooks(rows) {
  if (rows.length !== 5 || new Set(rows.map(b => b.id)).size !== 5) throw new Error('Expected five unique marine biology books')
  for (const b of rows) {
    if (!/^[0-9a-f-]{36}$/.test(b.id) || b.category !== 'Science' || !b.title || !b.author ||
        !b.cover_url.startsWith('https://') || !b.summary || b.long_summary.length < 3500 ||
        b.key_insights.split('\n').length !== 5 || b.is_premium !== false || !b.summary_generated) {
      throw new Error('Invalid marine biology entry: ' + b.title)
    }
  }
}

export async function seedMarineBiology({ url, key, fetchImpl = fetch, log = console.log }) {
  validateBooks(books)
  if (!url || !key) throw new Error('Marine biology import requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL')
  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }
  const request = async (table, query, options = {}) => {
    const endpoint = new URL('/rest/v1/' + table, url)
    endpoint.search = new URLSearchParams(query).toString()
    const response = await fetchImpl(endpoint, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(30000) })
    // Do not print response bodies: infrastructure errors may include secrets.
    if (!response.ok) throw new Error('Marine biology database request failed (HTTP ' + response.status + ')')
    return response.status === 204 ? [] : response.json()
  }
  // Catalog metadata is public and includes premium titles too.
  const catalog = await request('books_catalog', { select: 'id,title,author,category' })
  const normalize = text => String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const science = catalog.find(b => normalize(b.category) === 'science')?.category || 'Science'
  const additions = books.filter(book => !catalog.some(existing =>
    existing.id === book.id ||
    (normalize(existing.title) === normalize(book.title) && normalize(existing.author) === normalize(book.author))
  )).map(book => ({ ...book, category: science }))
  if (additions.length) {
    // Stable UUIDs + ignore-duplicates also handle concurrent production builds.
    await request('books', { on_conflict: 'id' }, {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(additions),
    })
  }
  // Read back via the same view used by the app, not merely the write result.
  const verified = await request('books_catalog', { select: 'id,title,author,category' })
  for (const book of books) {
    if (!verified.some(b => normalize(b.title) === normalize(book.title) && normalize(b.author) === normalize(book.author) && normalize(b.category) === 'science')) {
      throw new Error('Marine biology catalog verification failed for ' + book.title)
    }
  }
  log('Marine biology import verified: 5 Science titles; ' + additions.length + ' insert candidates.')
  return { candidates: additions.length, verified: books.length }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  validateBooks(books)
  if (args.includes('--dry-run')) {
    console.log('Validated 5 marine biology books, summaries, and key insights. No database changes.')
    return
  }
  if (args.includes('--production-only') && env.VERCEL_ENV !== 'production') {
    console.log('Marine biology import skipped outside Vercel production.')
    return
  }
  await seedMarineBiology({
    url: env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
    key: env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
