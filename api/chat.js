export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, bookTitle, bookCategory, systemPrompt } = req.body

  try {
    // Only send last 6 messages to save tokens
    const recentMessages = messages.slice(-6)

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
            content: systemPrompt || `You are an expert on the book "${bookTitle}" (${bookCategory}). Answer questions clearly and helpfully in 2-3 paragraphs maximum. Be conversational and insightful.` 
          },
          ...recentMessages
        ]
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    res.json({ content: data.choices[0].message.content })

  } catch(e) {
    console.error('Groq chat error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
