// add-multilingual-books.js
// Run: node add-multilingual-books.js
// Adds 100 books from diverse languages and cultures to Supabase
// Mix of: Arabic, French, Spanish, Chinese, Japanese, Russian, German, Latin American, Persian originals
// All summaries generated in English for accessibility
// Takes ~30-35 min to run

const SUPABASE_URL = 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5NzI3NiwiZXhwIjoyMDg3ODczMjc2fQ.LlF5YqF9HAfmnYJiOrgthA1vsF_sx3f9gAIs4ckZdyM'
const DEEPSEEK_KEY = 'sk-0a2bd43938e740e885070afa5c62d8ea'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

const NEW_BOOKS = [

  // ── ARABIC LITERATURE & THOUGHT (أدب عربي) ────────────────────────
  { title:"The Muqaddimah", author:"Ibn Khaldun", category:"Philosophy", read_time_mins:20, language:"ar", origin:"🇹🇳 Tunisian-Arab" },
  { title:"One Thousand and One Nights", author:"Anonymous (Arab folk tales)", category:"Biography", read_time_mins:15, language:"ar", origin:"🌍 Arab" },
  { title:"The Book of Misers (Kitab al-Bukhalaa)", author:"Al-Jahiz", category:"Psychology", read_time_mins:12, language:"ar", origin:"🌍 Arab" },
  { title:"The Autobiography of Ibn Khaldun", author:"Ibn Khaldun", category:"Biography", read_time_mins:14, language:"ar", origin:"🇹🇳 Tunisian-Arab" },
  { title:"Hayy ibn Yaqzan", author:"Ibn Tufayl", category:"Philosophy", read_time_mins:10, language:"ar", origin:"🇲🇦 Andalusian-Arab" },
  { title:"The Decisive Treatise", author:"Ibn Rushd (Averroes)", category:"Philosophy", read_time_mins:11, language:"ar", origin:"🇲🇦 Andalusian-Arab" },
  { title:"Deliverance from Error", author:"Al-Ghazali", category:"Philosophy", read_time_mins:12, language:"ar", origin:"🌍 Persian-Arab" },
  { title:"Arabian Sands", author:"Wilfred Thesiger", category:"Biography", read_time_mins:15, language:"en", origin:"🇸🇦 Arabian" },
  { title:"The Yacoubian Building", author:"Alaa Al Aswany", category:"Biography", read_time_mins:13, language:"ar", origin:"🇪🇬 Egyptian" },
  { title:"Cities of Salt", author:"Abdelrahman Munif", category:"Biography", read_time_mins:16, language:"ar", origin:"🇸🇦 Saudi-Arab" },

  // ── FRENCH LITERATURE & PHILOSOPHY (Littérature française) ────────
  { title:"Les Misérables", author:"Victor Hugo", category:"Biography", read_time_mins:20, language:"fr", origin:"🇫🇷 French" },
  { title:"The Stranger (L'Étranger)", author:"Albert Camus", category:"Philosophy", read_time_mins:8, language:"fr", origin:"🇫🇷 French" },
  { title:"Nausea (La Nausée)", author:"Jean-Paul Sartre", category:"Philosophy", read_time_mins:11, language:"fr", origin:"🇫🇷 French" },
  { title:"Madame Bovary", author:"Gustave Flaubert", category:"Biography", read_time_mins:14, language:"fr", origin:"🇫🇷 French" },
  { title:"The Little Prince (Le Petit Prince)", author:"Antoine de Saint-Exupéry", category:"Philosophy", read_time_mins:6, language:"fr", origin:"🇫🇷 French" },
  { title:"In Search of Lost Time (Vol. 1)", author:"Marcel Proust", category:"Biography", read_time_mins:18, language:"fr", origin:"🇫🇷 French" },
  { title:"The Art of Thinking Clearly", author:"Rolf Dobelli", category:"Psychology", read_time_mins:13, language:"fr", origin:"🇨🇭 Swiss" },
  { title:"Thinking and Destiny", author:"Harold Percival", category:"Philosophy", read_time_mins:15, language:"fr", origin:"🇫🇷 French" },
  { title:"The Second Sex", author:"Simone de Beauvoir", category:"Philosophy", read_time_mins:16, language:"fr", origin:"🇫🇷 French" },
  { title:"Discipline and Punish", author:"Michel Foucault", category:"Philosophy", read_time_mins:15, language:"fr", origin:"🇫🇷 French" },

  // ── SPANISH & LATIN AMERICAN (Español) ───────────────────────────
  { title:"One Hundred Years of Solitude", author:"Gabriel García Márquez", category:"Biography", read_time_mins:16, language:"es", origin:"🇨🇴 Colombian" },
  { title:"Love in the Time of Cholera", author:"Gabriel García Márquez", category:"Biography", read_time_mins:14, language:"es", origin:"🇨🇴 Colombian" },
  { title:"The House of the Spirits", author:"Isabel Allende", category:"Biography", read_time_mins:15, language:"es", origin:"🇨🇱 Chilean" },
  { title:"Like Water for Chocolate", author:"Laura Esquivel", category:"Self-Help", read_time_mins:11, language:"es", origin:"🇲🇽 Mexican" },
  { title:"Don Quixote", author:"Miguel de Cervantes", category:"Philosophy", read_time_mins:20, language:"es", origin:"🇪🇸 Spanish" },
  { title:"The Labyrinth of Solitude", author:"Octavio Paz", category:"Philosophy", read_time_mins:13, language:"es", origin:"🇲🇽 Mexican" },
  { title:"Ficciones", author:"Jorge Luis Borges", category:"Philosophy", read_time_mins:10, language:"es", origin:"🇦🇷 Argentine" },
  { title:"The Open Veins of Latin America", author:"Eduardo Galeano", category:"Biography", read_time_mins:15, language:"es", origin:"🇺🇾 Uruguayan" },
  { title:"Eva Perón", author:"Alicia Dujovne Ortiz", category:"Biography", read_time_mins:13, language:"es", origin:"🇦🇷 Argentine" },
  { title:"The General in His Labyrinth", author:"Gabriel García Márquez", category:"Biography", read_time_mins:12, language:"es", origin:"🇨🇴 Colombian" },

  // ── JAPANESE (日本語) ─────────────────────────────────────────────
  { title:"The Book of Five Rings", author:"Miyamoto Musashi", category:"Philosophy", read_time_mins:9, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"Bushido: The Soul of Japan", author:"Inazo Nitobe", category:"Philosophy", read_time_mins:10, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"Zen and the Art of Motorcycle Maintenance", author:"Robert M. Pirsig", category:"Philosophy", read_time_mins:15, language:"en", origin:"🇯🇵 Zen-inspired" },
  { title:"The Makioka Sisters", author:"Jun'ichiro Tanizaki", category:"Biography", read_time_mins:16, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"Norwegian Wood", author:"Haruki Murakami", category:"Psychology", read_time_mins:13, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"Kafka on the Shore", author:"Haruki Murakami", category:"Philosophy", read_time_mins:15, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"The Wind-Up Bird Chronicle", author:"Haruki Murakami", category:"Philosophy", read_time_mins:16, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"In Praise of Shadows", author:"Jun'ichiro Tanizaki", category:"Creativity", read_time_mins:7, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"The Pillow Book", author:"Sei Shonagon", category:"Biography", read_time_mins:12, language:"ja", origin:"🇯🇵 Japanese" },
  { title:"The Art of War", author:"Sun Tzu", category:"Business", read_time_mins:7, language:"zh", origin:"🇨🇳 Chinese (ancient)" },

  // ── CHINESE (中文) ────────────────────────────────────────────────
  { title:"Dream of the Red Chamber", author:"Cao Xueqin", category:"Biography", read_time_mins:20, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"The Analects", author:"Confucius", category:"Philosophy", read_time_mins:10, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"Tao Te Ching", author:"Laozi", category:"Philosophy", read_time_mins:6, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"Wild Swans", author:"Jung Chang", category:"Biography", read_time_mins:17, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"Wolf Totem", author:"Jiang Rong", category:"Science", read_time_mins:16, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"The Three-Body Problem", author:"Liu Cixin", category:"Science", read_time_mins:16, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"Brothers", author:"Yu Hua", category:"Biography", read_time_mins:16, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"To Live", author:"Yu Hua", category:"Biography", read_time_mins:11, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"Zhuangzi: The Complete Writings", author:"Zhuangzi", category:"Philosophy", read_time_mins:13, language:"zh", origin:"🇨🇳 Chinese" },
  { title:"The I Ching (Book of Changes)", author:"Traditional Chinese text", category:"Philosophy", read_time_mins:12, language:"zh", origin:"🇨🇳 Chinese" },

  // ── RUSSIAN (Русский) ─────────────────────────────────────────────
  { title:"Crime and Punishment", author:"Fyodor Dostoevsky", category:"Psychology", read_time_mins:18, language:"ru", origin:"🇷🇺 Russian" },
  { title:"The Brothers Karamazov", author:"Fyodor Dostoevsky", category:"Philosophy", read_time_mins:20, language:"ru", origin:"🇷🇺 Russian" },
  { title:"War and Peace", author:"Leo Tolstoy", category:"Biography", read_time_mins:20, language:"ru", origin:"🇷🇺 Russian" },
  { title:"Anna Karenina", author:"Leo Tolstoy", category:"Biography", read_time_mins:18, language:"ru", origin:"🇷🇺 Russian" },
  { title:"The Master and Margarita", author:"Mikhail Bulgakov", category:"Philosophy", read_time_mins:14, language:"ru", origin:"🇷🇺 Russian" },
  { title:"One Day in the Life of Ivan Denisovich", author:"Alexander Solzhenitsyn", category:"Biography", read_time_mins:9, language:"ru", origin:"🇷🇺 Russian" },
  { title:"The Gulag Archipelago (Abridged)", author:"Alexander Solzhenitsyn", category:"Biography", read_time_mins:18, language:"ru", origin:"🇷🇺 Russian" },
  { title:"Dead Souls", author:"Nikolai Gogol", category:"Biography", read_time_mins:14, language:"ru", origin:"🇷🇺 Russian" },
  { title:"Fathers and Sons", author:"Ivan Turgenev", category:"Philosophy", read_time_mins:12, language:"ru", origin:"🇷🇺 Russian" },
  { title:"The Idiot", author:"Fyodor Dostoevsky", category:"Psychology", read_time_mins:18, language:"ru", origin:"🇷🇺 Russian" },

  // ── GERMAN (Deutsch) ──────────────────────────────────────────────
  { title:"The Trial", author:"Franz Kafka", category:"Philosophy", read_time_mins:11, language:"de", origin:"🇨🇿 Czech-German" },
  { title:"The Metamorphosis", author:"Franz Kafka", category:"Psychology", read_time_mins:6, language:"de", origin:"🇨🇿 Czech-German" },
  { title:"Siddhartha", author:"Hermann Hesse", category:"Philosophy", read_time_mins:9, language:"de", origin:"🇩🇪 German" },
  { title:"Steppenwolf", author:"Hermann Hesse", category:"Psychology", read_time_mins:12, language:"de", origin:"🇩🇪 German" },
  { title:"The Tin Drum", author:"Günter Grass", category:"Biography", read_time_mins:17, language:"de", origin:"🇩🇪 German" },
  { title:"All Quiet on the Western Front", author:"Erich Maria Remarque", category:"Biography", read_time_mins:12, language:"de", origin:"🇩🇪 German" },
  { title:"Faust", author:"Johann Wolfgang von Goethe", category:"Philosophy", read_time_mins:15, language:"de", origin:"🇩🇪 German" },
  { title:"The Sorrows of Young Werther", author:"Johann Wolfgang von Goethe", category:"Psychology", read_time_mins:9, language:"de", origin:"🇩🇪 German" },
  { title:"Thus Spoke Zarathustra", author:"Friedrich Nietzsche", category:"Philosophy", read_time_mins:15, language:"de", origin:"🇩🇪 German" },
  { title:"Man and His Symbols", author:"Carl Jung", category:"Psychology", read_time_mins:14, language:"de", origin:"🇨🇭 Swiss-German" },

  // ── PERSIAN / IRANIAN (فارسی) ─────────────────────────────────────
  { title:"The Rubaiyat of Omar Khayyam", author:"Omar Khayyam", category:"Philosophy", read_time_mins:8, language:"fa", origin:"🇮🇷 Persian" },
  { title:"The Masnavi (Book I)", author:"Rumi", category:"Philosophy", read_time_mins:13, language:"fa", origin:"🇮🇷 Persian" },
  { title:"The Conference of the Birds", author:"Farid ud-Din Attar", category:"Philosophy", read_time_mins:12, language:"fa", origin:"🇮🇷 Persian" },
  { title:"Shahnameh: The Persian Book of Kings", author:"Ferdowsi", category:"Biography", read_time_mins:18, language:"fa", origin:"🇮🇷 Persian" },
  { title:"Savushun", author:"Simin Daneshvar", category:"Biography", read_time_mins:12, language:"fa", origin:"🇮🇷 Persian" },

  // ── INDIAN SUBCONTINENT ────────────────────────────────────────────
  { title:"The Discovery of India", author:"Jawaharlal Nehru", category:"Biography", read_time_mins:17, language:"en", origin:"🇮🇳 Indian" },
  { title:"Midnight's Children", author:"Salman Rushdie", category:"Biography", read_time_mins:16, language:"en", origin:"🇮🇳 Indian" },
  { title:"The God of Small Things", author:"Arundhati Roy", category:"Biography", read_time_mins:13, language:"en", origin:"🇮🇳 Indian" },
  { title:"Gitanjali", author:"Rabindranath Tagore", category:"Philosophy", read_time_mins:7, language:"bn", origin:"🇮🇳 Bengali" },
  { title:"The Guide", author:"R.K. Narayan", category:"Self-Help", read_time_mins:11, language:"en", origin:"🇮🇳 Indian" },

  // ── AFRICAN LITERATURE ────────────────────────────────────────────
  { title:"Things Fall Apart", author:"Chinua Achebe", category:"Biography", read_time_mins:11, language:"en", origin:"🇳🇬 Nigerian" },
  { title:"Half of a Yellow Sun", author:"Chimamanda Ngozi Adichie", category:"Biography", read_time_mins:14, language:"en", origin:"🇳🇬 Nigerian" },
  { title:"Purple Hibiscus", author:"Chimamanda Ngozi Adichie", category:"Biography", read_time_mins:12, language:"en", origin:"🇳🇬 Nigerian" },
  { title:"Season of Migration to the North", author:"Tayeb Salih", category:"Biography", read_time_mins:10, language:"ar", origin:"🇸🇩 Sudanese" },
  { title:"So Long a Letter", author:"Mariama Bâ", category:"Self-Help", read_time_mins:8, language:"fr", origin:"🇸🇳 Senegalese" },

  // ── TURKISH ────────────────────────────────────────────────────────
  { title:"My Name Is Red", author:"Orhan Pamuk", category:"Creativity", read_time_mins:15, language:"tr", origin:"🇹🇷 Turkish" },
  { title:"Snow", author:"Orhan Pamuk", category:"Philosophy", read_time_mins:14, language:"tr", origin:"🇹🇷 Turkish" },
  { title:"The Museum of Innocence", author:"Orhan Pamuk", category:"Psychology", read_time_mins:16, language:"tr", origin:"🇹🇷 Turkish" },

  // ── SCANDINAVIAN ──────────────────────────────────────────────────
  { title:"Sophie's World", author:"Jostein Gaarder", category:"Philosophy", read_time_mins:14, language:"no", origin:"🇳🇴 Norwegian" },
  { title:"The Snowball: Warren Buffett and the Business of Life", author:"Alice Schroeder", category:"Finance", read_time_mins:19, language:"en", origin:"🇸🇪 Swedish-American" },
  { title:"The Girl with the Dragon Tattoo", author:"Stieg Larsson", category:"Business", read_time_mins:16, language:"sv", origin:"🇸🇪 Swedish" },

  // ── ITALIAN ───────────────────────────────────────────────────────
  { title:"If This Is a Man (Survival in Auschwitz)", author:"Primo Levi", category:"Biography", read_time_mins:12, language:"it", origin:"🇮🇹 Italian" },
  { title:"The Name of the Rose", author:"Umberto Eco", category:"Philosophy", read_time_mins:17, language:"it", origin:"🇮🇹 Italian" },
  { title:"The Prince", author:"Niccolò Machiavelli", category:"Business", read_time_mins:10, language:"it", origin:"🇮🇹 Italian" },

  // ── PORTUGUESE / BRAZILIAN ────────────────────────────────────────
  { title:"The Alchemist", author:"Paulo Coelho", category:"Self-Help", read_time_mins:9, language:"pt", origin:"🇧🇷 Brazilian" },
  { title:"Eleven Minutes", author:"Paulo Coelho", category:"Self-Help", read_time_mins:11, language:"pt", origin:"🇧🇷 Brazilian" },
  { title:"Gabriela, Clove and Cinnamon", author:"Jorge Amado", category:"Biography", read_time_mins:14, language:"pt", origin:"🇧🇷 Brazilian" },

  // ── KOREAN ────────────────────────────────────────────────────────
  { title:"Please Look After Mom", author:"Kyung-Sook Shin", category:"Biography", read_time_mins:11, language:"ko", origin:"🇰🇷 Korean" },
  { title:"The Vegetarian", author:"Han Kang", category:"Psychology", read_time_mins:9, language:"ko", origin:"🇰🇷 Korean" },
  { title:"Human Acts", author:"Han Kang", category:"Biography", read_time_mins:10, language:"ko", origin:"🇰🇷 Korean" },

]

// ── Helpers ────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
      if (res.status === 429) { console.log('  Rate limited, waiting 30s…'); await sleep(30000); continue }
      const errText = await res.text()
      console.error(`  HTTP ${res.status}: ${errText.slice(0,200)}`)
    } catch(e) {
      console.error(`  Network error (attempt ${i+1}):`, e.message)
      if (i < retries - 1) await sleep(5000)
    }
  }
  throw new Error(`Failed after ${retries} retries`)
}

async function getExistingTitles() {
  const res = await fetchWithRetry(
    `${SUPABASE_URL}/rest/v1/books?select=title`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  )
  const data = await res.json()
  return new Set(data.map(b => b.title.toLowerCase().trim()))
}

async function insertBook(book) {
  const coverUrl = `https://covers.openlibrary.org/b/title/${encodeURIComponent(book.title)}-L.jpg` 
  const res = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/books`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      title: book.title,
      author: book.author,
      category: book.category,
      read_time_mins: book.read_time_mins,
      cover_url: coverUrl,
      language: book.language || 'en',
      source_type: 'classic',
    })
  })
  const [inserted] = await res.json()
  return inserted
}

async function insertSummary(bookId, short_summary, long_summary, key_insights) {
  await fetchWithRetry(`${SUPABASE_URL}/rest/v1/summaries`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ book_id: bookId, short_summary, long_summary, key_insights })
  })
}

async function generateSummary(title, author, origin) {
  const prompt = `You are a world-class literary expert. For the book "${title}" by ${author} (origin: ${origin}), provide a summary in ENGLISH that captures both the universal themes and the cultural context of this work.

Respond ONLY in this exact JSON format:
{
  "short_summary": "2-3 sentences capturing the core idea and cultural significance",
  "long_summary": "4-6 sentences covering themes, cultural context, why this book matters globally, and its lasting impact",
  "key_insights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5", "insight 6", "insight 7"]
}`

  const res = await fetchWithRetry(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  House of Books — Multilingual 100 Books Script      ║')
  console.log('║  Arabic · French · Spanish · Japanese · Chinese      ║')
  console.log('║  Russian · German · Persian · Korean · Turkish +more  ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  console.log('📋 Checking existing books in database…')
  const existing = await getExistingTitles()
  console.log(`   Found ${existing.size} existing books\n`)

  const toAdd = NEW_BOOKS.filter(b => !existing.has(b.title.toLowerCase().trim()))
  console.log(`📚 Books to add: ${toAdd.length} (${NEW_BOOKS.length - toAdd.length} already exist)\n`)

  if (toAdd.length === 0) { console.log('✅ All books already in database!'); return }

  // Group by origin for display
  const origins = [...new Set(toAdd.map(b => b.origin))]
  console.log(`🌍 Origins represented: ${origins.join(' · ')}\n`)

  let added = 0, failed = 0
  const startTime = Date.now()

  for (let i = 0; i < toAdd.length; i++) {
    const book = toAdd[i]
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const eta = i > 0 ? Math.round((elapsed / i) * (toAdd.length - i)) : '?'
    console.log(`[${i+1}/${toAdd.length}] ${book.origin} "${book.title}" by ${book.author} — ETA: ${eta}s`)

    try {
      process.stdout.write('  → Inserting book… ')
      const inserted = await insertBook(book)
      console.log(`✓ (id: ${inserted.id})`)

      process.stdout.write('  → Generating AI summary (English)… ')
      const summary = await generateSummary(book.title, book.author, book.origin)
      console.log('✓')

      process.stdout.write('  → Saving summary… ')
      await insertSummary(inserted.id, summary.short_summary, summary.long_summary, summary.key_insights)
      console.log('✓')

      added++
      console.log(`  ✅ Done! (${added} added)\n`)

      if (i < toAdd.length - 1) await sleep(3500)

    } catch(err) {
      console.error(`  ❌ Failed: ${err.message}\n`)
      failed++
      await sleep(6000)
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000)
  const mins = Math.floor(totalTime / 60)
  const secs = totalTime % 60

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log(`║  ✅ Done! Added: ${added} | Failed: ${failed} | Time: ${mins}m ${secs}s`)
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log('\n🎉 Your library now includes books from 15+ countries and cultures!')
  console.log('📝 Next: Update FREE_BOOKS = 90 in src/App.tsx, then run: vercel --prod')
}

main().catch(console.error)
