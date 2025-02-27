-- Add lowercase 'model' column to maintain compatibility with API calls
-- This addresses the error: Could not find the 'model' column of 'openai_usage' in the schema cache

DO $migration$
DECLARE
  lowercase_model_exists BOOLEAN;
  uppercase_model_exists BOOLEAN;
BEGIN
  -- Check if 'model' (lowercase) column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'openai_usage'
    AND column_name = 'model'
  ) INTO lowercase_model_exists;
  
  -- Check if 'Model' (uppercase) column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'openai_usage'
    AND column_name = 'Model'
  ) INTO uppercase_model_exists;
  
  RAISE NOTICE 'Column status: lowercase model: %, uppercase Model: %', lowercase_model_exists, uppercase_model_exists;
  
  -- If we have uppercase but not lowercase, add the lowercase column
  IF uppercase_model_exists AND NOT lowercase_model_exists THEN
    EXECUTE 'ALTER TABLE public.openai_usage ADD COLUMN model TEXT';
    RAISE NOTICE 'Added lowercase ''model'' column';
    
    -- Copy data from uppercase to lowercase
    EXECUTE 'UPDATE public.openai_usage SET model = "Model" WHERE "Model" IS NOT NULL';
    RAISE NOTICE 'Copied data from ''Model'' to ''model'' column';
    
    lowercase_model_exists := TRUE;
  END IF;
  
  -- If we have lowercase but not uppercase, add the uppercase column
  IF lowercase_model_exists AND NOT uppercase_model_exists THEN
    EXECUTE 'ALTER TABLE public.openai_usage ADD COLUMN "Model" TEXT';
    RAISE NOTICE 'Added uppercase ''Model'' column';
    
    -- Copy data from lowercase to uppercase
    EXECUTE 'UPDATE public.openai_usage SET "Model" = model WHERE model IS NOT NULL';
    RAISE NOTICE 'Copied data from ''model'' to ''Model'' column';
    
    uppercase_model_exists := TRUE;
  END IF;
  
  -- Create a trigger to keep both columns in sync if both exist
  IF lowercase_model_exists AND uppercase_model_exists THEN
    -- First check if the trigger already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'sync_model_columns'
    ) THEN
      EXECUTE $trigger_sql$
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
      $trigger_sql$;
      
      RAISE NOTICE 'Created trigger to keep model columns in sync';
    ELSE
      RAISE NOTICE 'Trigger sync_model_columns already exists';
    END IF;
  END IF;
  
  -- Return the current state of the columns after all operations
  RAISE NOTICE 'Final column status: lowercase model: %, uppercase Model: %', lowercase_model_exists, uppercase_model_exists;
END;
$migration$;

-- Verify that both columns exist after migration
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'openai_usage' 
AND column_name IN ('model', 'Model')
ORDER BY column_name; 