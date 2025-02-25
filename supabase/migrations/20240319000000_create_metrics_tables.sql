-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Drop existing cron job if exists
SELECT cron.unschedule('refresh-metrics-daily');

-- Drop existing tables and functions if they exist
DROP TABLE IF EXISTS lead_metrics CASCADE;
DROP TABLE IF EXISTS sales_metrics CASCADE;
DROP TABLE IF EXISTS satisfaction_metrics CASCADE;
DROP TABLE IF EXISTS operational_metrics CASCADE;
DROP TABLE IF EXISTS retention_metrics CASCADE;
DROP FUNCTION IF EXISTS random_between(INT, INT);
DROP FUNCTION IF EXISTS generate_sample_data();
DROP FUNCTION IF EXISTS refresh_metrics_data();
DROP FUNCTION IF EXISTS refresh_metrics_cron();

-- Create lead_metrics table
CREATE TABLE lead_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_leads INTEGER NOT NULL DEFAULT 0,
    qualified_leads INTEGER NOT NULL DEFAULT 0,
    unqualified_leads INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_metrics table
CREATE TABLE sales_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_opportunities INTEGER NOT NULL DEFAULT 0,
    converted_opportunities INTEGER NOT NULL DEFAULT 0,
    cost_per_conversion DECIMAL(10,2) NOT NULL DEFAULT 0,
    average_ticket DECIMAL(10,2) NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create satisfaction_metrics table
CREATE TABLE satisfaction_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    nps_score DECIMAL(4,1) NOT NULL DEFAULT 0,
    csat_score DECIMAL(4,1) NOT NULL DEFAULT 0,
    sentiment_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_responses INTEGER NOT NULL DEFAULT 0,
    promoters INTEGER NOT NULL DEFAULT 0,
    passives INTEGER NOT NULL DEFAULT 0,
    detractors INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create operational_metrics table
CREATE TABLE operational_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    self_service_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    fallback_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    technical_errors INTEGER NOT NULL DEFAULT 0,
    avg_resolution_time INTEGER NOT NULL DEFAULT 0,
    total_interactions INTEGER NOT NULL DEFAULT 0,
    resolved_interactions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create retention_metrics table
CREATE TABLE retention_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    return_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    churn_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    usage_frequency DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_users INTEGER NOT NULL DEFAULT 0,
    returning_users INTEGER NOT NULL DEFAULT 0,
    churned_users INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to generate random numbers within a range
CREATE OR REPLACE FUNCTION random_between(low INT, high INT) 
   RETURNS INT AS
$$
BEGIN
   RETURN floor(random()* (high-low + 1) + low);
END;
$$ language 'plpgsql' STRICT;

-- Function to generate sample data for the last 90 days
CREATE OR REPLACE FUNCTION generate_sample_data() 
RETURNS void AS $$
DECLARE
    metric_date DATE;
    base_leads INT;
    base_revenue DECIMAL;
    base_nps DECIMAL;
    base_self_service DECIMAL;
    base_return_rate DECIMAL;
BEGIN
    -- Generate data for the last 90 days
    FOR i IN 1..90 LOOP
        metric_date := CURRENT_DATE - (i || ' days')::INTERVAL;
        
        -- Generate base values with some randomness
        base_leads := random_between(80, 120);
        base_revenue := random_between(8000, 12000);
        base_nps := random_between(70, 90);
        base_self_service := random_between(70, 90);
        base_return_rate := random_between(70, 90);

        -- Insert lead metrics
        INSERT INTO lead_metrics (
            date,
            total_leads,
            qualified_leads,
            unqualified_leads,
            conversion_rate
        ) VALUES (
            metric_date,
            base_leads,
            FLOOR(base_leads * random_between(50, 70) / 100.0),
            FLOOR(base_leads * random_between(10, 30) / 100.0),
            random_between(20, 40)
        );

        -- Insert sales metrics
        INSERT INTO sales_metrics (
            date,
            revenue,
            total_opportunities,
            converted_opportunities,
            cost_per_conversion,
            average_ticket,
            conversion_rate
        ) VALUES (
            metric_date,
            base_revenue + random_between(-1000, 1000),
            random_between(40, 60),
            random_between(20, 30),
            random_between(100, 200),
            base_revenue / random_between(20, 30),
            random_between(20, 40)
        );

        -- Insert satisfaction metrics
        INSERT INTO satisfaction_metrics (
            date,
            nps_score,
            csat_score,
            sentiment_score,
            total_responses,
            promoters,
            passives,
            detractors
        ) VALUES (
            metric_date,
            base_nps / 10.0,
            random_between(40, 50) / 10.0,
            base_nps,
            random_between(100, 150),
            random_between(60, 80),
            random_between(10, 20),
            random_between(5, 15)
        );

        -- Insert operational metrics
        INSERT INTO operational_metrics (
            date,
            self_service_rate,
            fallback_rate,
            technical_errors,
            avg_resolution_time,
            total_interactions,
            resolved_interactions
        ) VALUES (
            metric_date,
            base_self_service,
            100 - base_self_service,
            random_between(1, 5),
            random_between(5, 15),
            random_between(200, 300),
            random_between(180, 270)
        );

        -- Insert retention metrics
        INSERT INTO retention_metrics (
            date,
            return_rate,
            churn_rate,
            usage_frequency,
            total_users,
            returning_users,
            churned_users
        ) VALUES (
            metric_date,
            base_return_rate,
            100 - base_return_rate,
            random_between(30, 50) / 10.0,
            random_between(1000, 1200),
            random_between(700, 900),
            random_between(50, 100)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh metrics data
CREATE OR REPLACE FUNCTION refresh_metrics_data()
RETURNS void AS $$
DECLARE
    base_leads INT;
    base_revenue DECIMAL;
    base_nps DECIMAL;
    base_self_service DECIMAL;
    base_return_rate DECIMAL;
BEGIN
    -- Delete old data
    DELETE FROM lead_metrics WHERE date < CURRENT_DATE - INTERVAL '90 days';
    DELETE FROM sales_metrics WHERE date < CURRENT_DATE - INTERVAL '90 days';
    DELETE FROM satisfaction_metrics WHERE date < CURRENT_DATE - INTERVAL '90 days';
    DELETE FROM operational_metrics WHERE date < CURRENT_DATE - INTERVAL '90 days';
    DELETE FROM retention_metrics WHERE date < CURRENT_DATE - INTERVAL '90 days';

    -- Generate base values with some randomness
    base_leads := random_between(80, 120);
    base_revenue := random_between(8000, 12000);
    base_nps := random_between(70, 90);
    base_self_service := random_between(70, 90);
    base_return_rate := random_between(70, 90);

    -- Insert new data for today
    INSERT INTO lead_metrics (
        date,
        total_leads,
        qualified_leads,
        unqualified_leads,
        conversion_rate
    ) VALUES (
        CURRENT_DATE,
        base_leads,
        FLOOR(base_leads * random_between(50, 70) / 100.0),
        FLOOR(base_leads * random_between(10, 30) / 100.0),
        random_between(20, 40)
    );

    -- Insert sales metrics
    INSERT INTO sales_metrics (
        date,
        revenue,
        total_opportunities,
        converted_opportunities,
        cost_per_conversion,
        average_ticket,
        conversion_rate
    ) VALUES (
        CURRENT_DATE,
        base_revenue + random_between(-1000, 1000),
        random_between(40, 60),
        random_between(20, 30),
        random_between(100, 200),
        base_revenue / random_between(20, 30),
        random_between(20, 40)
    );

    -- Insert satisfaction metrics
    INSERT INTO satisfaction_metrics (
        date,
        nps_score,
        csat_score,
        sentiment_score,
        total_responses,
        promoters,
        passives,
        detractors
    ) VALUES (
        CURRENT_DATE,
        base_nps / 10.0,
        random_between(40, 50) / 10.0,
        base_nps,
        random_between(100, 150),
        random_between(60, 80),
        random_between(10, 20),
        random_between(5, 15)
    );

    -- Insert operational metrics
    INSERT INTO operational_metrics (
        date,
        self_service_rate,
        fallback_rate,
        technical_errors,
        avg_resolution_time,
        total_interactions,
        resolved_interactions
    ) VALUES (
        CURRENT_DATE,
        base_self_service,
        100 - base_self_service,
        random_between(1, 5),
        random_between(5, 15),
        random_between(200, 300),
        random_between(180, 270)
    );

    -- Insert retention metrics
    INSERT INTO retention_metrics (
        date,
        return_rate,
        churn_rate,
        usage_frequency,
        total_users,
        returning_users,
        churned_users
    ) VALUES (
        CURRENT_DATE,
        base_return_rate,
        100 - base_return_rate,
        random_between(30, 50) / 10.0,
        random_between(1000, 1200),
        random_between(700, 900),
        random_between(50, 100)
    );
END;
$$ LANGUAGE plpgsql;

-- Function that will be called by the cron job
CREATE OR REPLACE FUNCTION refresh_metrics_cron()
RETURNS void AS $$
BEGIN
  PERFORM refresh_metrics_data();
END;
$$ LANGUAGE plpgsql;

-- Generate initial sample data
SELECT generate_sample_data();

-- Create a cron job to refresh data every day (this part will be done in the Supabase dashboard)
-- To set up the cron job:
-- 1. Go to Supabase Dashboard
-- 2. Go to Database > Functions
-- 3. Create a new cron job with:
--    - Name: refresh_metrics_daily
--    - Schedule: 0 0 * * * (midnight every day)
--    - Function to call: refresh_metrics_cron
