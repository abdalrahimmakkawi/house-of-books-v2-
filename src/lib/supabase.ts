import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface Book {
  id: string
  title: string
  author: string
  category: string
  cover_url: string
  summary: string
  key_insights: string
  read_time_mins: number
  language: string
  source_type: string
  created_at: string
}
