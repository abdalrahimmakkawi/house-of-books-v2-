import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://ulxzyjqmvzyqjynmqywe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI'
      }
    }
  }
);
