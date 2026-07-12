// api/voice.js — ElevenLabs text-to-speech proxy for book audio summaries.
// ✅ API key stays server-side (ELEVENLABS_API_KEY env var)
// ✅ Generate-once, cache-forever: narration is synthesized a single time per
//    book, uploaded to Supabase Storage, and the public URL saved on the book
//    row. Every later listener (any user, anywhere) streams the cached MP3
//    straight from storage — zero ElevenLabs cost after the first listen.
// ✅ Strict rate limit on actual generation (cache hits never touch it)
// ✅ Input capped and sanitized

import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
// Fallback narrator ("George"); turbo model is ~5x faster and half the
// cost of multilingual_v2, still covers ar/fr/es/zh (32 languages).
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
const MODEL_ID = 'eleven_turbo_v2_5'
const MAX_CHARS = 2000 // keep per-request TTS latency and cost bounded
const AUDIO_BUCKET = 'audio'

// Voice assigned per book category (voice IDs are not secrets).
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
  const key = String(category || '').toLowerCase().trim()
  return VOICE_BY_CATEGORY[key] || DEFAULT_VOICE_ID
}

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'Voice service not configured' })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Storage service not configured' })
  }

  const { bookId, text, category } = req.body || {}
  if (!isUuid(bookId)) {
    return res.status(400).json({ error: 'Missing or invalid bookId' })
  }
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' })
  }

  // Cache check FIRST — a fresh DB read, not just trusting the client's
  // local state, so concurrent first-time requests mostly collapse to one
  // generation and everyone else just gets the stored URL for free.
  try {
    const { data: existing } = await supabase
      .from('books')
      .select('audio_url')
      .eq('id', bookId)
      .single()
    if (existing?.audio_url) {
      return res.status(200).json({ url: existing.audio_url, cached: true })
    }
  } catch (e) {
    console.error('[Voice] cache check failed:', e.message)
    // fall through — worst case we generate again, we don't want a DB hiccup
    // to block narration entirely.
  }

  // Only generation attempts count against the quota — cached replays above
  // already returned and never reach this line.
  if (enforceRateLimit(req, res, 'voice', 6, 60 * 60 * 1000)) return

  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS)
  const voiceId = pickVoice(category)

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        // Bail before Vercel's 60s maxDuration kills the function with an
        // opaque 504 — the client shows a friendly retry message instead.
        signal: AbortSignal.timeout(50000),
        body: JSON.stringify({
          text: clean,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      console.error('[Voice] ElevenLabs error', r.status, detail.slice(0, 300))
      return res.status(502).json({ error: 'Voice generation failed' })
    }

    const audio = Buffer.from(await r.arrayBuffer())
    const path = `${bookId}.mp3`

    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, audio, { contentType: 'audio/mpeg', upsert: true })

    if (uploadError) {
      // Storage failed — still let this listener hear it, but don't cache
      // (nothing was saved), so the next request will simply try again.
      console.error('[Voice] storage upload failed:', uploadError.message)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send(audio)
    }

    const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path)
    const publicUrl = pub.publicUrl

    const { error: updateError } = await supabase
      .from('books')
      .update({ audio_url: publicUrl })
      .eq('id', bookId)
    if (updateError) {
      console.error('[Voice] failed to save audio_url:', updateError.message)
    }

    return res.status(200).json({ url: publicUrl, cached: false })
  } catch (e) {
    console.error('[Voice] error:', e.message)
    return res.status(500).json({ error: 'Voice generation failed' })
  }
}
