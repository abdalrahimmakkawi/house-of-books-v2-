// add-books.js
// Run with: node add-books.js
// Adds 100 new books to Supabase with AI-generated summaries via DeepSeek

const SUPABASE_URL = 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5NzI3NiwiZXhwIjoyMDg3ODczMjc2fQ.LlF5YqF9HAfmnYJiOrgthA1vsF_sx3f9gAIs4ckZdyM'
const DEEPSEEK_KEY = 'sk-0a2bd43938e740e885070afa5c62d8ea'

const NEW_BOOKS = [
  // Personal Development
  { title: "The 48 Laws of Power", author: "Robert Greene", category: "Self-Help", read_time_mins: 18 },
  { title: "Can't Hurt Me", author: "David Goggins", category: "Self-Help", read_time_mins: 16 },
  { title: "The Obstacle Is the Way", author: "Ryan Holiday", category: "Self-Help", read_time_mins: 12 },
  { title: "Ego Is the Enemy", author: "Ryan Holiday", category: "Self-Help", read_time_mins: 12 },
  { title: "The Daily Stoic", author: "Ryan Holiday", category: "Philosophy", read_time_mins: 10 },
  { title: "Stillness Is the Key", author: "Ryan Holiday", category: "Self-Help", read_time_mins: 12 },
  { title: "The Courage to Be Disliked", author: "Ichiro Kishimi", category: "Self-Help", read_time_mins: 14 },
  { title: "12 Rules for Life", author: "Jordan B. Peterson", category: "Self-Help", read_time_mins: 16 },
  { title: "Beyond Order", author: "Jordan B. Peterson", category: "Self-Help", read_time_mins: 16 },
  { title: "The Road Less Traveled", author: "M. Scott Peck", category: "Self-Help", read_time_mins: 14 },

  // Business & Entrepreneurship
  { title: "Steve Jobs", author: "Walter Isaacson", category: "Business", read_time_mins: 20 },
  { title: "Elon Musk", author: "Walter Isaacson", category: "Business", read_time_mins: 20 },
  { title: "The Everything Store", author: "Brad Stone", category: "Business", read_time_mins: 16 },
  { title: "Shoe Dog", author: "Phil Knight", category: "Business", read_time_mins: 15 },
  { title: "Bad Blood", author: "John Carreyrou", category: "Business", read_time_mins: 14 },
  { title: "Principles", author: "Ray Dalio", category: "Business", read_time_mins: 18 },
  { title: "Never Split the Difference", author: "Chris Voss", category: "Business", read_time_mins: 13 },
  { title: "The Mom Test", author: "Rob Fitzpatrick", category: "Business", read_time_mins: 10 },
  { title: "Company of One", author: "Paul Jarvis", category: "Business", read_time_mins: 12 },
  { title: "Built to Last", author: "Jim Collins", category: "Business", read_time_mins: 15 },

  // Finance & Investing
  { title: "The Millionaire Fastlane", author: "MJ DeMarco", category: "Finance", read_time_mins: 14 },
  { title: "Money: Master the Game", author: "Tony Robbins", category: "Finance", read_time_mins: 18 },
  { title: "The Richest Man in Babylon", author: "George S. Clason", category: "Finance", read_time_mins: 10 },
  { title: "Common Stocks and Uncommon Profits", author: "Philip Fisher", category: "Finance", read_time_mins: 13 },
  { title: "Security Analysis", author: "Benjamin Graham", category: "Finance", read_time_mins: 20 },
  { title: "One Up On Wall Street", author: "Peter Lynch", category: "Finance", read_time_mins: 13 },
  { title: "The Warren Buffett Way", author: "Robert Hagstrom", category: "Finance", read_time_mins: 13 },
  { title: "Die with Zero", author: "Bill Perkins", category: "Finance", read_time_mins: 11 },
  { title: "Set for Life", author: "Scott Trench", category: "Finance", read_time_mins: 12 },
  { title: "The Index Card", author: "Helaine Olen", category: "Finance", read_time_mins: 9 },

  // Psychology
  { title: "Thinking in Bets", author: "Annie Duke", category: "Psychology", read_time_mins: 12 },
  { title: "The Art of Thinking Clearly", author: "Rolf Dobelli", category: "Psychology", read_time_mins: 13 },
  { title: "Mistakes Were Made But Not by Me", author: "Carol Tavris", category: "Psychology", read_time_mins: 13 },
  { title: "The Lucifer Effect", author: "Philip Zimbardo", category: "Psychology", read_time_mins: 16 },
  { title: "Attached", author: "Amir Levine", category: "Psychology", read_time_mins: 12 },
  { title: "The Body Keeps the Score", author: "Bessel van der Kolk", category: "Psychology", read_time_mins: 16 },
  { title: "Lost Connections", author: "Johann Hari", category: "Psychology", read_time_mins: 13 },
  { title: "Why We Sleep", author: "Matthew Walker", category: "Psychology", read_time_mins: 14 },
  { title: "Behave", author: "Robert Sapolsky", category: "Psychology", read_time_mins: 18 },
  { title: "The Righteous Mind", author: "Jonathan Haidt", category: "Psychology", read_time_mins: 15 },

  // Science & Technology
  { title: "A Short History of Nearly Everything", author: "Bill Bryson", category: "Science", read_time_mins: 16 },
  { title: "The Code Breaker", author: "Walter Isaacson", category: "Science", read_time_mins: 17 },
  { title: "The Innovators", author: "Walter Isaacson", category: "Science", read_time_mins: 17 },
  { title: "Life 3.0", author: "Max Tegmark", category: "Science", read_time_mins: 15 },
  { title: "The Second Machine Age", author: "Erik Brynjolfsson", category: "Science", read_time_mins: 14 },
  { title: "Homo Deus", author: "Yuval Noah Harari", category: "Science", read_time_mins: 16 },
  { title: "21 Lessons for the 21st Century", author: "Yuval Noah Harari", category: "Science", read_time_mins: 15 },
  { title: "The Fabric of Reality", author: "David Deutsch", category: "Science", read_time_mins: 16 },
  { title: "Brief Answers to the Big Questions", author: "Stephen Hawking", category: "Science", read_time_mins: 12 },
  { title: "The Order of Time", author: "Carlo Rovelli", category: "Science", read_time_mins: 11 },

  // Philosophy
  { title: "Sophie's World", author: "Jostein Gaarder", category: "Philosophy", read_time_mins: 16 },
  { title: "The Republic", author: "Plato", category: "Philosophy", read_time_mins: 18 },
  { title: "Thus Spoke Zarathustra", author: "Friedrich Nietzsche", category: "Philosophy", read_time_mins: 16 },
  { title: "Being and Nothingness", author: "Jean-Paul Sartre", category: "Philosophy", read_time_mins: 20 },
  { title: "The Myth of Sisyphus", author: "Albert Camus", category: "Philosophy", read_time_mins: 11 },
  { title: "Critique of Pure Reason", author: "Immanuel Kant", category: "Philosophy", read_time_mins: 20 },
  { title: "The Prince", author: "Niccolo Machiavelli", category: "Philosophy", read_time_mins: 11 },
  { title: "Letters from a Stoic", author: "Seneca", category: "Philosophy", read_time_mins: 12 },
  { title: "Antifragile", author: "Nassim Nicholas Taleb", category: "Philosophy", read_time_mins: 16 },
  { title: "The Black Swan", author: "Nassim Nicholas Taleb", category: "Philosophy", read_time_mins: 15 },

  // Health & Wellness
  { title: "How Not to Die", author: "Michael Greger", category: "Health", read_time_mins: 16 },
  { title: "Lifespan", author: "David Sinclair", category: "Health", read_time_mins: 15 },
  { title: "Outlive", author: "Peter Attia", category: "Health", read_time_mins: 17 },
  { title: "The Circadian Code", author: "Satchin Panda", category: "Health", read_time_mins: 13 },
  { title: "Breath", author: "James Nestor", category: "Health", read_time_mins: 13 },
  { title: "The Wim Hof Method", author: "Wim Hof", category: "Health", read_time_mins: 11 },
  { title: "Dopamine Nation", author: "Anna Lembke", category: "Health", read_time_mins: 12 },
  { title: "Good Energy", author: "Casey Means", category: "Health", read_time_mins: 14 },
  { title: "The Longevity Paradox", author: "Steven Gundry", category: "Health", read_time_mins: 14 },
  { title: "Peak", author: "Anders Ericsson", category: "Health", read_time_mins: 13 },

  // Leadership & Management
  { title: "The Culture Code", author: "Daniel Coyle", category: "Leadership", read_time_mins: 13 },
  { title: "Radical Candor", author: "Kim Scott", category: "Leadership", read_time_mins: 13 },
  { title: "No Rules Rules", author: "Reed Hastings", category: "Leadership", read_time_mins: 14 },
  { title: "The Five Dysfunctions of a Team", author: "Patrick Lencioni", category: "Leadership", read_time_mins: 11 },
  { title: "Turn the Ship Around", author: "L. David Marquet", category: "Leadership", read_time_mins: 12 },
  { title: "Trillion Dollar Coach", author: "Eric Schmidt", category: "Leadership", read_time_mins: 12 },
  { title: "High Output Management", author: "Andrew Grove", category: "Leadership", read_time_mins: 13 },
  { title: "An Elegant Puzzle", author: "Will Larson", category: "Leadership", read_time_mins: 13 },
  { title: "The Manager's Path", author: "Camille Fournier", category: "Leadership", read_time_mins: 13 },
  { title: "Measure What Matters", author: "John Doerr", category: "Leadership", read_time_mins: 13 },

  // Creativity & Writing
  { title: "Steal Like an Artist", author: "Austin Kleon", category: "Creativity", read_time_mins: 8 },
  { title: "Show Your Work", author: "Austin Kleon", category: "Creativity", read_time_mins: 8 },
  { title: "On Writing", author: "Stephen King", category: "Creativity", read_time_mins: 13 },
  { title: "Bird by Bird", author: "Anne Lamott", category: "Creativity", read_time_mins: 12 },
  { title: "The Artist's Way", author: "Julia Cameron", category: "Creativity", read_time_mins: 14 },
  { title: "Creativity Inc", author: "Ed Catmull", category: "Creativity", read_time_mins: 15 },
  { title: "Keep Going", author: "Austin Kleon", category: "Creativity", read_time_mins: 8 },
  { title: "The Creative Act", author: "Rick Rubin", category: "Creativity", read_time_mins: 14 },
  { title: "Originals", author: "Adam Grant", category: "Creativity", read_time_mins: 13 },
  { title: "Give and Take", author: "Adam Grant", category: "Business", read_time_mins: 13 },

  // Memoir & Biography
  { title: "Long Walk to Freedom", author: "Nelson Mandela", category: "Biography", read_time_mins: 20 },
  { title: "The Diary of a Young Girl", author: "Anne Frank", category: "Biography", read_time_mins: 13 },
  { title: "Leonardo da Vinci", author: "Walter Isaacson", category: "Biography", read_time_mins: 18 },
  { title: "Einstein", author: "Walter Isaacson", category: "Biography", read_time_mins: 18 },
  { title: "I Know Why the Caged Bird Sings", author: "Maya Angelou", category: "Biography", read_time_mins: 13 },
  { title: "The Glass Castle", author: "Jeannette Walls", category: "Biography", read_time_mins: 13 },
  { title: "Surely You're Joking Mr Feynman", author: "Richard Feynman", category: "Biography", read_time_mins: 14 },
  { title: "Born a Crime", author: "Trevor Noah", category: "Biography", read_time_mins: 13 },
  { title: "Open", author: "Andre Agassi", category: "Biography", read_time_mins: 15 },
  { title: "The Pursuit of Happyness", author: "Chris Gardner", category: "Biography", read_time_mins: 13 },
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
          content: 'You are a literary expert. Return ONLY valid JSON, no markdown, no backticks.'
        },
        {
          role: 'user',
          content: `Generate a summary for "${title}" by ${author}.
Return ONLY this JSON structure:
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

  const parsed = JSON.parse(content.replace(/```json|```/g, '').trim())
  return parsed
}

async function getCoverUrl(title, author) {
  const query = encodeURIComponent(`${title} ${author}`)
  return `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg` 
}

async function insertBook(book) {
  // Insert book
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
  console.log(`Starting to add ${NEW_BOOKS.length} books...\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < NEW_BOOKS.length; i++) {
    const book = NEW_BOOKS[i]
    console.log(`[${i + 1}/${NEW_BOOKS.length}] Processing: ${book.title} by ${book.author}`)

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

      // Rate limit: wait 2 seconds between books
      if (i < NEW_BOOKS.length - 1) await sleep(2000)

    } catch (err) {
      failed++
      console.log(`\n  ❌ Failed: ${err.message}\n`)

      // Wait longer on error
      await sleep(3000)
    }
  }

  console.log(`\n=============================`)
  console.log(`DONE! ${success} books added, ${failed} failed.`)
  console.log(`Total books in DB: ~${110 + success}`)
}

main()
