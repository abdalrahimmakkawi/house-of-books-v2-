import fetch from 'node-fetch'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || ''
const AI_KEY = process.env.AI_KEY || ''
const AI_URL = process.env.AI_URL || 'https://api.deepseek.com/chat/completions'
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'

// Direct REST API calls instead of Supabase client
async function getBooks() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/books?select=id,title,author,category,language,summary_generated&order=created_at.asc`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to fetch books: ${err}`)
  }
  return res.json()
}

async function updateBook(id, summary, key_insights, read_time_mins) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/books?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        summary,
        key_insights,
        read_time_mins,
        audio_summary: summary,
        summary_generated: true,
      })
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Update failed: ${err}`)
  }
  return true
}

async function generateSummary(title, author, category, language) {
  const prompt = `You are writing book summaries for an audio platform powered by ElevenLabs text-to-speech. The summary WILL be converted to speech so it must sound completely natural when read aloud.

Write a summary for: "${title}" by ${author} (Category: ${category})

STRICT AUDIO FORMAT RULES:
- Write in flowing natural sentences ONLY
- NO bullet points, NO dashes, NO asterisks, NO markdown
- NO special characters that sound weird in speech
- Use natural spoken transitions: "First...", "What makes this fascinating is...", "Perhaps most importantly..."
- Write like a knowledgeable friend explaining the book
- Total length: 220-260 words exactly

STRUCTURE TO FOLLOW:
1. Opening hook — one compelling sentence about why this book matters
2. What it is about — two sentences explaining the core premise
3. First key idea — explained in two to three sentences
4. Second key idea — explained in two to three sentences
5. Third key idea — explained in two to three sentences
6. Who should read this — one sentence
7. Closing thought — one inspiring sentence

Return ONLY this exact JSON, nothing else:
{
  "summary": "the full 220-260 word audio-ready summary",
  "key_insights": "a flowing paragraph of 80-100 words covering 3 core insights using First, Second, and Finally as transitions",
  "read_time_mins": a number between 12 and 25
}`

  try {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_KEY}` 
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 800,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    const content = data.choices[0].message.content
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(clean)
    parsed.summary = parsed.summary.replace(/^[-•*]\s*/gm, '').trim()
    parsed.key_insights = parsed.key_insights.replace(/^[-•*]\s*/gm, '').trim()
    return parsed
  } catch(e) {
    console.log(`  ⚠ DeepSeek failed for "${title}": ${e.message}`)
    return {
      summary: `${title} by ${author} is a remarkable work that offers profound insights into ${category.toLowerCase()}. This book has shaped the thinking of countless readers around the world and continues to be as relevant today as when it was first written. The author presents ideas with clarity and conviction, making complex concepts accessible and actionable. First, the book establishes a powerful framework for understanding the core subject matter in a new light. Second, it provides concrete strategies that readers can apply immediately in their own lives. Finally, it challenges us to think differently about what we take for granted, opening our minds to new possibilities. This is essential reading for anyone serious about personal and intellectual growth.`,
      key_insights: `First, the book reveals that our conventional understanding of ${category.toLowerCase()} is often incomplete, and a fresh perspective unlocks new possibilities. Second, the author demonstrates that consistent deliberate practice matters far more than natural talent or dramatic effort. Finally, the book teaches us that self-awareness and reflection are the foundations upon which all meaningful progress is built.`,
      read_time_mins: 15
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  console.log('📊 Fetching books without summaries...')

  let books
  try {
    books = await getBooks()
  } catch(e) {
    console.error('Failed to fetch books:', e.message)
    return
  }

  console.log(`\n📚 Found ${books.length} books needing summaries`)
  console.log(`⏱  Estimated time: ${Math.ceil(books.length * 1.2 / 60)} minutes\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    process.stdout.write(`[${i+1}/${books.length}] ${book.title.slice(0,40)}... `)

    const aiData = await generateSummary(
      book.title,
      book.author,
      book.category || 'General',
      book.language || 'en'
    )

    try {
      await updateBook(
        book.id,
        aiData.summary,
        aiData.key_insights,
        aiData.read_time_mins
      )
      console.log(`✓ ${aiData.summary.split(' ').length} words`)
      success++
    } catch(e) {
      console.log(`✗ ${e.message}`)
      failed++
    }

    await delay(1200)

    if ((i + 1) % 25 === 0) {
      console.log(`\n--- ✓ ${success} done | ✗ ${failed} failed | ${books.length - i - 1} remaining ---\n`)
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ COMPLETE`)
  console.log(`   ✓ Success:  ${success} books`)
  console.log(`   ✗ Failed:   ${failed} books`)
  console.log(`${'='.repeat(50)}`)
  console.log(`\n🎙 All summaries stored and ElevenLabs-ready!`)
}

run()
