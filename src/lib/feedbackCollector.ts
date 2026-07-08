import { supabase } from './supabase'

// Generate anonymous session ID — stored in localStorage, never linked to email
export const getAnonymousSessionId = (): string => {
  const key = 'anon_session_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

// Extract keywords from message without storing the message itself
const extractKeywords = (message: string): string[] => {
  const stopWords = new Set(['the','a','an','is','it','in','on','at','to','for','of','and','or','but','i','my','me','you','what','how','why','can','do','does'])
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 5) // max 5 keywords, never full sentences
}

// Detect sentiment from message
const detectSentiment = (message: string): 'positive' | 'neutral' | 'negative' => {
  const positive = ['love','great','amazing','excellent','helpful','good','best','awesome','perfect','thanks']
  const negative = ['bad','wrong','useless','terrible','broken','error','fail','hate','worst','boring']
  const lower = message.toLowerCase()
  if (positive.some(w => lower.includes(w))) return 'positive'
  if (negative.some(w => lower.includes(w))) return 'negative'
  return 'neutral'
}

// Detect if message contains a feature request
const detectFeatureRequest = (message: string): string | null => {
  const patterns = [
    { pattern: /add|want|wish|need|should|could|would be nice/i, label: 'feature_request' },
    { pattern: /more books|more titles/i, label: 'more_books' },
    { pattern: /audio|listen/i, label: 'audio_feature' },
    { pattern: /download|pdf|export/i, label: 'pdf_export' },
    { pattern: /recommend|suggestion/i, label: 'recommendations' },
    { pattern: /language|translate/i, label: 'language_support' },
    { pattern: /mobile|app|phone/i, label: 'mobile_app' },
    { pattern: /price|cost|cheap|expensive|free/i, label: 'pricing_feedback' },
  ]
  for (const { pattern, label } of patterns) {
    if (pattern.test(message)) return label
  }
  return null
}

// Main collector — called silently after every AI message
export const collectChatFeedback = async ({
  message,
  bookCategory,
  messageCount,
}: {
  message: string
  bookCategory?: string
  messageCount: number
}) => {
  try {
    const sessionId = getAnonymousSessionId()
    const keywords = extractKeywords(message)
    const sentiment = detectSentiment(message)
    const featureRequest = detectFeatureRequest(message)

    await supabase.from('ai_feedback').insert({
      session_id: sessionId,
      feedback_type: 'chat',
      book_category: bookCategory || 'unknown',
      topic_keywords: keywords,
      sentiment,
      feature_request: featureRequest,
      message_count: messageCount,
    })

    // Update insights aggregation
    if (featureRequest) {
      const { data } = await supabase
        .from('feedback_insights')
        .select('*')
        .eq('insight_type', 'feature_request')
        .eq('insight_value', featureRequest)
        .single()

      if (data) {
        await supabase
          .from('feedback_insights')
          .update({ count: data.count + 1, last_seen: new Date().toISOString() })
          .eq('id', data.id)
      } else {
        await supabase.from('feedback_insights').insert({
          insight_type: 'feature_request',
          insight_value: featureRequest,
          count: 1,
        })
      }
    }
  } catch (e) {
    // Silent fail — never interrupt user experience
    console.log('Feedback collection error (silent):', e)
  }
}

// Collect explicit rating from user
export const collectRating = async (rating: number, comment?: string) => {
  try {
    const sessionId = getAnonymousSessionId()
    await supabase.from('ai_feedback').insert({
      session_id: sessionId,
      feedback_type: 'rating',
      rating,
      sentiment: rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative',
      feature_request: comment ? detectFeatureRequest(comment) : null,
      topic_keywords: comment ? extractKeywords(comment) : [],
      message_count: 0,
    })
  } catch (e) {
    console.log('Rating collection error (silent):', e)
  }
}

// Get aggregated insights for AI agents — NEVER returns personal data
export const getAggregatedInsights = async (): Promise<string> => {
  try {
    // Get top feature requests
    const { data: features } = await supabase
      .from('feedback_insights')
      .select('insight_value, count')
      .eq('insight_type', 'feature_request')
      .order('count', { ascending: false })
      .limit(10)

    // Get sentiment breakdown
    const { data: sentiments } = await supabase
      .from('ai_feedback')
      .select('sentiment')
      .limit(100)

    // Get top categories
    const { data: categories } = await supabase
      .from('ai_feedback')
      .select('book_category')
      .limit(100)

    // Aggregate — no personal data, only patterns
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
    sentiments?.forEach(s => {
      if (s.sentiment) sentimentCounts[s.sentiment as keyof typeof sentimentCounts]++
    })

    const categoryCounts: Record<string, number> = {}
    categories?.forEach(c => {
      if (c.book_category) {
        categoryCounts[c.book_category] = (categoryCounts[c.book_category] || 0) + 1
      }
    })
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => `${cat} (${count} sessions)`)

    return `
USER BEHAVIOR INSIGHTS (anonymized, no personal data):
- Top feature requests: ${features?.map(f => `${f.insight_value} (${f.count} requests)`).join(', ') || 'none yet'}
- Sentiment breakdown: ${sentimentCounts.positive} positive, ${sentimentCounts.neutral} neutral, ${sentimentCounts.negative} negative
- Most popular categories: ${topCategories.join(', ') || 'none yet'}
- Total feedback sessions: ${sentiments?.length || 0}
    `.trim()
  } catch (e) {
    return ''
  }
}
