-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);

-- Enable RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Attachments are viewable by everyone" ON attachments;
CREATE POLICY "Attachments are viewable by everyone"
    ON attachments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Attachments can be inserted by everyone" ON attachments;
CREATE POLICY "Attachments can be inserted by everyone"
    ON attachments FOR INSERT
    WITH CHECK (true);

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_attachments_updated_at ON attachments;
DROP FUNCTION IF EXISTS update_attachments_updated_at();

-- Create function to update updated_at
CREATE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_attachments_updated_at(); 