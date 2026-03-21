import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0MDcwMTIsImV4cCI6MjA0NTk4MzAxMn0.fB_mPpAIhFMavM8bO0_xGfpOmYBFDYIy_mGNBKOxNMc',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);
