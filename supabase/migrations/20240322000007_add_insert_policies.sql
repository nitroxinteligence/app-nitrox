-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow anon insert to lead_metrics" ON lead_metrics;
    DROP POLICY IF EXISTS "Allow anon insert to sales_metrics" ON sales_metrics;
    DROP POLICY IF EXISTS "Allow anon insert to satisfaction_metrics" ON satisfaction_metrics;
    DROP POLICY IF EXISTS "Allow anon insert to operational_metrics" ON operational_metrics;
    DROP POLICY IF EXISTS "Allow anon insert to retention_metrics" ON retention_metrics;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create insert policies for anon user
CREATE POLICY "Allow anon insert to lead_metrics"
    ON lead_metrics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anon insert to sales_metrics"
    ON sales_metrics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anon insert to satisfaction_metrics"
    ON satisfaction_metrics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anon insert to operational_metrics"
    ON operational_metrics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anon insert to retention_metrics"
    ON retention_metrics FOR INSERT
    WITH CHECK (true); 