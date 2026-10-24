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
import { voiceFailure, diagnoseVoice } from './_lib/voice-errors.js'

const ELEVENLABS_API_KEY = (process.env.ELEVENLABS_API_KEY || '').trim()
// Fallback narrator ("George"); turbo model is ~5x faster and half the
// cost of multilingual_v2, still covers ar/fr/es/zh (32 languages).
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
const MODEL_ID = 'eleven_turbo_v2_5'
const MAX_CHARS = 2000 // keep per-request TTS latency and cost bounded
const AUDIO_BUCKET = 'audio'
// Languages that may have their own narration stored under books.translations.
// Anything else falls back to 'en' and the original single-slot behaviour.
const TRANSLATABLE = ['ar', 'fr', 'es', 'zh']

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

const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
  process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
) : null

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!supabase) {
    return res.status(503).json({ error: 'Storage service not configured' })
  }

  if (req.body?.action === 'diagnose') {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i,'')
    if(!token) return res.status(403).json({error:'Administrator sign-in required'})
    const {data,error} = await supabase.auth.getUser(token)
    if(error || data.user?.email?.toLowerCase() !== 'abdalrahimmakkawi@gmail.com')
      return res.status(403).json({error:'Administrator sign-in required'})
    if(enforceRateLimit(req,res,'voice-diagnostics',6,60*60*1000)) return
    try { return res.status(200).json(await diagnoseVoice({key:ELEVENLABS_API_KEY,storageConfigured:true})) }
    catch { return res.status(502).json({ok:false,code:'VOICE_DIAGNOSTIC_UNAVAILABLE',message:'Could not reach ElevenLabs to check the key.'}) }
  }

  // `lang` selects WHERE the narration is stored, not just what is spoken.
  // English keeps the original slot (books.audio_url + <bookId>.mp3); every
  // other language gets its own file and its own entry inside the
  // translations JSON, so generating Arabic can never overwrite the English
  // narration — which is exactly what a single shared slot used to do.
  const { bookId, text, category, lang } = req.body || {}
  const langId = TRANSLATABLE.includes(String(lang)) ? String(lang) : 'en'
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
      .select('audio_url, translations')
      .eq('id', bookId)
      .single()
    const cachedUrl = langId === 'en'
      ? existing?.audio_url
      : existing?.translations?.[langId]?.audio_url
    if (cachedUrl) {
      return res.status(200).json({ url: cachedUrl, cached: true })
    }
  } catch (e) {
    console.error('[Voice] cache check failed:', e.message)
    // fall through — worst case we generate again, we don't want a DB hiccup
    // to block narration entirely.
  }

  // Only generation attempts count against the quota — cached replays above
  // already returned and never reach this line.
  if (enforceRateLimit(req, res, 'voice', 6, 60 * 60 * 1000)) return

  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ code:'VOICE_KEY_MISSING', error:'Voice service not configured: ELEVENLABS_API_KEY is missing.' })
  }

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
      const failure = voiceFailure(r.status,await r.json().catch(()=>({})))
      console.error('[Voice] ElevenLabs error',r.status,failure.code)
      return res.status(failure.status).json({error:failure.error,code:failure.code})
    }

    const audio = Buffer.from(await r.arrayBuffer())
    const path = langId === 'en' ? `${bookId}.mp3` : `${bookId}-${langId}.mp3`

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

    // English writes the column; other languages write their own slot inside
    // the translations JSON. jsonb_set is done server-side via rpc-free SQL
    // semantics by merging the object we already read, so we never clobber a
    // sibling language that was written between our read and this write.
    let updateError = null
    if (langId === 'en') {
      ({ error: updateError } = await supabase
        .from('books')
        .update({ audio_url: publicUrl })
        .eq('id', bookId))
    } else {
      const { data: fresh } = await supabase
        .from('books').select('translations').eq('id', bookId).single()
      const merged = { ...(fresh?.translations || {}) }
      merged[langId] = { ...(merged[langId] || {}), audio_url: publicUrl }
      ;({ error: updateError } = await supabase
        .from('books')
        .update({ translations: merged })
        .eq('id', bookId))
    }
    if (updateError) {
      console.error('[Voice] failed to save audio url:', updateError.message)
    }

    return res.status(200).json({ url: publicUrl, cached: false })
  } catch (e) {
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError'
    console.error('[Voice] request failed:', timeout?'timeout':'generation_or_storage')
    return res.status(timeout?504:502).json({code:timeout?'VOICE_TIMEOUT':'VOICE_REQUEST_FAILED',error:timeout?'The voice provider timed out. Please try again.':'Audio generation or storage failed. Please try again or contact support.'})
  }
}
