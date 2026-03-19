// add-100-books.js — Script to add 100 books with AI summaries
// Usage: node add-100-books.js

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://hobqzvzqzjzqzqzqzq.supabase.co'
const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY' // Replace with your service role key

const supabase = createClient(supabaseUrl, supabaseKey)

// Book data - 100 classic books with categories
const booksToAdd = [
  // Philosophy & Ethics
  { title: "The Republic", author: "Plato", category: "Philosophy", read_time_mins: 180 },
  { title: "Nicomachean Ethics", author: "Aristotle", category: "Philosophy", read_time_mins: 200 },
  { title: "Meditations", author: "Marcus Aurelius", category: "Philosophy", read_time_mins: 120 },
  { title: "The Prince", author: "Niccolò Machiavelli", category: "Philosophy", read_time_mins: 90 },
  { title: "Leviathan", author: "Thomas Hobbes", category: "Philosophy", read_time_mins: 240 },
  { title: "Discourse on Method", author: "René Descartes", category: "Philosophy", read_time_mins: 80 },
  { title: "Ethics", author: "Baruch Spinoza", category: "Philosophy", read_time_mins: 220 },
  { title: "Critique of Pure Reason", author: "Immanuel Kant", category: "Philosophy", read_time_mins: 320 },
  { title: "Phenomenology of Spirit", author: "Georg Wilhelm Friedrich Hegel", category: "Philosophy", read_time_mins: 280 },
  { title: "Beyond Good and Evil", author: "Friedrich Nietzsche", category: "Philosophy", read_time_mins: 150 },
  
  // Literature & Fiction
  { title: "Don Quixote", author: "Miguel de Cervantes", category: "Literature", read_time_mins: 360 },
  { title: "Pride and Prejudice", author: "Jane Austen", category: "Literature", read_time_mins: 240 },
  { title: "Moby Dick", author: "Herman Melville", category: "Literature", read_time_mins: 300 },
  { title: "War and Peace", author: "Leo Tolstoy", category: "Literature", read_time_mins: 420 },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", category: "Literature", read_time_mins: 280 },
  { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky", category: "Literature", read_time_mins: 380 },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Literature", read_time_mins: 120 },
  { title: "To Kill a Mockingbird", author: "Harper Lee", category: "Literature", read_time_mins: 180 },
  { title: "1984", author: "George Orwell", category: "Literature", read_time_mins: 200 },
  { title: "Brave New World", author: "Aldous Huxley", category: "Literature", read_time_mins: 180 },
  
  // Science & Mathematics
  { title: "On the Origin of Species", author: "Charles Darwin", category: "Science", read_time_mins: 220 },
  { title: "The Principia", author: "Isaac Newton", category: "Science", read_time_mins: 300 },
  { title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", read_time_mins: 150 },
  { title: "The Selfish Gene", author: "Richard Dawkins", category: "Science", read_time_mins: 200 },
  { title: "Cosmos", author: "Carl Sagan", category: "Science", read_time_mins: 180 },
  { title: "The Double Helix", author: "James Watson", category: "Science", read_time_mins: 140 },
  { title: "Silent Spring", author: "Rachel Carson", category: "Science", read_time_mins: 160 },
  { title: "The Structure of Scientific Revolutions", author: "Thomas Kuhn", category: "Science", read_time_mins: 200 },
  { title: "Gödel, Escher, Bach", author: "Douglas Hofstadter", category: "Science", read_time_mins: 400 },
  { title: "The Elegant Universe", author: "Brian Greene", category: "Science", read_time_mins: 220 },
  
  // Economics & Politics
  { title: "The Wealth of Nations", author: "Adam Smith", category: "Economics", read_time_mins: 280 },
  { title: "Das Kapital", author: "Karl Marx", category: "Economics", read_time_mins: 400 },
  { title: "The General Theory of Employment, Interest and Money", author: "John Maynard Keynes", category: "Economics", read_time_mins: 240 },
  { title: "Capitalism and Freedom", author: "Milton Friedman", category: "Economics", read_time_mins: 160 },
  { title: "The Road to Serfdom", author: "Friedrich Hayek", category: "Economics", read_time_mins: 180 },
  { title: "The Communist Manifesto", author: "Karl Marx", category: "Politics", read_time_mins: 60 },
  { title: "Democracy in America", author: "Alexis de Tocqueville", category: "Politics", read_time_mins: 320 },
  { title: "The Social Contract", author: "Jean-Jacques Rousseau", category: "Politics", read_time_mins: 140 },
  { title: "Two Treatises of Government", author: "John Locke", category: "Politics", read_time_mins: 200 },
  { title: "The Federalist Papers", author: "Alexander Hamilton", category: "Politics", read_time_mins: 240 },
  
  // Psychology & Self-Help
  { title: "Man's Search for Meaning", author: "Viktor Frankl", category: "Psychology", read_time_mins: 120 },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Psychology", read_time_mins: 200 },
  { title: "The Interpretation of Dreams", author: "Sigmund Freud", category: "Psychology", read_time_mins: 300 },
  { title: "Psychology and Religion", author: "Carl Jung", category: "Psychology", read_time_mins: 180 },
  { title: "Flow", author: "Mihaly Csikszentmihalyi", category: "Psychology", read_time_mins: 160 },
  { title: "Emotional Intelligence", author: "Daniel Goleman", category: "Psychology", read_time_mins: 180 },
  { title: "Mindset", author: "Carol Dweck", category: "Psychology", read_time_mins: 140 },
  { title: "The Power of Habit", author: "Charles Duhigg", category: "Psychology", read_time_mins: 160 },
  { title: "Atomic Habits", author: "James Clear", category: "Psychology", read_time_mins: 180 },
  { title: "The 7 Habits of Highly Effective People", author: "Stephen Covey", category: "Psychology", read_time_mins: 200 },
  
  // History
  { title: "The Histories", author: "Herodotus", category: "History", read_time_mins: 280 },
  { title: "The Peloponnesian War", author: "Thucydides", category: "History", read_time_mins: 240 },
  { title: "The Rise and Fall of the Roman Empire", author: "Edward Gibbon", category: "History", read_time_mins: 400 },
  { title: "A People's History of the United States", author: "Howard Zinn", category: "History", read_time_mins: 320 },
  { title: "Guns, Germs, and Steel", author: "Jared Diamond", category: "History", read_time_mins: 260 },
  { title: "The History of the Peloponnesian War", author: "Thucydides", category: "History", read_time_mins: 240 },
  { title: "The Decline and Fall of the Roman Empire", author: "Edward Gibbon", category: "History", read_time_mins: 400 },
  { title: "The History of the Peloponnesian War", author: "Thucydides", category: "History", read_time_mins: 240 },
  { title: "The History of the Peloponnesian War", author: "Thucydides", category: "History", read_time_mins: 240 },
  { title: "The History of the Peloponnesian War", author: "Thucydides", category: "History", read_time_mins: 240 },
  
  // Business & Management
  { title: "The Lean Startup", author: "Eric Ries", category: "Business", read_time_mins: 160 },
  { title: "Good to Great", author: "Jim Collins", category: "Business", read_time_mins: 180 },
  { title: "The Innovator's Dilemma", author: "Clayton Christensen", category: "Business", read_time_mins: 200 },
  { title: "Zero to One", author: "Peter Thiel", category: "Business", read_time_mins: 140 },
  { title: "The Hard Thing About Hard Things", author: "Ben Horowitz", category: "Business", read_time_mins: 180 },
  { title: "The 4-Hour Workweek", author: "Tim Ferriss", category: "Business", read_time_mins: 160 },
  { title: "The E-Myth Revisited", author: "Michael Gerber", category: "Business", read_time_mins: 180 },
  { title: "The $100 Startup", author: "Chris Guillebeau", category: "Business", read_time_mins: 140 },
  { title: "Crushing It!", author: "Gary Vaynerchuk", category: "Business", read_time_mins: 120 },
  { title: "The 7 Habits of Highly Effective People", author: "Stephen Covey", category: "Business", read_time_mins: 200 },
  
  // Religion & Spirituality
  { title: "The Bible", author: "Various", category: "Religion", read_time_mins: 480 },
  { title: "The Quran", author: "Various", category: "Religion", read_time_mins: 320 },
  { title: "The Bhagavad Gita", author: "Various", category: "Religion", read_time_mins: 120 },
  { title: "The Tao Te Ching", author: "Lao Tzu", category: "Religion", read_time_mins: 80 },
  { title: "The Dhammapada", author: "Various", category: "Religion", read_time_mins: 100 },
  { title: "The Book of Mormon", author: "Joseph Smith", category: "Religion", read_time_mins: 260 },
  { title: "The Upanishads", author: "Various", category: "Religion", read_time_mins: 140 },
  { title: "The Tibetan Book of the Dead", author: "Various", category: "Religion", read_time_mins: 120 },
  { title: "The I Ching", author: "Various", category: "Religion", read_time_mins: 100 },
  { title: "The Epic of Gilgamesh", author: "Various", category: "Religion", read_time_mins: 120 },
  
  // Art & Culture
  { title: "The Story of Art", author: "E.H. Gombrich", category: "Art", read_time_mins: 280 },
  { title: "Ways of Seeing", author: "John Berger", category: "Art", read_time_mins: 120 },
  { title: "The Art of War", author: "Sun Tzu", category: "Art", read_time_mins: 80 },
  { title: "The Poetics", author: "Aristotle", category: "Art", read_time_mins: 100 },
  { title: "The Birth of Tragedy", author: "Friedrich Nietzsche", category: "Art", read_time_mins: 140 },
  { title: "The Art of Happiness", author: "Dalai Lama", category: "Art", read_time_mins: 160 },
  { title: "The Way of the Artist", author: "Various", category: "Art", read_time_mins: 120 },
  { title: "The Creative Habit", author: "Twyla Tharp", category: "Art", read_time_mins: 140 },
  { title: "The War of Art", author: "Steven Pressfield", category: "Art", read_time_mins: 100 },
  { title: "The Artist's Way", author: "Julia Cameron", category: "Art", read_time_mins: 200 },
  
  // Technology & Innovation
  { title: "The Singularity Is Near", author: "Ray Kurzweil", category: "Technology", read_time_mins: 200 },
  { title: "The Second Machine Age", author: "Erik Brynjolfsson", category: "Technology", read_time_mins: 180 },
  { title: "The Innovators", author: "Walter Isaacson", category: "Technology", read_time_mins: 240 },
  { title: "The Code Book", author: "Simon Singh", category: "Technology", read_time_mins: 200 },
  { title: "The Information", author: "James Gleick", category: "Technology", read_time_mins: 220 },
  { title: "The Hacker Ethic", author: "Pekka Himanen", category: "Technology", read_time_mins: 140 },
  { title: "The Cathedral and the Bazaar", author: "Eric Raymond", category: "Technology", read_time_mins: 120 },
  { title: "The Innovator's Dilemma", author: "Clayton Christensen", category: "Technology", read_time_mins: 200 },
  { title: "The Rise of the Network Society", author: "Manuel Castells", category: "Technology", read_time_mins: 180 },
  { title: "The Age of Surveillance Capitalism", author: "Shoshana Zuboff", category: "Technology", read_time_mins: 260 }
]

// Function to generate AI summary for a book
async function generateSummary(book) {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a literary expert. Generate a concise summary and 5 key insights for the given book. Respond in JSON format: {"short_summary": "...", "key_insights": ["...", "...", "...", "...", "..."]}'
          },
          {
            role: 'user',
            content: `Generate a summary and insights for "${book.title}" by ${book.author} in the ${book.category} category.`
          }
        ],
        max_tokens: 800
      })
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    if (content) {
      try {
        const parsed = JSON.parse(content)
        return parsed
      } catch (e) {
        console.error('Failed to parse AI response for', book.title)
        return {
          short_summary: "A classic work in the field of " + book.category.toLowerCase() + ".",
          key_insights: [
            "Timeless wisdom that remains relevant today",
            "Influential ideas that shaped the field",
            "Practical insights for modern readers",
            "Deep exploration of fundamental principles",
            "Enduring impact on human thought"
          ]
        }
      }
    }
  } catch (error) {
    console.error('Error generating summary for', book.title, error)
    return {
      short_summary: "A classic work in the field of " + book.category.toLowerCase() + ".",
      key_insights: [
        "Timeless wisdom that remains relevant today",
        "Influential ideas that shaped the field",
        "Practical insights for modern readers",
        "Deep exploration of fundamental principles",
        "Enduring impact on human thought"
      ]
    }
  }
}

// Main function to add books
async function addBooks() {
  console.log(`Starting to add ${booksToAdd.length} books...`)
  
  for (let i = 0; i < booksToAdd.length; i++) {
    const book = booksToAdd[i]
    
    try {
      console.log(`Processing ${i + 1}/${booksToAdd.length}: ${book.title}`)
      
      // Generate AI summary
      const summary = await generateSummary(book)
      
      // Add cover URL using picsum
      const coverUrl = `https://picsum.photos/seed/${book.title.replace(/\s+/g, '-').toLowerCase()}/300/450`
      
      // Insert into database
      const { data, error } = await supabase
        .from('books')
        .insert({
          title: book.title,
          author: book.author,
          category: book.category,
          cover_url: coverUrl,
          read_time_mins: book.read_time_mins,
          summaries: [summary],
          created_at: new Date().toISOString()
        })
        .select()
      
      if (error) {
        console.error(`Error inserting ${book.title}:`, error)
      } else {
        console.log(`✓ Added: ${book.title}`)
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`Error processing ${book.title}:`, error)
    }
  }
  
  console.log('Finished adding books!')
}

// Run the script
addBooks().catch(console.error)
