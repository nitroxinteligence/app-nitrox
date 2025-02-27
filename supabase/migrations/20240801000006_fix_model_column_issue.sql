-- Fix for the 'Model' column issue in openai_usage table
-- This migration addresses the error: Could not find the 'Model' column of 'openai_usage' in the schema cache

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
  
  -- If neither column exists, raise an exception
  IF NOT lowercase_model_exists AND NOT uppercase_model_exists THEN
    RAISE EXCEPTION 'No model column found in openai_usage table. The table structure may be incorrect.';
  END IF;

  -- If only lowercase 'model' exists, rename it to 'Model'
  IF lowercase_model_exists AND NOT uppercase_model_exists THEN
    EXECUTE 'ALTER TABLE public.openai_usage RENAME COLUMN model TO "Model"';
    RAISE NOTICE 'Renamed column ''model'' to ''Model'' in openai_usage table';
    uppercase_model_exists := TRUE;
    lowercase_model_exists := FALSE;
  -- If both exist, we need to migrate data and remove the duplicate
  ELSIF lowercase_model_exists AND uppercase_model_exists THEN
    -- Update any null values in 'Model' with values from 'model'
    EXECUTE 'UPDATE public.openai_usage SET "Model" = model WHERE "Model" IS NULL AND model IS NOT NULL';
    RAISE NOTICE 'Migrated data from ''model'' to ''Model'' column';
  -- If only 'Model' exists, nothing needed
  ELSIF uppercase_model_exists THEN
    RAISE NOTICE 'Column ''Model'' already exists, no change needed';
  END IF;

  -- As a fallback, if 'Model' still doesn't exist, add it
  IF NOT uppercase_model_exists THEN
    -- Add the 'Model' column
    EXECUTE 'ALTER TABLE public.openai_usage ADD COLUMN "Model" TEXT';
    RAISE NOTICE 'Added ''Model'' column to openai_usage table';
    
    -- If we have the lowercase 'model' column, copy data from it
    IF lowercase_model_exists THEN
      EXECUTE 'UPDATE public.openai_usage SET "Model" = model';
      RAISE NOTICE 'Copied data from ''model'' to ''Model'' column';
    END IF;
    
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

-- Verify the columns exist after migration
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'openai_usage' 
AND column_name IN ('model', 'Model'); 