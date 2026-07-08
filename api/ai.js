// api/ai.js — Secure server-side DeepSeek proxy
// ✅ API key never exposed to browser
// ✅ Rate limiting: 20 requests per IP per hour
// ✅ Input validation and sanitization

const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// Simple in-memory rate limiter
const rateLimitMap = new Map()
const RATE_LIMIT = 20
const RATE_WINDOW = 60 * 60 * 1000

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] || 'unknown'
}

const LANG_PROMPTS = {
  en:'Respond in English.', ar:'أجب باللغة العربية فقط.',
  fr:'Réponds uniquement en français.', es:'Responde únicamente en español.', zh:'请只用中文回答。',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Debug: Check if API key is available
  if (!DEEPSEEK_API_KEY) {
    console.error('[AI] DEEPSEEK_API_KEY not configured. Available env vars:', Object.keys(process.env).filter(k => k.includes('DEEP')))
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' })
  }
  
  console.log('[AI] API key found, length:', DEEPSEEK_API_KEY.length)

  const ip = getClientIP(req)
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Too many requests. Please wait.' })

  if (JSON.stringify(req.body).length > 8000) return res.status(413).json({ error: 'Request too large' })

  const { type, bookTitle, bookAuthor, langId, messages, finishedTitles, remainingTitles } = req.body

  if (!['chat', 'summary', 'recommendations'].includes(type)) return res.status(400).json({ error: 'Invalid type' })

  const langPrompt = LANG_PROMPTS[langId] || LANG_PROMPTS.en

  try {
    let body

    if (type === 'summary') {
      body = { model:'deepseek-chat', max_tokens:600, messages:[
        { role:'system', content:`You are a world-class literary expert on "${bookTitle}" by ${bookAuthor}. Be insightful. ${langPrompt} Respond in maximum 150 words. Be concise and direct.` },
        { role:'user', content:`Write a comprehensive summary of "${bookTitle}" by ${bookAuthor}. Cover themes, key ideas, takeaways. ${langPrompt}` }
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
      
      return res.status(response.status).json({ 
        error: errorMessage, 
        details: userFriendlyMessage,
        originalError: err
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (type === 'recommendations') {
      try { const titles = JSON.parse(content.replace(/```json|```/g,'').trim()); return res.status(200).json({ titles: Array.isArray(titles)?titles:[] }) }
      catch { return res.status(200).json({ titles:[] }) }
    }

    return res.status(200).json({ content })
  } catch (e) {
    console.error('AI proxy error:', e)
    if (e.name === 'TimeoutError') {
      return res.status(408).json({ error: 'Request timeout', details: 'AI service took too long to respond' })
    }
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
}
