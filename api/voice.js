// api/voice.js — ElevenLabs text-to-speech proxy for book audio summaries.
// ✅ API key stays server-side (ELEVENLABS_API_KEY env var)
// ✅ Strict rate limit: TTS is the most expensive endpoint we have
// ✅ Input capped and sanitized

import { enforceRateLimit } from './_lib/ratelimit.js'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
// "George" — warm narrator voice; turbo model is ~5x faster and half the
// cost of multilingual_v2, still covers ar/fr/es/zh (32 languages).
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
const MODEL_ID = 'eleven_turbo_v2_5'
const MAX_CHARS = 2000 // keep per-request TTS latency and cost bounded

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'Voice service not configured' })
  }

  // 6 audio generations per IP per hour — strict by design.
  if (enforceRateLimit(req, res, 'voice', 6, 60 * 60 * 1000)) return

  const { text } = req.body || {}
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' })
  }

  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS)

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
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
    res.setHeader('Content-Type', 'audio/mpeg')
    // Same summary → same audio; let the browser/CDN cache it for a day.
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).send(audio)
  } catch (e) {
    console.error('[Voice] error:', e.message)
    return res.status(500).json({ error: 'Voice generation failed' })
  }
}
