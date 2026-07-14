// scripts/backfill-long-summaries.mjs — one-off batch: generate a long-form
// (~2,000-2,500 word) text summary for every book, saved to the `long_summary`
// column. Text-only — no audio is generated here (that's the deliberately-
// deferred "coming soon" piece, see api/voice.js / the app's Full Summary tab).
//
// PRIMARY provider: Claude (Anthropic Messages API format) via the endpoint in
// ANTHROPIC_SUMMARY_URL — a much stronger long-form writer.
// FALLBACK provider: NVIDIA (meta/llama-3.3-70b-instruct, OpenAI format) — used
// per-book if Claude has a transient failure, AND permanently for all remaining
// books once Claude returns an auth/balance error (e.g. prepaid credit runs
// out), so a limited primary balance still gets the whole catalog done.
//
// Bypasses the live /api/ai route (rate-limited per IP) — talks to Supabase +
// the providers directly. Re-run safely any time — only touches rows where
// long_summary IS NULL.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   ANTHROPIC_SUMMARY_API_KEY=... \
//   NVIDIA_SUMMARY_API_KEY=... \
//   node scripts/backfill-long-summaries.mjs

import { createClient } from '@supabase/supabase-js'
import { appendFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
// Every generated essay is appended here the instant it's produced — BEFORE the
// DB write — so a (paid-for) Claude essay is never lost to a Supabase network
// blip. Replayable to the DB later without regenerating. Lives outside the git
// repo (parent scratchpad dir).
const BACKUP_FILE = process.env.SUMMARY_BACKUP || '../long-summaries-backup.jsonl'

// Primary: Claude via Anthropic Messages API (endpoint may be a reseller proxy).
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_SUMMARY_API_KEY
const ANTHROPIC_URL = process.env.ANTHROPIC_SUMMARY_URL || 'https://sz.uyilink.com/v1/messages'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_SUMMARY_MODEL || 'claude-sonnet-4-6'

// Fallback: NVIDIA NIM (OpenAI chat-completions format).
const NVIDIA_API_KEY = process.env.NVIDIA_SUMMARY_API_KEY
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct'

if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!ANTHROPIC_API_KEY && !NVIDIA_API_KEY) {
  console.error('Need at least one of ANTHROPIC_SUMMARY_API_KEY or NVIDIA_SUMMARY_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Transient upstream states worth retrying (congestion / rate limits / gateway).
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
// Auth/balance errors — retrying won't help; for the primary this permanently
// disables it and routes the rest of the run to the fallback.
const FATAL_STATUS = new Set([401, 402, 403])
const MAX_ATTEMPTS = 5
// A proper long summary is a multi-page read (~4+ pages). 1500 was too low —
// it let a ~2-page 1,839-char essay ("Arabian Sands") through. 3500 chars is
// ~4 pages; anything shorter is treated as too thin → fall back / retry.
const MIN_CHARS = 3500

// Flips to false the first time Claude returns an auth/balance error, so we
// don't waste retries on the primary for every remaining book.
let primaryEnabled = !!ANTHROPIC_API_KEY

// Everything goes in a single user turn — no `system` parameter. The Claude
// endpoint is an agentic (Claude-Code-style) proxy that injects its own system
// prompt + a Write tool + extended thinking; sending our own `system` conflicts
// with it and makes the model emit tool_use / clarifying questions / truncated
// output. With all instructions in the user message and no system param, it
// returns a clean, complete plain-text essay (verified end-to-end). NVIDIA
// (a normal completions API) handles the same single-message shape fine too.
function buildInstruction(title, author) {
  return `Write an in-depth, ORIGINAL literary exploration of "${title}" by ${author}, in your own words. Do NOT paraphrase closely, reconstruct passages, or imitate the author's prose style — describe and discuss the ideas, don't rewrite the text.

Structure it, separating each part with a blank line so it reads as distinct sections:
1. A short introduction: what the book is and why it matters.
2. 4 to 6 major themes or ideas, each as its own paragraph, explored in real depth with your own commentary on why each matters or how it connects to other thinking.
3. A closing paragraph on key takeaways / why someone should read this book.

Target length: approximately 1,200-1,400 words — finish your thought, do not get cut off mid-sentence. Be substantive and specific to this book, not generic. Write the full essay now as plain prose, nothing else.`
}

// ── Provider calls (one attempt each; throw on error with .status set) ──

async function callClaude(title, author) {
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    // max_tokens sized so a ~1,300-word essay completes naturally (end_turn)
    // in ~40s — within the reseller gateway's timeout. No `system` param (see
    // buildInstruction). 4000 previously 504'd; 2048 lands ~1,300 words clean.
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildInstruction(title, author) }],
    }),
  })
  if (!r.ok) {
    const e = new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`)
    e.status = r.status
    throw e
  }
  const data = await r.json()
  // The proxy is inconsistent: sometimes a clean text block, sometimes a short
  // text preamble ("I'll write…") PLUS the real essay inside a Write tool_use
  // block. Gather every candidate string (joined text blocks + each tool_use
  // string input) and take the LONGEST — never the short preamble.
  const candidates = []
  if (Array.isArray(data.content)) {
    const joinedText = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    if (joinedText) candidates.push(joinedText)
    for (const b of data.content) {
      if (b.type === 'tool_use' && b.input) {
        for (const k of Object.keys(b.input)) {
          if (typeof b.input[k] === 'string' && b.input[k].trim().length > 200) candidates.push(b.input[k].trim())
        }
      }
    }
  }
  const content = candidates.sort((a, b) => b.length - a.length)[0] || ''
  if (content.length < MIN_CHARS) {
    // A short preamble / clarifying question / refusal — not a real essay.
    const e = new Error(`Claude: response too short (${content.length} chars)`)
    e.tooShort = true
    throw e
  }
  return content
}

async function callNvidia(title, author) {
  const r = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_API_KEY}` },
    // The 70B free endpoint is slow (~80s observed for this size) and gets
    // slower under congestion — allow generous headroom before aborting.
    signal: AbortSignal.timeout(160000),
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      max_tokens: 2048,
      messages: [
        { role: 'user', content: buildInstruction(title, author) },
      ],
    }),
  })
  if (!r.ok) {
    const e = new Error(`NVIDIA ${r.status}: ${(await r.text()).slice(0, 200)}`)
    e.status = r.status
    throw e
  }
  const data = await r.json()
  const content = (data.choices?.[0]?.message?.content || '').trim()
  if (content.length < MIN_CHARS) throw new Error(`NVIDIA: response too short (${content.length} chars)`)
  return content
}

// NOTE on cost: a "too short" result is a *charged* 200 from Claude, so we do
// NOT retry it on the same provider (that would burn balance) — generateLong-
// Summary falls straight to the free NVIDIA fallback instead. Only 5xx/429/
// timeout/network errors (no completion produced, not charged) are retried.
const isTransient = e =>
  (e.status && RETRYABLE_STATUS.has(e.status)) ||
  e.name === 'TimeoutError' ||
  (e.message || '').includes('fetch failed')

// Retry a single provider on transient errors with exponential backoff.
async function withRetries(fn, label, title, author) {
  let lastErr
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn(title, author)
    } catch (e) {
      lastErr = e
      if (attempt < MAX_ATTEMPTS && isTransient(e)) {
        const backoff = 2000 * 2 ** (attempt - 1) // 2s, 4s, 8s, 16s
        console.log(`  ↻ ${label} ${e.message} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${backoff / 1000}s`)
        await sleep(backoff)
        continue
      }
      throw e
    }
  }
  throw lastErr
}

// Try Claude (primary) first; fall back to NVIDIA on failure. Returns
// { content, provider }.
async function generateLongSummary(title, author) {
  if (primaryEnabled) {
    try {
      const content = await withRetries(callClaude, 'Claude', title, author)
      return { content, provider: 'claude' }
    } catch (e) {
      if (e.status && FATAL_STATUS.has(e.status)) {
        primaryEnabled = false
        console.log(`  ⚠ Claude auth/balance error (${e.status}) — disabling primary, using NVIDIA for the rest.`)
      } else {
        console.log(`  ⚠ Claude failed (${e.message}) — falling back to NVIDIA for this book.`)
      }
    }
  }
  if (!NVIDIA_API_KEY) throw new Error('Claude failed and no NVIDIA fallback key configured')
  const content = await withRetries(callNvidia, 'NVIDIA', title, author)
  return { content, provider: 'nvidia' }
}

async function main() {
  const { data: books, error } = await supabase
    .from('books')
    .select('id,title,author')
    .is('long_summary', null)
    .order('title')
  if (error) { console.error('Failed to fetch books:', error.message); process.exit(1) }

  console.log(`${books.length} books missing long_summary.`)
  console.log(`Primary: ${ANTHROPIC_API_KEY ? `Claude (${ANTHROPIC_MODEL})` : 'none'} · Fallback: ${NVIDIA_API_KEY ? `NVIDIA (${NVIDIA_MODEL})` : 'none'}\n`)

  let done = 0, failed = []
  const byProvider = { claude: 0, nvidia: 0 }
  for (const book of books) {
    try {
      const { content, provider } = await generateLongSummary(book.title, book.author)
      // Persist to the local backup FIRST — if the DB write later fails, the
      // paid-for content is still safe and replayable (no regeneration cost).
      try { appendFileSync(BACKUP_FILE, JSON.stringify({ id: book.id, title: book.title, provider, content }) + '\n') } catch {}
      // Retry the DB write generously on transient network hiccups so a good
      // generation isn't thrown away.
      let updErr
      for (let a = 1; a <= 6; a++) {
        ({ error: updErr } = await supabase.from('books').update({ long_summary: content }).eq('id', book.id))
        if (!updErr) break
        console.log(`  ↻ db write failed (attempt ${a}/6): ${updErr.message}`)
        await sleep(2000 * a) // 2s,4s,6s,8s,10s
      }
      if (updErr) throw new Error(`db update: ${updErr.message} (content safe in ${BACKUP_FILE})`)

      done++
      byProvider[provider]++
      console.log(`[${done}/${books.length}] ✓ ${book.title} (${content.length} chars, ${provider})`)
    } catch (e) {
      failed.push({ id: book.id, title: book.title, error: e.message })
      console.error(`[${done + failed.length}/${books.length}] ✗ ${book.title}: ${e.message}`)
    }
    await sleep(300)
  }

  console.log(`\nDone. ${done} succeeded (Claude ${byProvider.claude}, NVIDIA ${byProvider.nvidia}), ${failed.length} failed.`)
  if (failed.length) {
    console.log('Failed (re-run this script to retry — only NULL long_summary rows are touched):')
    failed.forEach(f => console.log(`  - ${f.title} (${f.id}): ${f.error}`))
  }
}

main()
