// scripts/backfill-short-audio.mjs — one-off batch: generate the short-summary
// MP3 for every book that doesn't have one yet, and cache it in Supabase
// Storage (same generate-once-forever pattern as api/voice.js).
//
// Bypasses the live /api/voice route entirely — that route is rate-limited
// to 6 generations/hour per IP for real user traffic, which would make a
// ~300-book backfill take days. This script talks to Supabase + ElevenLabs
// directly with the service-role key.
//
// COSTS REAL MONEY (ElevenLabs credits). Re-run safely any time — it only
// ever touches rows where audio_url IS NULL, so a partial/failed run can
// just be re-run to pick up where it left off.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... ELEVENLABS_API_KEY=... node scripts/backfill-short-audio.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!ELEVENLABS_API_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Mirrors api/voice.js exactly, so backfilled audio matches what the live
// endpoint would have produced for the same book.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
const MODEL_ID = 'eleven_turbo_v2_5'
const MAX_CHARS = 2000
const AUDIO_BUCKET = 'audio'
const VOICE_BY_CATEGORY = {
  'self-help':    'EST9Ui6982FZPSi7gCHi',
  'productivity': 'EST9Ui6982FZPSi7gCHi',
  'health':       'EST9Ui6982FZPSi7gCHi',
  'creativity':   'EST9Ui6982FZPSi7gCHi',
  'psychology':   'HKFOb9iktHA85uKXydRT',
  'philosophy':   'HKFOb9iktHA85uKXydRT',
  'leadership':   'HKFOb9iktHA85uKXydRT',
  'finance':      'Yg7C1g7suzNt5TisIqkZ',
  'business':     'Yg7C1g7suzNt5TisIqkZ',
  'biography':    'Yg7C1g7suzNt5TisIqkZ',
  'science':      'OIadkU6YLviNhuekXGly',
}
function pickVoice(category) {
  return VOICE_BY_CATEGORY[String(category || '').toLowerCase().trim()] || DEFAULT_VOICE_ID
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function synthesize(text, voiceId) {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
    {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(50000),
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  )
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return Buffer.from(await r.arrayBuffer())
}

async function main() {
  const { data: books, error } = await supabase
    .from('books')
    .select('id,title,category,summary')
    .is('audio_url', null)
    .order('title')
  if (error) { console.error('Failed to fetch books:', error.message); process.exit(1) }

  const todo = books.filter(b => (b.summary || '').trim())
  console.log(`${books.length} books missing audio_url, ${todo.length} have a summary to narrate.\n`)

  let done = 0, failed = []
  for (const book of todo) {
    const clean = book.summary.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS)
    try {
      const audio = await synthesize(clean, pickVoice(book.category))
      const path = `${book.id}.mp3`
      const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET)
        .upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
      if (upErr) throw new Error(`storage upload: ${upErr.message}`)

      const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path)
      const { error: updErr } = await supabase.from('books')
        .update({ audio_url: pub.publicUrl })
        .eq('id', book.id)
      if (updErr) throw new Error(`db update: ${updErr.message}`)

      done++
      console.log(`[${done}/${todo.length}] ✓ ${book.title} (${clean.length} chars)`)
    } catch (e) {
      failed.push({ id: book.id, title: book.title, error: e.message })
      console.error(`[${done + failed.length}/${todo.length}] ✗ ${book.title}: ${e.message}`)
    }
    await sleep(500) // be gentle on the ElevenLabs API
  }

  console.log(`\nDone. ${done} succeeded, ${failed.length} failed.`)
  if (failed.length) {
    console.log('Failed (re-run this script to retry — only NULL audio_url rows are touched):')
    failed.forEach(f => console.log(`  - ${f.title} (${f.id}): ${f.error}`))
  }
}

main()
