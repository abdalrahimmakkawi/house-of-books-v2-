import test from 'node:test'
import assert from 'node:assert/strict'
import { books, seedMarineBiology, main, validateBooks } from './seed-marine-biology.mjs'

function database(initial = [], { failWrite = false, hideCatalog = false } = {}) {
  const rows = structuredClone(initial)
  let writes = 0
  return {
    rows, get writes() { return writes },
    fetchImpl: async (url, options) => {
      assert.equal(options.headers.apikey, 'test-key')
      assert.equal(options.headers.Authorization, 'Bearer test-key')
      if (options.method === 'POST') {
        writes++
        assert.equal(options.headers.Prefer, 'resolution=ignore-duplicates,return=minimal')
        if (failWrite) return new Response('private error body', { status: 403 })
        for (const row of JSON.parse(options.body)) if (!rows.some(r => r.id === row.id)) rows.push(row)
        return new Response(null, { status: 204 })
      }
      assert.equal(url.pathname, '/rest/v1/books_catalog')
      return Response.json(hideCatalog && writes ? [] : rows)
    },
  }
}
const options = db => ({ url: 'https://example.supabase.co', key: 'test-key', fetchImpl: db.fetchImpl, log: () => {} })

test('five complete books with cover metadata and substantial summaries', () => {
  validateBooks(books)
  assert.equal(new Set(books.map(b => b.title)).size, 5)
  for (const book of books) {
    assert.ok(book.read_time_mins >= 3)
    assert.ok(book.summary.length < 2000)
    assert.ok(book.cover_url.includes('?default=false'))
  }
})
test('imports and verifies all five through the app catalog; reruns do not write', async () => {
  const db = database([{ id: 'unrelated', title: 'Existing book', author: 'Author', category: 'science', summary: 'Preserve me' }])
  assert.deepEqual(await seedMarineBiology(options(db)), { candidates: 5, verified: 5 })
  assert.equal(db.rows.length, 6)
  assert.equal(db.rows[0].summary, 'Preserve me')
  assert.ok(db.rows.slice(1).every(b => b.category === 'science'))
  assert.deepEqual(await seedMarineBiology(options(db)), { candidates: 0, verified: 5 })
  assert.equal(db.writes, 1)
})
test('existing titles with different UUIDs and punctuation are preserved', async () => {
  const existing = { ...books[3], id: 'existing-id', title: 'Under the Sea Wind', summary: 'Existing editorial content' }
  const db = database([existing])
  await seedMarineBiology(options(db))
  assert.equal(db.rows.length, 5)
  assert.equal(db.rows[0].summary, 'Existing editorial content')
})
test('missing credentials and failed writes fail closed without exposing response bodies', async () => {
  await assert.rejects(seedMarineBiology({ url: 'https://example.supabase.co' }), /requires SUPABASE_SERVICE_ROLE_KEY/)
  await assert.rejects(seedMarineBiology(options(database([], { failWrite: true }))), { message: 'Marine biology database request failed (HTTP 403)' })
})
test('a write is not considered successful until the catalog exposes the books', async () => {
  await assert.rejects(seedMarineBiology(options(database([], { hideCatalog: true }))), /catalog verification failed/)
})
test('preview and local build hooks skip database access without credentials', async () => {
  await main(['--production-only'], { VERCEL_ENV: 'preview' })
  await main(['--production-only'], {})
  await main(['--dry-run'], {})
})
