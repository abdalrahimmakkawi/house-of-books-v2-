import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ulxzyjqmvzyqjynmqywe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI'

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Book {
  id: string
  title: string
  author: string
  cover_url: string
  category: string
  summaries?: {
    short_summary: string
    long_summary: string
    key_insights: string[]
  }
}
