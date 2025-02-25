-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_lead_metrics_updated_at ON lead_metrics;
DROP TRIGGER IF EXISTS update_sales_metrics_updated_at ON sales_metrics;
DROP TRIGGER IF EXISTS update_satisfaction_metrics_updated_at ON satisfaction_metrics;
DROP TRIGGER IF EXISTS update_operational_metrics_updated_at ON operational_metrics;
DROP TRIGGER IF EXISTS update_retention_metrics_updated_at ON retention_metrics;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS lead_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_leads INTEGER NOT NULL DEFAULT 0,
    qualified_leads INTEGER NOT NULL DEFAULT 0,
    unqualified_leads INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_leads > 0 THEN 
                ROUND((qualified_leads::DECIMAL / total_leads::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_opportunities INTEGER NOT NULL DEFAULT 0,
    converted_opportunities INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_opportunities > 0 THEN 
                ROUND((converted_opportunities::DECIMAL / total_opportunities::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    cost_per_conversion DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN converted_opportunities > 0 THEN 
                ROUND((total_cost / converted_opportunities)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    average_ticket DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN converted_opportunities > 0 THEN 
                ROUND((revenue / converted_opportunities)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS satisfaction_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_responses INTEGER NOT NULL DEFAULT 0,
    promoters INTEGER NOT NULL DEFAULT 0,
    passives INTEGER NOT NULL DEFAULT 0,
    detractors INTEGER NOT NULL DEFAULT 0,
    satisfied_responses INTEGER NOT NULL DEFAULT 0,
    positive_sentiments INTEGER NOT NULL DEFAULT 0,
    total_sentiments INTEGER NOT NULL DEFAULT 0,
    nps_score DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_responses > 0 THEN 
                ROUND(((promoters::DECIMAL - detractors::DECIMAL) / total_responses::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    csat_score DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_responses > 0 THEN 
                ROUND((satisfied_responses::DECIMAL / total_responses::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    sentiment_score DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_sentiments > 0 THEN 
                ROUND((positive_sentiments::DECIMAL / total_sentiments::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS operational_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_interactions INTEGER NOT NULL DEFAULT 0,
    self_service_interactions INTEGER NOT NULL DEFAULT 0,
    fallback_interactions INTEGER NOT NULL DEFAULT 0,
    technical_errors INTEGER NOT NULL DEFAULT 0,
    total_resolution_time INTEGER NOT NULL DEFAULT 0,
    resolved_interactions INTEGER NOT NULL DEFAULT 0,
    self_service_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_interactions > 0 THEN 
                ROUND((self_service_interactions::DECIMAL / total_interactions::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    fallback_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_interactions > 0 THEN 
                ROUND((fallback_interactions::DECIMAL / total_interactions::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    avg_resolution_time DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN resolved_interactions > 0 THEN 
                ROUND((total_resolution_time::DECIMAL / resolved_interactions::DECIMAL)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS retention_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_users INTEGER NOT NULL DEFAULT 0,
    returning_users INTEGER NOT NULL DEFAULT 0,
    churned_users INTEGER NOT NULL DEFAULT 0,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    return_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_users > 0 THEN 
                ROUND((returning_users::DECIMAL / total_users::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    churn_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_users > 0 THEN 
                ROUND((churned_users::DECIMAL / total_users::DECIMAL * 100)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    usage_frequency DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_users > 0 THEN 
                ROUND((total_sessions::DECIMAL / total_users::DECIMAL)::DECIMAL, 2)
            ELSE 0 
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lead_metrics_date') THEN
        CREATE INDEX idx_lead_metrics_date ON lead_metrics(date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sales_metrics_date') THEN
        CREATE INDEX idx_sales_metrics_date ON sales_metrics(date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_satisfaction_metrics_date') THEN
        CREATE INDEX idx_satisfaction_metrics_date ON satisfaction_metrics(date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_operational_metrics_date') THEN
        CREATE INDEX idx_operational_metrics_date ON operational_metrics(date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_retention_metrics_date') THEN
        CREATE INDEX idx_retention_metrics_date ON retention_metrics(date);
    END IF;
END $$;

-- Create or replace the updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_lead_metrics_updated_at
    BEFORE UPDATE ON lead_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_metrics_updated_at
    BEFORE UPDATE ON sales_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_satisfaction_metrics_updated_at
    BEFORE UPDATE ON satisfaction_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operational_metrics_updated_at
    BEFORE UPDATE ON operational_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_metrics_updated_at
    BEFORE UPDATE ON retention_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on tables
ALTER TABLE lead_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read access to lead_metrics" ON lead_metrics;
    DROP POLICY IF EXISTS "Allow public read access to sales_metrics" ON sales_metrics;
    DROP POLICY IF EXISTS "Allow public read access to satisfaction_metrics" ON satisfaction_metrics;
    DROP POLICY IF EXISTS "Allow public read access to operational_metrics" ON operational_metrics;
    DROP POLICY IF EXISTS "Allow public read access to retention_metrics" ON retention_metrics;
    
    DROP POLICY IF EXISTS "Allow authenticated insert to lead_metrics" ON lead_metrics;
    DROP POLICY IF EXISTS "Allow authenticated insert to sales_metrics" ON sales_metrics;
    DROP POLICY IF EXISTS "Allow authenticated insert to satisfaction_metrics" ON satisfaction_metrics;
    DROP POLICY IF EXISTS "Allow authenticated insert to operational_metrics" ON operational_metrics;
    DROP POLICY IF EXISTS "Allow authenticated insert to retention_metrics" ON retention_metrics;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create read policies
CREATE POLICY "Allow public read access to lead_metrics"
    ON lead_metrics FOR SELECT USING (true);

CREATE POLICY "Allow public read access to sales_metrics"
    ON sales_metrics FOR SELECT USING (true);

CREATE POLICY "Allow public read access to satisfaction_metrics"
    ON satisfaction_metrics FOR SELECT USING (true);

CREATE POLICY "Allow public read access to operational_metrics"
    ON operational_metrics FOR SELECT USING (true);

CREATE POLICY "Allow public read access to retention_metrics"
    ON retention_metrics FOR SELECT USING (true);

-- Create insert policies for authenticated users
CREATE POLICY "Allow authenticated insert to lead_metrics"
    ON lead_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to sales_metrics"
    ON sales_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to satisfaction_metrics"
    ON satisfaction_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to operational_metrics"
    ON operational_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to retention_metrics"
    ON retention_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');