// scripts/backfill-long-summaries.mjs — one-off batch: generate a long-form
// (~2,000-2,500 word) text summary for every book via NVIDIA
// (meta/llama-3.3-70b-instruct), saved to the new `long_summary` column.
// Text-only — no audio is generated here (that's the deliberately-deferred
// "coming soon" piece, see api/voice.js / the app's Full Summary tab).
//
// Bypasses the live /api/ai route (20 req/hour per IP) for the same reason
// as backfill-short-audio.mjs — talks to Supabase + NVIDIA directly.
//
// Cost: free tier (NVIDIA NIM). Re-run safely any time — only touches rows
// where long_summary IS NULL.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NVIDIA_SUMMARY_API_KEY=... node scripts/backfill-long-summaries.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NVIDIA_API_KEY = process.env.NVIDIA_SUMMARY_API_KEY
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MODEL = 'meta/llama-3.3-70b-instruct'

if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!NVIDIA_API_KEY) { console.error('Missing NVIDIA_SUMMARY_API_KEY'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))

function buildPrompt(title, author) {
  return `You are a world-class literary commentator writing an in-depth, ORIGINAL exploration of "${title}" by ${author}. Write your own analysis in your own words — do NOT paraphrase closely, reconstruct passages, or imitate the author's prose style; describe and discuss the ideas, don't rewrite the text.

Structure (separate each part with a blank line so it reads as distinct sections):
1. A short introduction: what the book is and why it matters.
2. 4 to 6 major themes or ideas, each as its own paragraph, explored in real depth with your own commentary on why it matters or how it connects to other thinking.
3. A closing paragraph on key takeaways / why someone should read this book.

Target length: 2,000-2,500 words total. Be substantive and specific to this book, not generic.`
}

async function generateLongSummary(title, author) {
  const r = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_API_KEY}` },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: buildPrompt(title, author) },
        { role: 'user', content: `Write the long-form original exploration of "${title}" by ${author} now.` },
      ],
    }),
  })
  if (!r.ok) throw new Error(`NVIDIA ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const data = await r.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('empty completion')
  return content
}

async function main() {
  const { data: books, error } = await supabase
    .from('books')
    .select('id,title,author')
    .is('long_summary', null)
    .order('title')
  if (error) { console.error('Failed to fetch books:', error.message); process.exit(1) }

  console.log(`${books.length} books missing long_summary.\n`)

  let done = 0, failed = []
  for (const book of books) {
    try {
      const longSummary = await generateLongSummary(book.title, book.author)
      const { error: updErr } = await supabase.from('books')
        .update({ long_summary: longSummary })
        .eq('id', book.id)
      if (updErr) throw new Error(`db update: ${updErr.message}`)

      done++
      console.log(`[${done}/${books.length}] ✓ ${book.title} (${longSummary.length} chars)`)
    } catch (e) {
      failed.push({ id: book.id, title: book.title, error: e.message })
      console.error(`[${done + failed.length}/${books.length}] ✗ ${book.title}: ${e.message}`)
    }
    await sleep(300)
  }

  console.log(`\nDone. ${done} succeeded, ${failed.length} failed.`)
  if (failed.length) {
    console.log('Failed (re-run this script to retry — only NULL long_summary rows are touched):')
    failed.forEach(f => console.log(`  - ${f.title} (${f.id}): ${f.error}`))
  }
}

main()
