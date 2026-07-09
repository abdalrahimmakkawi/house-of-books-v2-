// api/chat.js — Groq chat proxy (key server-side only)
// ✅ Strict per-IP rate limit
// ✅ Input validation and size caps
// ✅ No internal error details leaked to clients

import { enforceRateLimit } from './_lib/ratelimit.js'

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 30 chat messages per IP per hour.
  if (enforceRateLimit(req, res, 'chat', 30, 60 * 60 * 1000)) return

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'Chat service not configured' })
  }

  const { messages, bookTitle, bookCategory, systemPrompt } = req.body || {}

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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: String(systemPrompt || `You are an expert on the book "${bookTitle}" (${bookCategory}). Answer questions clearly and helpfully in 2-3 paragraphs maximum. Be conversational and insightful.`).slice(0, 1500)
          },
          ...recentMessages
        ]
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    res.json({ content: data.choices[0].message.content })

  } catch (e) {
    console.error('Groq chat error:', e.message)
    res.status(500).json({ error: 'Chat is temporarily unavailable. Please try again.' })
  }
}
