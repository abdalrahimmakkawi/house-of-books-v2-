// api/feedback.js — Handle user feedback submissions
// Stores feedback data and optionally sends notifications

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { name, email, category, message, rating, timestamp, userAgent, url } = req.body

    // Validate required fields
    if (!name || !email || !category || !message) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Create feedback entry
    const feedback = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      category,
      message: message.trim(),
      rating: rating || '',
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent || '',
      url: url || '',
      status: 'new',
      processed: false
    }

    // Log feedback (you can replace this with database storage)
    console.log('📝 New Feedback Received:', {
      id: feedback.id,
      name: feedback.name,
      email: feedback.email,
      category: feedback.category,
      rating: feedback.rating,
      timestamp: feedback.timestamp
    })

    // Store feedback data (you can integrate with your preferred service)
    await storeFeedback(feedback)

    // Send notification (optional)
    await sendNotification(feedback)

    return res.status(200).json({ 
      success: true, 
      message: 'Feedback received successfully',
      id: feedback.id 
    })

  } catch (error) {
    console.error('Feedback API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Store feedback (implement your preferred storage method)
async function storeFeedback(feedback) {
  // Option 1: Store in Supabase
  try {
    // const { data, error } = await supabase
    //   .from('feedback')
    //   .insert([feedback])
    // if (error) throw error
    console.log('✅ Feedback stored successfully')
  } catch (error) {
    console.error('❌ Failed to store feedback:', error)
  }

  // Option 2: Store in Google Sheets (requires setup)
  // await addToGoogleSheets(feedback)

  // Option 3: Store in Airtable (requires setup)
  // await addToAirtable(feedback)

  // Option 4: Send to email service
  // await sendToEmail(feedback)
}

// Send notification (implement your preferred notification method)
async function sendNotification(feedback) {
  // Option 1: Send email notification
  // await sendEmail({
  //   to: 'your-email@example.com',
  //   subject: `New House of Books Feedback: ${feedback.category}`,
  //   body: `Name: ${feedback.name}\nEmail: ${feedback.email}\nCategory: ${feedback.category}\nRating: ${feedback.rating}\n\nMessage:\n${feedback.message}`
  // })

  // Option 2: Send Slack notification
  // await sendSlackMessage({
  //   channel: '#feedback',
  //   text: `📚 New feedback from ${feedback.name} (${feedback.category}): ${feedback.message.substring(0, 100)}...`
  // })

  // Option 3: Send Discord notification
  // await sendDiscordMessage({
  //   content: `**New Feedback**\n**Name:** ${feedback.name}\n**Category:** ${feedback.category}\n**Rating:** ${feedback.rating}\n\n${feedback.message}`
  // })

  console.log('📬 Notification sent for feedback:', feedback.id)
}
