-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    is_positive BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_feedback_message_id ON feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Add RLS policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (including anonymous)
DROP POLICY IF EXISTS "Allow read access for all users" ON feedback;
CREATE POLICY "Allow read access for all users"
    ON feedback FOR SELECT
    USING (true);

-- Allow insert access to all users (including anonymous)
DROP POLICY IF EXISTS "Allow insert access for all users" ON feedback;
CREATE POLICY "Allow insert access for all users"
    ON feedback FOR INSERT
    WITH CHECK (true);

-- Allow update access to all users (including anonymous)
DROP POLICY IF EXISTS "Allow update access for all users" ON feedback;
CREATE POLICY "Allow update access for all users"
    ON feedback FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 