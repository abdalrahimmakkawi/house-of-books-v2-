// api/chat.js — book AI chat proxy (keys server-side only)
// ✅ Strict per-IP rate limit
// ✅ Input validation and size caps
// ✅ No internal error details leaked to clients
//
// NVIDIA (free tier, fast 8B model) is the sole provider for all book chat —
// demo and full app alike.

import { enforceRateLimit } from './_lib/ratelimit.js'

const PROVIDER = {
  url: 'https://integrate.api.nvidia.com/v1/chat/completions',
  key: process.env.NVIDIA_API_KEY,
  model: 'meta/llama-3.1-8b-instruct',
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 30 chat messages per IP per hour.
  if (enforceRateLimit(req, res, 'chat', 30, 60 * 60 * 1000)) return

  const { messages, bookTitle, bookCategory, systemPrompt } = req.body || {}

  const provider = PROVIDER
  if (!provider.key) {
    return res.status(503).json({ error: 'Chat service not configured' })
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' })
  }
  if (JSON.stringify(req.body).length > 12000) {
    return res.status(413).json({ error: 'Request too large' })
  }

  try {
    // Only send last 6 messages to save tokens; normalize roles, cap lengths
    const recentMessages = messages.slice(-6).map(m => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content || '').slice(0, 2000),
    }))

    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`,
      },
      // Guard against a slow/cold model hanging the serverless function.
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: provider.model,
        // Keep replies short — a hard backstop so the model can't ramble even
        // if the prompt is ignored (~a short paragraph of tokens).
        max_tokens: 220,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: String(systemPrompt || `You are a warm, friendly reading companion who knows the book "${bookTitle}" (${bookCategory}) well. Talk like a real person and keep answers short — a few sentences, one short paragraph at most. If the reader asks you to be brief, honor it immediately. Skip filler and disclaimers; get to the point.`).slice(0, 1500),
          },
          ...recentMessages,
        ],
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || 'provider error')
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('empty completion')

    res.json({ content })

  } catch (e) {
    console.error('[chat] error:', e.message)
    res.status(500).json({ error: 'Chat is temporarily unavailable. Please try again.' })
  }
}
