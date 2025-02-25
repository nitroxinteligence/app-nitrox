-- Temporary allow NULL values in custom_id
ALTER TABLE agents
ALTER COLUMN custom_id DROP NOT NULL;

-- Update existing rows with a default value if custom_id is NULL
UPDATE agents
SET custom_id = 'agent_' || id::text
WHERE custom_id IS NULL;

-- Add NOT NULL constraint back
ALTER TABLE agents
ALTER COLUMN custom_id SET NOT NULL;

-- Add a unique constraint on custom_id if not already present
ALTER TABLE agents
ADD CONSTRAINT agents_custom_id_key UNIQUE (custom_id);

