-- Drop existing policies
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON messages;
DROP POLICY IF EXISTS "Messages can be inserted by everyone" ON messages;

-- Create new policies with JSONB support
CREATE POLICY "Messages are viewable by everyone"
    ON messages FOR SELECT
    USING (true);

CREATE POLICY "Messages can be inserted by everyone"
    ON messages FOR INSERT
    WITH CHECK (true);

-- Add attachments column to messages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'attachments'
    ) THEN
        ALTER TABLE messages ADD COLUMN attachments JSONB;
    END IF;
END $$; 