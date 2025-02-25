-- Modify the agents table to use a separate column for the custom agent_id
ALTER TABLE agents
ADD COLUMN custom_id VARCHAR(255) NOT NULL UNIQUE;

-- Update existing rows if necessary (you may need to adjust this based on your current data)
UPDATE agents
SET custom_id = agent_id::text
WHERE custom_id IS NULL;

-- Add a unique constraint on custom_id
ALTER TABLE agents
ADD CONSTRAINT agents_custom_id_key UNIQUE (custom_id);

