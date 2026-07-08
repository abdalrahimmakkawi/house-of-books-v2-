-- Create a policy that allows service role to update books table
-- This bypasses RLS for the summary generation script

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow service role updates";

-- Create policy to allow service role to do anything with books table
CREATE POLICY "Allow service role updates" ON books
FOR ALL USING (
  -- Check if this is the service role key
  auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON books TO authenticated;
GRANT ALL ON books TO service_role;
