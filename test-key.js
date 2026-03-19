const { createClient } = require('@supabase/supabase-js')

// Try different keys to find the right one
const keys = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1yb2xlIiwicm9sZSI6ImhvdXNlLW9mLWJvb2tzLXYyLWRlbW9nLWFwcCIsImF1dCI6MTc0NjI5MjI5LCJleHAiOjE3NTAzNjM3OTl9.IkqU2L7YqK8Q8wL5x3r7Nq8t5Y4B2x9m8Xk3bF7Q',
  'sb_secret_-UpiCr7pkiD2yUHRusfBqw_VHrtEDJ',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI'
]

async function testKey(key, index) {
  console.log(`\nTesting key ${index + 1}...`)
  try {
    const supabase = createClient(
      'https://ulxzyjqmvzyqjynmqywe.supabase.co',
      key
    )
    
    const { data, error } = await supabase
      .from('books')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log(`❌ Key ${index + 1} failed:`, error.message)
    } else {
      console.log(`✅ Key ${index + 1} works! Found ${data[0]?.count || 0} books`)
      return key
    }
  } catch (e) {
    console.log(`❌ Key ${index + 1} error:`, e.message)
  }
  return null
}

async function findWorkingKey() {
  for (let i = 0; i < keys.length; i++) {
    const workingKey = await testKey(keys[i], i)
    if (workingKey) {
      console.log(`\n🎉 Working key found: Key ${i + 1}`)
      console.log(`Use this key in your script:`)
      console.log(workingKey)
      return workingKey
    }
  }
  console.log('\n❌ No working keys found')
}

findWorkingKey()
