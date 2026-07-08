// retry-missing-books.js
// Run with: node retry-missing-books.js
// Retries the 8 books that failed in the first import

const SUPABASE_URL = 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5NzI3NiwiZXhwIjoyMDg3ODczMjc2fQ.LlF5YqF9HAfmnYJiOrgthA1vsF_sx3f9gAIs4ckZdyM'
const DEEPSEEK_KEY = 'sk-0a2bd43938e740e885070afa5c62d8ea'

const MISSING_BOOKS = [
  { title: "Ego Is the Enemy", author: "Ryan Holiday", category: "Self-Help", read_time_mins: 12 },
  { title: "The Courage to Be Disliked", author: "Ichiro Kishimi", category: "Self-Help", read_time_mins: 14 },
  { title: "Elon Musk", author: "Walter Isaacson", category: "Business", read_time_mins: 20 },
  { title: "Mistakes Were Made But Not by Me", author: "Carol Tavris", category: "Psychology", read_time_mins: 13 },
  { title: "Why We Sleep", author: "Matthew Walker", category: "Psychology", read_time_mins: 14 },
  { title: "The Code Breaker", author: "Walter Isaacson", category: "Science", read_time_mins: 17 },
  { title: "Brief Answers to the Big Questions", author: "Stephen Hawking", category: "Science", read_time_mins: 12 },
  { title: "The Five Dysfunctions of a Team", author: "Patrick Lencioni", category: "Leadership", read_time_mins: 11 },
]

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateSummary(title, author) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}` 
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a literary expert. Return ONLY valid JSON, no markdown, no backticks. Ensure all quotes are properly escaped.'
        },
        {
          role: 'user',
          content: `Generate a summary for "${title}" by ${author}.
Return ONLY this JSON structure with properly escaped quotes:
{
  "short_summary": "2-3 sentence overview of the book",
  "long_summary": "5-7 paragraph comprehensive summary covering main ideas, structure, and key arguments",
  "key_insights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]
}`
        }
      ]
    })
  })

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No content from DeepSeek')

  // Clean up the content and parse
  let cleanContent = content.replace(/```json|```/g, '').trim()
  
  // Try to parse, if it fails, try to fix common JSON issues
  try {
    return JSON.parse(cleanContent)
  } catch (e) {
    console.log('  ⚠️  JSON parse failed, attempting to fix...')
    
    // Fix common quote escaping issues
    cleanContent = cleanContent.replace(/"/g, '\\"')
    cleanContent = cleanContent.replace(/\\"/g, '"')
    
    try {
      return JSON.parse(cleanContent)
    } catch (e2) {
      throw new Error(`JSON parse failed: ${e2.message}. Content: ${cleanContent.substring(0, 200)}...`)
    }
  }
}

async function insertBook(book) {
  const bookRes = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      title: book.title,
      author: book.author,
      category: book.category,
      read_time_mins: book.read_time_mins,
      cover_url: `https://covers.openlibrary.org/b/title/${encodeURIComponent(book.title)}-L.jpg`,
      language: 'English',
      source_type: 'book'
    })
  })

  const bookData = await bookRes.json()
  if (!bookRes.ok) {
    throw new Error(`Failed to insert book: ${JSON.stringify(bookData)}`)
  }

  const bookId = bookData[0]?.id
  if (!bookId) throw new Error('No book ID returned')

  return bookId
}

async function insertSummary(bookId, summary) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/summaries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      book_id: bookId,
      short_summary: summary.short_summary,
      long_summary: summary.long_summary,
      key_insights: summary.key_insights
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to insert summary: ${err}`)
  }
}

async function main() {
  console.log(`Retrying ${MISSING_BOOKS.length} missing books...\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < MISSING_BOOKS.length; i++) {
    const book = MISSING_BOOKS[i]
    console.log(`[${i + 1}/${MISSING_BOOKS.length}] Processing: ${book.title} by ${book.author}`)

    try {
      // Generate summary
      process.stdout.write('  → Generating summary...')
      const summary = await generateSummary(book.title, book.author)
      console.log(' ✓')

      // Insert book
      process.stdout.write('  → Inserting book...')
      const bookId = await insertBook(book)
      console.log(` ✓ (id: ${bookId})`)

      // Insert summary
      process.stdout.write('  → Inserting summary...')
      await insertSummary(bookId, summary)
      console.log(' ✓')

      success++
      console.log(`  ✅ Done! (${success} success, ${failed} failed)\n`)

      // Rate limit: wait 3 seconds between books (longer for retries)
      if (i < MISSING_BOOKS.length - 1) await sleep(3000)

    } catch (err) {
      failed++
      console.log(`\n  ❌ Failed: ${err.message}\n`)

      // Wait longer on error
      await sleep(5000)
    }
  }

  console.log(`\n=============================`)
  console.log(`RETRY DONE! ${success} books added, ${failed} failed.`)
  console.log(`Final total books in DB: ~${202 + success}`)
}

main()
