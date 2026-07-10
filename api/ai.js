// api/ai.js — Secure server-side DeepSeek proxy
// ✅ API key never exposed to browser
// ✅ Rate limiting: 20 requests per IP per hour
// ✅ Input validation and sanitization

import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from './_lib/ratelimit.js'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// Used to persist a generated summary once, so it's never regenerated for
// the same book again (matches the pre-generated 304 books already stored).
const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

const LANG_PROMPTS = {
  en:'Respond in English.', ar:'أجب باللغة العربية فقط.',
  fr:'Réponds uniquement en français.', es:'Responde únicamente en español.', zh:'请只用中文回答。',
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!DEEPSEEK_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured' })
  }

  if (JSON.stringify(req.body).length > 8000) return res.status(413).json({ error: 'Request too large' })

  const { type, bookId, bookTitle, bookAuthor, langId, messages, finishedTitles, remainingTitles } = req.body

  if (!['chat', 'summary', 'recommendations'].includes(type)) return res.status(400).json({ error: 'Invalid type' })

  // Generate-once, cache-forever: a summary is only ever generated a single
  // time per book. Cache hits skip DeepSeek entirely and don't count against
  // the rate limit — only real generations do.
  if (type === 'summary' && isUuid(bookId) && supabase) {
    try {
      const { data: existing } = await supabase.from('books').select('summary').eq('id', bookId).single()
      if (existing?.summary) {
        return res.status(200).json({ content: existing.summary, cached: true })
      }
    } catch (e) {
      console.error('[AI] summary cache check failed:', e.message)
    }
  }

  // 20 AI requests per IP per hour (only reached on an actual generation).
  if (enforceRateLimit(req, res, 'ai', 20, 60 * 60 * 1000)) return

  const langPrompt = LANG_PROMPTS[langId] || LANG_PROMPTS.en

  try {
    let body

    if (type === 'summary') {
      body = { model:'deepseek-chat', max_tokens:600, messages:[
        { role:'system', content:`You are a world-class literary commentator discussing "${bookTitle}" by ${bookAuthor}. Write an ORIGINAL thematic explanation in your own words — describe the book's core ideas, arguments, and structure at a conceptual level, then add brief original commentary on why the ideas matter or how they connect to other thinking. Do NOT paraphrase closely, reconstruct passages, or imitate the author's prose style or sentence structure — describe the ideas, don't rewrite the text. ${langPrompt} Respond in maximum 150 words. Be concise and direct.` },
        { role:'user', content:`Write an original conceptual summary with brief commentary on "${bookTitle}" by ${bookAuthor}. Cover themes, key ideas, and takeaways in your own words — do not paraphrase or reconstruct the book's actual text. ${langPrompt}` }
      ]}
    } else if (type === 'chat') {
      if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Invalid messages' })
      const clean = messages.slice(-4).filter(m=>m.role&&m.content&&typeof m.content==='string').map(m=>({ role:m.role==='user'?'user':'assistant', content:m.content.slice(0,2000) }))
      body = { model:'deepseek-chat', max_tokens:600, messages:[
        { role:'system', content:`You are a world-class literary expert on "${bookTitle}" by ${bookAuthor}. ${langPrompt}` },
        ...clean
      ]}
    } else if (type === 'recommendations') {
      if (!Array.isArray(finishedTitles)||!Array.isArray(remainingTitles)) return res.status(400).json({ error: 'Invalid data' })
      body = { model:'deepseek-chat', max_tokens:200, messages:[{ role:'user', content:`Based on these read books: ${finishedTitles.slice(0,5).join(', ')}\nFrom this list: ${remainingTitles.slice(0,30).join(', ')}\nReturn ONLY a JSON array of 5 titles, no explanation:\n["title1","title2","title3","title4","title5"]` }]}
    }

    const response = await fetch(DEEPSEEK_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${DEEPSEEK_API_KEY}` },
      signal: AbortSignal.timeout(30000), // 30 second timeout
      body: JSON.stringify(body)
    })

    if (!response.ok) { 
      const err = await response.text()
      console.error('DeepSeek error:', response.status, err)
      
      // Specific handling for common DeepSeek errors
      let errorMessage = `AI service error: ${response.status}`
      let userFriendlyMessage = err
      
      if (response.status === 402) {
        errorMessage = 'AI service payment required'
        userFriendlyMessage = 'AI API quota exceeded or invalid API key'
      } else if (response.status === 401) {
        errorMessage = 'AI service unauthorized'
        userFriendlyMessage = 'Invalid API key configuration'
      } else if (response.status === 429) {
        errorMessage = 'AI service rate limited'
        userFriendlyMessage = 'Too many requests, please try again later'
      }
      
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: errorMessage,
        details: userFriendlyMessage
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (type === 'recommendations') {
      try { const titles = JSON.parse(content.replace(/```json|```/g,'').trim()); return res.status(200).json({ titles: Array.isArray(titles)?titles:[] }) }
      catch { return res.status(200).json({ titles:[] }) }
    }

    if (type === 'summary' && isUuid(bookId) && supabase && content) {
      const { error: saveError } = await supabase
        .from('books')
        .update({ summary: content, summary_generated: true })
        .eq('id', bookId)
      if (saveError) console.error('[AI] failed to persist summary:', saveError.message)
    }

    return res.status(200).json({ content })
  } catch (e) {
    console.error('AI proxy error:', e)
    if (e.name === 'TimeoutError') {
      return res.status(408).json({ error: 'Request timeout', details: 'AI service took too long to respond' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}
