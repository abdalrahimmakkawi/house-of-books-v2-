// scripts/regenerate-thin.mjs — regenerate every book whose long_summary
// paginates to FEWER than TARGET_PAGES (the app breaks a page each time a
// paragraph would exceed 200 words), producing a longer essay so it reads as
// >= TARGET_PAGES. Parallel across multiple NVIDIA keys on the fast 8B model.
//
// OVERWRITES existing summaries (unlike the NULL-only backfill). Re-runnable —
// on each run it re-selects whatever is still under target.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NVIDIA_KEYS=k1,k2,... \
//   [TARGET_PAGES=7] node scripts/regenerate-thin.mjs

import { createClient } from '@supabase/supabase-js'
import { appendFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const KEYS = (process.env.NVIDIA_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct'
const TARGET_PAGES = parseInt(process.env.TARGET_PAGES || '7', 10)
const BACKUP_FILE = process.env.SUMMARY_BACKUP || '../long-summaries-backup.jsonl'

if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!KEYS.length) { console.error('Missing NVIDIA_KEYS'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 6

// Exact replica of the app's paginateSummary page-splitting (200-word pages).
function pageCount(text) {
  const paras = (text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  let pages = 0, cur = 0, wc = 0
  for (const p of paras) {
    const w = p.split(/\s+/).length
    if (cur && wc + w > 200) { pages++; cur = 0; wc = 0 }
    cur++; wc += w
  }
  if (cur) pages++
  return pages || 1
}

// 8B ignores "write 1,600 words" and stops around ~1,000 words (~6 pages). So
// we generate a main essay, then request ADDITIONAL distinct sections and
// append — two calls reliably reach ~11 pages.
function buildMain(title, author) {
  return `Write an in-depth, ORIGINAL literary exploration of "${title}" by ${author}, in your own words. Do NOT paraphrase closely or reconstruct passages — describe and discuss the ideas. Open with an introduction, then several substantial paragraphs each exploring a distinct theme in depth with your own commentary, then a closing paragraph. Separate every paragraph with a blank line. Plain prose only, nothing else.`
}
function buildContinuation(title, author) {
  return `Continue an in-depth exploration of "${title}" by ${author}. Write 4 to 5 ADDITIONAL substantial paragraphs, each on a DIFFERENT aspect not yet covered — e.g. historical/cultural context, key characters or arguments, the author's style and craft, critical reception, comparisons to other works, or the book's legacy and relevance today. Plain prose, blank lines between paragraphs, no headings, no preamble, do not repeat earlier points.`
}

const isTransient = e =>
  (e.status && RETRYABLE_STATUS.has(e.status)) ||
  e.name === 'TimeoutError' ||
  (e.message || '').includes('fetch failed')

async function callNvidia(key, prompt) {
  const r = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!r.ok) {
    const e = new Error(`NVIDIA ${r.status}: ${(await r.text()).slice(0, 120)}`)
    e.status = r.status
    throw e
  }
  const data = await r.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}

// One call with provider-level retry on transient errors.
async function callWithRetry(key, prompt) {
  let lastErr
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try { return await callNvidia(key, prompt) }
    catch (e) {
      lastErr = e
      if (attempt < MAX_ATTEMPTS && isTransient(e)) { await sleep(2000 * attempt); continue }
      throw e
    }
  }
  throw lastErr
}

// Main essay, then append continuations until >= TARGET_PAGES (max 3 extra).
async function generateLong(key, title, author) {
  let text = await callWithRetry(key, buildMain(title, author))
  let rounds = 0
  while (pageCount(text) < TARGET_PAGES && rounds < 3) {
    let more = ''
    try { more = await callWithRetry(key, buildContinuation(title, author)) } catch { break }
    if (!more) break
    text = text + '\n\n' + more
    rounds++
  }
  return text
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
  const { data: all, error } = await supabase
    .from('books').select('id,title,author,long_summary').not('long_summary', 'is', null).order('title')
  if (error) { console.error('fetch failed:', error.message); process.exit(1) }

  const books = all.filter(b => pageCount(b.long_summary) < TARGET_PAGES)
  const total = books.length
  console.log(`${total} books under ${TARGET_PAGES} pages. ${KEYS.length} workers · model ${MODEL}.\n`)
  if (!total) return

  let next = 0, done = 0, short = 0, failed = 0
  const stillShort = [], failedBooks = []

  const worker = async (key, wid) => {
    while (next < books.length) {
      const book = books[next++]
      try {
        const content = await generateLong(key, book.title, book.author)
        const pages = pageCount(content)
        try { appendFileSync(BACKUP_FILE, JSON.stringify({ id: book.id, title: book.title, provider: 'nvidia-regen', content }) + '\n') } catch {}
        await saveWithRetry(book.id, content)
        done++
        if (pages < TARGET_PAGES) { short++; stillShort.push(`${book.title} (${pages}p)`) }
        console.log(`[${done + failed}/${total}] ${pages >= TARGET_PAGES ? '✓' : '△'} ${book.title} (${pages}p, ${content.length}ch) [w${wid}]`)
      } catch (e) {
        failed++; failedBooks.push(`${book.title}: ${e.message}`)
        console.error(`[${done + failed}/${total}] ✗ ${book.title}: ${e.message} [w${wid}]`)
      }
    }
  }
  await Promise.all(KEYS.map((k, i) => worker(k, i + 1)))

  console.log(`\nDone. ${done} regenerated (${short} still < ${TARGET_PAGES}p), ${failed} failed.`)
  if (stillShort.length) { console.log('Still short (best effort — re-run to retry):'); stillShort.forEach(s => console.log('  - ' + s)) }
  if (failedBooks.length) { console.log('Failed:'); failedBooks.forEach(s => console.log('  - ' + s)) }
}

main()
