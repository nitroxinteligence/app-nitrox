-- Create a new openai_usage table with all required columns
-- This addresses the error: column "workflow_id" does not exist

DO $migration$
DECLARE
  table_exists BOOLEAN;
  old_table_exists BOOLEAN;
BEGIN
  -- Check if openai_usage table already exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'openai_usage'
  ) INTO table_exists;
  
  -- If table exists, we'll create a backup before recreating it
  IF table_exists THEN
    -- Check if backup table already exists
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'openai_usage_backup'
    ) INTO old_table_exists;
    
    -- Create backup table if it doesn't exist yet
    IF NOT old_table_exists THEN
      EXECUTE 'CREATE TABLE public.openai_usage_backup AS SELECT * FROM public.openai_usage';
      RAISE NOTICE 'Created backup of existing openai_usage table as openai_usage_backup';
    ELSE
      RAISE NOTICE 'Backup table openai_usage_backup already exists, skipping backup creation';
    END IF;
    
    -- Drop existing table
    EXECUTE 'DROP TABLE public.openai_usage CASCADE';
    RAISE NOTICE 'Dropped existing openai_usage table';
  END IF;
  
  -- Create new table with all required columns
  EXECUTE '
  CREATE TABLE public.openai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    workflow_id TEXT,
    workflow_name TEXT,
    model TEXT,
    "Model" TEXT,
    endpoint TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0,
    user_id TEXT,
    request_id TEXT,
    tags JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )';
  
  RAISE NOTICE 'Created new openai_usage table with all required columns';
  
  -- Create trigger to keep model columns in sync
  EXECUTE '
  CREATE OR REPLACE FUNCTION sync_model_columns()
  RETURNS TRIGGER AS $TRIG$
  BEGIN
    IF NEW.model IS DISTINCT FROM NEW."Model" THEN
      IF NEW.model IS NOT NULL THEN
        NEW."Model" := NEW.model;
      ELSIF NEW."Model" IS NOT NULL THEN
        NEW.model := NEW."Model";
      END IF;
    END IF;
    RETURN NEW;
  END;
  $TRIG$ LANGUAGE plpgsql;
  
  CREATE TRIGGER sync_model_columns
  BEFORE INSERT OR UPDATE ON public.openai_usage
  FOR EACH ROW EXECUTE FUNCTION sync_model_columns();
  ';
  
  RAISE NOTICE 'Created trigger to keep model columns in sync';
  
  -- Try to restore data from backup if it exists
  IF old_table_exists THEN
    BEGIN
      EXECUTE '
      INSERT INTO public.openai_usage (
        "timestamp", 
        model, 
        "Model", 
        endpoint, 
        prompt_tokens, 
        completion_tokens, 
        total_tokens, 
        estimated_cost, 
        user_id, 
        request_id, 
        tags, 
        metadata
      )
      SELECT 
        "timestamp", 
        model, 
        "Model", 
        endpoint, 
        prompt_tokens, 
        completion_tokens, 
        total_tokens, 
        estimated_cost, 
        user_id, 
        request_id, 
        tags, 
        metadata
      FROM public.openai_usage_backup
      ON CONFLICT DO NOTHING
      ';
      RAISE NOTICE 'Restored data from backup table';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not restore data from backup: %', SQLERRM;
    END;
  END IF;
  
  -- Create indexes for faster queries with more distinct names
  BEGIN
    EXECUTE 'CREATE INDEX idx_openai_usage_timestamp ON public.openai_usage("timestamp")';
    RAISE NOTICE 'Created timestamp index';
  EXCEPTION WHEN duplicate_table THEN
    RAISE NOTICE 'Timestamp index already exists, skipping';
  END;
  
  BEGIN
    EXECUTE 'CREATE INDEX idx_openai_usage_workflow_id ON public.openai_usage(workflow_id)';
    RAISE NOTICE 'Created workflow_id index';
  EXCEPTION WHEN duplicate_table THEN
    RAISE NOTICE 'Workflow ID index already exists, skipping';
  END;
  
  BEGIN
    EXECUTE 'CREATE INDEX idx_openai_usage_lowercase_model ON public.openai_usage(model)';
    RAISE NOTICE 'Created lowercase model index';
  EXCEPTION WHEN duplicate_table THEN
    RAISE NOTICE 'Lowercase model index already exists, skipping';
  END;
  
  BEGIN
    EXECUTE 'CREATE INDEX idx_openai_usage_uppercase_model ON public.openai_usage("Model")';
    RAISE NOTICE 'Created uppercase Model index';
  EXCEPTION WHEN duplicate_table THEN
    RAISE NOTICE 'Uppercase Model index already exists, skipping';
  END;
  
  RAISE NOTICE 'Created indexes on openai_usage table';
  
  -- Enable Row Level Security (RLS)
  EXECUTE 'ALTER TABLE public.openai_usage ENABLE ROW LEVEL SECURITY';
  
  -- Create policies
  BEGIN
    EXECUTE '
    CREATE POLICY "Enable read access for all users" ON public.openai_usage
    FOR SELECT USING (true);
    
    CREATE POLICY "Enable insert for authenticated users only" ON public.openai_usage
    FOR INSERT WITH CHECK (auth.role() = ''authenticated'');
    
    CREATE POLICY "Enable update for authenticated users only" ON public.openai_usage
    FOR UPDATE USING (auth.role() = ''authenticated'');
    ';
    RAISE NOTICE 'Created RLS policies';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Some policies already exist, continuing';
  END;
  
  RAISE NOTICE 'Enabled Row Level Security and created policies';
END;
$migration$;

-- Verify table structure after migration
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'openai_usage' 
ORDER BY ordinal_position; 