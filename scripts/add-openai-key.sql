-- Add OpenAI API key column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS openai_key TEXT;

-- Create or update policy to allow users to update their own OpenAI key
DROP POLICY IF EXISTS "Users can update their own OpenAI key" ON profiles;
CREATE POLICY "Users can update their own OpenAI key"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT UPDATE (openai_key) ON profiles TO authenticated; 