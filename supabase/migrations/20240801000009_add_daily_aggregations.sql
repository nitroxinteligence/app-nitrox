-- Add daily aggregation table and update function
-- This addresses the error: relation "public.openai_usage_daily" does not exist

DO $migration$
BEGIN
  -- Create the daily aggregation table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.openai_usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    model TEXT,
    prompt_tokens BIGINT DEFAULT 0,
    completion_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0,
    calls INTEGER DEFAULT 0,
    workflow_id TEXT,
    workflow_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(date, model, workflow_id)
  );
  
  -- Create indexes for faster queries
  CREATE INDEX IF NOT EXISTS idx_openai_usage_daily_date ON public.openai_usage_daily(date);
  CREATE INDEX IF NOT EXISTS idx_openai_usage_daily_model ON public.openai_usage_daily(model);
  CREATE INDEX IF NOT EXISTS idx_openai_usage_daily_workflow_id ON public.openai_usage_daily(workflow_id);
  
  -- Enable Row Level Security
  ALTER TABLE public.openai_usage_daily ENABLE ROW LEVEL SECURITY;
  
  -- Create policies
  DO $$
  BEGIN
    BEGIN
      CREATE POLICY "Enable read access for all users" ON public.openai_usage_daily
      FOR SELECT USING (true);
      
      CREATE POLICY "Enable insert for authenticated users only" ON public.openai_usage_daily
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      
      CREATE POLICY "Enable update for authenticated users only" ON public.openai_usage_daily
      FOR UPDATE USING (auth.role() = 'authenticated');
    EXCEPTION WHEN duplicate_object THEN
      -- Policies already exist, do nothing
    END;
  END $$;
  
  -- First, check if any existing functions with this name already exist and drop them
  BEGIN
    DROP FUNCTION IF EXISTS public.update_openai_usage_aggregations(date, date);
    DROP FUNCTION IF EXISTS public.update_openai_usage_aggregations();
    RAISE NOTICE 'Dropped any existing update_openai_usage_aggregations functions';
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'No existing functions to drop';
  END;
  
  -- Create or replace the RPC function for updating aggregations
  CREATE OR REPLACE FUNCTION public.update_openai_usage_aggregations(
    start_date date DEFAULT (current_date - interval '30 days')::date,
    end_date date DEFAULT current_date
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
  DECLARE
    result jsonb;
    processed_days integer := 0;
    total_records integer := 0;
  BEGIN
    -- Delete existing aggregations for the given period to avoid duplicates
    DELETE FROM public.openai_usage_daily
    WHERE date >= start_date AND date <= end_date;
    
    -- Insert new aggregations from the raw data
    WITH daily_aggregations AS (
      SELECT
        (date_trunc('day', "timestamp")::date) as date,
        COALESCE("Model", model) as model,
        workflow_id,
        workflow_name,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as estimated_cost,
        COUNT(*) as calls
      FROM
        public.openai_usage
      WHERE
        "timestamp"::date >= start_date
        AND "timestamp"::date <= end_date
      GROUP BY
        date_trunc('day', "timestamp")::date,
        COALESCE("Model", model),
        workflow_id,
        workflow_name
    )
    INSERT INTO public.openai_usage_daily (
      date,
      model,
      workflow_id,
      workflow_name,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      estimated_cost,
      calls
    )
    SELECT
      date,
      model,
      workflow_id,
      workflow_name,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      estimated_cost,
      calls
    FROM
      daily_aggregations;
      
    -- Get stats about the aggregation run
    GET DIAGNOSTICS total_records = ROW_COUNT;
    SELECT COUNT(DISTINCT date) INTO processed_days FROM public.openai_usage_daily WHERE date >= start_date AND date <= end_date;
    
    -- Return information about the operation
    result := jsonb_build_object(
      'success', true,
      'start_date', start_date,
      'end_date', end_date,
      'days_processed', processed_days,
      'records_created', total_records
    );
    
    RETURN result;
  END;
  $function$;
  
  -- Grant permissions on the function with specific parameter types
  BEGIN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_openai_usage_aggregations(date, date) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_openai_usage_aggregations(date, date) TO service_role';
    RAISE NOTICE 'Granted permissions on update_openai_usage_aggregations function';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error granting permissions: %', SQLERRM;
  END;
  
END;
$migration$;

-- Verify that the table and function now exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public'
  AND table_name = 'openai_usage_daily'
) AS openai_usage_daily_exists,
EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'update_openai_usage_aggregations'
) AS update_function_exists; 