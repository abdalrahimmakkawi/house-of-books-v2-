export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    'https://ulxzyjqmvzyqjynmqywe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5NzI3NiwiZXhwIjoyMDg3ODczMjc2fQ.LlF5YqF9HAfmnYJiOrgthA1vsF_sx3f9gAIs4ckZdyM'
  )

  const event = req.body
  const eventName = event?.meta?.event_name
  const email = event?.data?.attributes?.user_email

  if (!email) return res.status(400).json({ error: 'No email' })

  if (eventName === 'order_created' || eventName === 'subscription_created') {
    await supabase.from('premium_users').upsert({ email, active: true, created_at: new Date().toISOString() })
  }

  if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    await supabase.from('premium_users').update({ active: false }).eq('email', email)
  }

  res.status(200).json({ received: true })
}
