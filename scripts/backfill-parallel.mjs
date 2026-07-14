// scripts/backfill-parallel.mjs — parallel long-summary generation across
// MULTIPLE NVIDIA keys. One worker per key, all pulling from a single shared
// queue of NULL-long_summary books, so a single congested/slow key never
// blocks the others. ~N keys ≈ N× throughput.
//
// Same generation contract as backfill-long-summaries.mjs: model
// meta/llama-3.3-70b-instruct, max_tokens 2048, ~1,200-1,400 words, a
// MIN_CHARS floor, retries on transient (uncharged) errors, a local JSONL
// backup written before the DB write, and a retried DB write. Re-runnable —
// only touches rows where long_summary IS NULL.
//
// Usage (keys comma-separated, no spaces needed):
//   SUPABASE_SERVICE_ROLE_KEY=... NVIDIA_KEYS=key1,key2,key3 \
//   node scripts/backfill-parallel.mjs

import { createClient } from '@supabase/supabase-js'
import { appendFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const KEYS = (process.env.NVIDIA_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
// Model is env-overridable. The 70B endpoint is heavily congested (60-160s+,
// frequent timeouts); the 8B endpoint is fast (~10s) and reliable and still
// produces ~4,500-char / ~4-5-page essays that read well — the pragmatic
// choice for finishing the long tail quickly. Override with NVIDIA_MODEL.
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct'
const BACKUP_FILE = process.env.SUMMARY_BACKUP || '../long-summaries-backup.jsonl'

if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!KEYS.length) { console.error('Missing NVIDIA_KEYS (comma-separated)'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 6
const MIN_CHARS = 3500 // ~4 pages — anything shorter is too thin, don't save

function buildInstruction(title, author) {
  return `Write an in-depth, ORIGINAL literary exploration of "${title}" by ${author}, in your own words. Do NOT paraphrase closely, reconstruct passages, or imitate the author's prose style — describe and discuss the ideas, don't rewrite the text.

Structure it, separating each part with a blank line so it reads as distinct sections:
1. A short introduction: what the book is and why it matters.
2. 4 to 6 major themes or ideas, each as its own paragraph, explored in real depth with your own commentary on why each matters or how it connects to other thinking.
3. A closing paragraph on key takeaways / why someone should read this book.

Target length: approximately 1,200-1,400 words — finish your thought, do not get cut off mid-sentence. Be substantive and specific to this book, not generic. Write the full essay now as plain prose, nothing else.`
}

const isTransient = e =>
  (e.status && RETRYABLE_STATUS.has(e.status)) ||
  e.name === 'TimeoutError' ||
  (e.message || '').includes('fetch failed')

async function callNvidia(key, title, author) {
  const r = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(160000),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildInstruction(title, author) }],
    }),
  })
  if (!r.ok) {
    const e = new Error(`NVIDIA ${r.status}: ${(await r.text()).slice(0, 120)}`)
    e.status = r.status
    throw e
  }
  const data = await r.json()
  const content = (data.choices?.[0]?.message?.content || '').trim()
  if (content.length < MIN_CHARS) throw new Error(`too short (${content.length} chars)`)
  return content
}

async function generate(key, title, author) {
  let lastErr
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try { return await callNvidia(key, title, author) }
    catch (e) {
      lastErr = e
      if (attempt < MAX_ATTEMPTS && isTransient(e)) {
        await sleep(2000 * attempt) // 2s..12s
        continue
      }
      throw e
    }
  }
  throw lastErr
}

async function saveWithRetry(id, content) {
  let updErr
  for (let a = 1; a <= 6; a++) {
    ({ error: updErr } = await supabase.from('books').update({ long_summary: content }).eq('id', id))
    if (!updErr) return
    await sleep(2000 * a)
  }
  throw new Error(`db update: ${updErr.message}`)
}

async function main() {
  const { data: books, error } = await supabase
    .from('books').select('id,title,author').is('long_summary', null).order('title')
  if (error) { console.error('Failed to fetch books:', error.message); process.exit(1) }

  const total = books.length
  console.log(`${total} books missing long_summary. ${KEYS.length} parallel workers · model ${MODEL}.\n`)

  let next = 0, done = 0, failed = 0
  const failedBooks = []

  // One worker per key. JS is single-threaded, so next++ is race-free.
  const worker = async (key, wid) => {
    while (next < books.length) {
      const book = books[next++]
      try {
        const content = await generate(key, book.title, book.author)
        try { appendFileSync(BACKUP_FILE, JSON.stringify({ id: book.id, title: book.title, provider: 'nvidia', content }) + '\n') } catch {}
        await saveWithRetry(book.id, content)
        done++
        console.log(`[${done + failed}/${total}] ✓ ${book.title} (${content.length} ch) [w${wid}]`)
      } catch (e) {
        failed++
        failedBooks.push({ title: book.title, error: e.message })
        console.error(`[${done + failed}/${total}] ✗ ${book.title}: ${e.message} [w${wid}]`)
      }
    }
  }

  await Promise.all(KEYS.map((k, i) => worker(k, i + 1)))

  console.log(`\nDone. ${done} succeeded, ${failed} failed (still NULL — re-run to retry).`)
  if (failedBooks.length) failedBooks.forEach(f => console.log(`  - ${f.title}: ${f.error}`))
}

main()
