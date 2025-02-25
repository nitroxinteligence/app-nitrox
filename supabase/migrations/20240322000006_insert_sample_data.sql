-- Limpar dados existentes
TRUNCATE TABLE lead_metrics CASCADE;
TRUNCATE TABLE sales_metrics CASCADE;
TRUNCATE TABLE satisfaction_metrics CASCADE;
TRUNCATE TABLE operational_metrics CASCADE;
TRUNCATE TABLE retention_metrics CASCADE;

-- Insert sample data for lead_metrics (daily data for last 30 days)
INSERT INTO lead_metrics (date, total_leads, qualified_leads, unqualified_leads, conversion_rate)
SELECT
  (current_date - (n || ' days')::interval)::date as date_value,
  -- Valores diários mais consistentes
  CASE 
    WHEN n < 10 THEN FLOOR(RANDOM() * (150 - 120 + 1) + 120)
    WHEN n < 20 THEN FLOOR(RANDOM() * (120 - 90 + 1) + 90)
    ELSE FLOOR(RANDOM() * (90 - 60 + 1) + 60)
  END as total_leads,
  FLOOR(RANDOM() * (100 - 30 + 1) + 30),
  FLOOR(RANDOM() * (50 - 10 + 1) + 10),
  ROUND((RANDOM() * (0.8 - 0.3) + 0.3)::NUMERIC, 2)
FROM generate_series(0, 29) n;

-- Insert sample data for sales_metrics (daily data)
INSERT INTO sales_metrics (date, revenue, cost_per_conversion, average_ticket, conversion_rate)
SELECT
  (current_date - (n || ' days')::interval)::date as date_value,
  -- Valores diários mais consistentes
  CASE 
    WHEN n < 10 THEN FLOOR(RANDOM() * (10000 - 8000 + 1) + 8000)
    WHEN n < 20 THEN FLOOR(RANDOM() * (8000 - 6000 + 1) + 6000)
    ELSE FLOOR(RANDOM() * (6000 - 4000 + 1) + 4000)
  END as revenue,
  FLOOR(RANDOM() * (100 - 50 + 1) + 50),
  FLOOR(RANDOM() * (500 - 200 + 1) + 200),
  ROUND((RANDOM() * (0.7 - 0.2) + 0.2)::NUMERIC, 2)
FROM generate_series(0, 29) n;

-- Insert sample data for satisfaction_metrics (daily data)
INSERT INTO satisfaction_metrics (date, nps_score, csat_score, sentiment_score, total_responses)
SELECT
  (current_date - (n || ' days')::interval)::date as date_value,
  FLOOR(RANDOM() * (100 - (-100) + 1) + (-100)),
  ROUND((RANDOM() * (5.0 - 3.0) + 3.0)::NUMERIC, 2),
  ROUND((RANDOM() * (1.0 - (-1.0)) + (-1.0))::NUMERIC, 2),
  -- Respostas diárias mais consistentes
  CASE 
    WHEN n < 10 THEN FLOOR(RANDOM() * (1000 - 800 + 1) + 800)
    WHEN n < 20 THEN FLOOR(RANDOM() * (800 - 600 + 1) + 600)
    ELSE FLOOR(RANDOM() * (600 - 400 + 1) + 400)
  END as total_responses
FROM generate_series(0, 29) n;

-- Insert sample data for operational_metrics (daily data)
INSERT INTO operational_metrics (date, self_service_rate, fallback_rate, technical_errors, avg_resolution_time)
SELECT
  (current_date - (n || ' days')::interval)::date as date_value,
  ROUND((RANDOM() * (0.9 - 0.5) + 0.5)::NUMERIC, 2),
  ROUND((RANDOM() * (0.3 - 0.1) + 0.1)::NUMERIC, 2),
  FLOOR(RANDOM() * (50 - 5 + 1) + 5),
  -- Tempo de resolução diário mais consistente
  CASE 
    WHEN n < 10 THEN FLOOR(RANDOM() * (200 - 150 + 1) + 150)
    WHEN n < 20 THEN FLOOR(RANDOM() * (250 - 200 + 1) + 200)
    ELSE FLOOR(RANDOM() * (300 - 250 + 1) + 250)
  END as avg_resolution_time
FROM generate_series(0, 29) n;

-- Insert sample data for retention_metrics (daily data)
INSERT INTO retention_metrics (date, return_rate, churn_rate, usage_frequency)
SELECT
  (current_date - (n || ' days')::interval)::date as date_value,
  ROUND((RANDOM() * (0.8 - 0.4) + 0.4)::NUMERIC, 2),
  ROUND((RANDOM() * (0.2 - 0.05) + 0.05)::NUMERIC, 2),
  -- Frequência de uso diária mais consistente
  CASE 
    WHEN n < 10 THEN FLOOR(RANDOM() * (30 - 25 + 1) + 25)
    WHEN n < 20 THEN FLOOR(RANDOM() * (25 - 20 + 1) + 20)
    ELSE FLOOR(RANDOM() * (20 - 15 + 1) + 15)
  END as usage_frequency
FROM generate_series(0, 29) n;

-- Função para gerar números aleatórios dentro de um intervalo
CREATE OR REPLACE FUNCTION random_between(low INT, high INT) 
   RETURNS INT AS
$$
BEGIN
   RETURN floor(random()* (high-low + 1) + low);
END;
$$ language 'plpgsql' STRICT;

-- Inserir dados de leads para hoje
INSERT INTO lead_metrics (
    date,
    total_leads,
    qualified_leads,
    unqualified_leads
)
VALUES (
    CURRENT_DATE,
    random_between(80, 120),  -- total_leads
    random_between(40, 60),   -- qualified_leads
    random_between(20, 40)    -- unqualified_leads
);

-- Inserir dados de vendas para hoje
INSERT INTO sales_metrics (
    date,
    revenue,
    total_cost
)
VALUES (
    CURRENT_DATE,
    random_between(50000, 80000), -- revenue
    random_between(10000, 20000)  -- total_cost
);

-- Inserir dados de satisfação para hoje
INSERT INTO satisfaction_metrics (
    date,
    total_responses,
    promoters,
    passives,
    detractors,
    satisfied_responses,
    positive_sentiments,
    total_sentiments
)
VALUES (
    CURRENT_DATE,
    random_between(100, 150),    -- total_responses
    random_between(50, 70),      -- promoters
    random_between(20, 30),      -- passives
    random_between(10, 20),      -- detractors
    random_between(70, 90),      -- satisfied_responses
    random_between(60, 80),      -- positive_sentiments
    random_between(90, 110)      -- total_sentiments
);

-- Inserir dados operacionais para hoje
INSERT INTO operational_metrics (
    date,
    total_interactions,
    self_service_interactions,
    fallback_interactions,
    technical_errors,
    total_resolution_time,
    resolved_interactions
)
VALUES (
    CURRENT_DATE,
    random_between(200, 300),    -- total_interactions
    random_between(120, 180),    -- self_service_interactions
    random_between(30, 50),      -- fallback_interactions
    random_between(5, 15),       -- technical_errors
    random_between(3600, 7200),  -- total_resolution_time (em segundos)
    random_between(180, 250)     -- resolved_interactions
);

-- Inserir dados de retenção para hoje
INSERT INTO retention_metrics (
    date,
    total_users,
    returning_users,
    churned_users,
    total_sessions
)
VALUES (
    CURRENT_DATE,
    random_between(1000, 1200),  -- total_users
    random_between(700, 800),    -- returning_users
    random_between(50, 100),     -- churned_users
    random_between(2000, 2500)   -- total_sessions
);

-- Função para atualizar dados aleatoriamente a cada minuto
CREATE OR REPLACE FUNCTION update_random_metrics() RETURNS void AS $$
BEGIN
    -- Atualizar lead_metrics
    INSERT INTO lead_metrics (
        date,
        total_leads,
        qualified_leads,
        unqualified_leads
    )
    VALUES (
        date_trunc('day', NOW()),
        random_between(80, 120),  -- total_leads
        random_between(40, 60),   -- qualified_leads
        random_between(20, 40)    -- unqualified_leads
    )
    ON CONFLICT (date)
    DO UPDATE SET
        total_leads = EXCLUDED.total_leads,
        qualified_leads = EXCLUDED.qualified_leads,
        unqualified_leads = EXCLUDED.unqualified_leads,
        updated_at = NOW();

    -- Atualizar sales_metrics
    INSERT INTO sales_metrics (
        date,
        revenue,
        total_opportunities,
        converted_opportunities
    )
    VALUES (
        date_trunc('day', NOW()),
        random_between(50000, 80000),  -- revenue
        random_between(100, 150),      -- total_opportunities
        random_between(40, 80)         -- converted_opportunities
    )
    ON CONFLICT (date)
    DO UPDATE SET
        revenue = EXCLUDED.revenue,
        total_opportunities = EXCLUDED.total_opportunities,
        converted_opportunities = EXCLUDED.converted_opportunities,
        updated_at = NOW();

    -- Atualizar satisfaction_metrics
    INSERT INTO satisfaction_metrics (
        date,
        total_responses,
        satisfied_responses,
        positive_sentiments,
        total_sentiments
    )
    VALUES (
        date_trunc('day', NOW()),
        random_between(100, 150),    -- total_responses
        random_between(70, 90),      -- satisfied_responses
        random_between(60, 80),      -- positive_sentiments
        random_between(90, 110)      -- total_sentiments
    )
    ON CONFLICT (date)
    DO UPDATE SET
        total_responses = EXCLUDED.total_responses,
        satisfied_responses = EXCLUDED.satisfied_responses,
        positive_sentiments = EXCLUDED.positive_sentiments,
        total_sentiments = EXCLUDED.total_sentiments,
        updated_at = NOW();

    -- Atualizar operational_metrics
    INSERT INTO operational_metrics (
        date,
        total_interactions,
        self_service_interactions,
        fallback_interactions,
        technical_errors,
        total_resolution_time,
        resolved_interactions
    )
    VALUES (
        date_trunc('day', NOW()),
        random_between(200, 300),    -- total_interactions
        random_between(120, 180),    -- self_service_interactions
        random_between(30, 50),      -- fallback_interactions
        random_between(5, 15),       -- technical_errors
        random_between(3600, 7200),  -- total_resolution_time
        random_between(180, 250)     -- resolved_interactions
    )
    ON CONFLICT (date)
    DO UPDATE SET
        total_interactions = EXCLUDED.total_interactions,
        self_service_interactions = EXCLUDED.self_service_interactions,
        fallback_interactions = EXCLUDED.fallback_interactions,
        technical_errors = EXCLUDED.technical_errors,
        total_resolution_time = EXCLUDED.total_resolution_time,
        resolved_interactions = EXCLUDED.resolved_interactions,
        updated_at = NOW();

    -- Atualizar retention_metrics
    INSERT INTO retention_metrics (
        date,
        total_users,
        returning_users,
        churned_users,
        total_sessions
    )
    VALUES (
        date_trunc('day', NOW()),
        random_between(1000, 1200),  -- total_users
        random_between(700, 800),    -- returning_users
        random_between(50, 100),     -- churned_users
        random_between(2000, 2500)   -- total_sessions
    )
    ON CONFLICT (date)
    DO UPDATE SET
        total_users = EXCLUDED.total_users,
        returning_users = EXCLUDED.returning_users,
        churned_users = EXCLUDED.churned_users,
        total_sessions = EXCLUDED.total_sessions,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Criar um agendamento para executar a função a cada minuto
SELECT cron.schedule(
    'update-metrics-every-minute',  -- nome único do agendamento
    '* * * * *',                   -- expressão cron para executar a cada minuto
    'SELECT update_random_metrics()'
);

-- Function to generate random metrics data
CREATE OR REPLACE FUNCTION insert_sample_metrics_data() RETURNS void AS $$
DECLARE
    current_date TIMESTAMP;
    total_leads INT;
    qualified_leads INT;
    opportunities INT;
    converted_opps INT;
    revenue DECIMAL;
    total_cost DECIMAL;
    total_responses INT;
    promoters INT;
    passives INT;
    detractors INT;
    interactions INT;
    self_service INT;
    total_users INT;
    returning_users INT;
BEGIN
    -- Insert data for the last 30 days
    FOR i IN 0..30 LOOP
        -- Calculate date
        current_date := NOW() - (i || ' days')::INTERVAL;
        
        -- Generate random numbers for lead metrics
        total_leads := floor(random() * 100 + 50);
        qualified_leads := floor(random() * total_leads);
        
        -- Insert lead metrics
        INSERT INTO lead_metrics (date, total_leads, qualified_leads, unqualified_leads)
        VALUES (
            current_date,
            total_leads,
            qualified_leads,
            total_leads - qualified_leads
        );

        -- Generate random numbers for sales metrics
        opportunities := floor(random() * 50 + 20);
        converted_opps := floor(random() * opportunities);
        revenue := converted_opps * (random() * 1000 + 500);
        total_cost := converted_opps * (random() * 200 + 100);
        
        -- Insert sales metrics
        INSERT INTO sales_metrics (
            date,
            total_opportunities,
            converted_opportunities,
            revenue,
            total_cost
        )
        VALUES (
            current_date,
            opportunities,
            converted_opps,
            revenue,
            total_cost
        );

        -- Generate random numbers for satisfaction metrics
        total_responses := floor(random() * 100 + 30);
        promoters := floor(random() * (total_responses * 0.6));
        passives := floor(random() * (total_responses - promoters));
        detractors := total_responses - promoters - passives;
        
        -- Insert satisfaction metrics
        INSERT INTO satisfaction_metrics (
            date,
            total_responses,
            promoters,
            passives,
            detractors,
            satisfied_responses,
            positive_sentiments,
            total_sentiments
        )
        VALUES (
            current_date,
            total_responses,
            promoters,
            passives,
            detractors,
            floor(random() * total_responses),
            floor(random() * total_responses),
            total_responses
        );

        -- Generate random numbers for operational metrics
        interactions := floor(random() * 200 + 100);
        self_service := floor(random() * interactions);
        
        -- Insert operational metrics
        INSERT INTO operational_metrics (
            date,
            total_interactions,
            self_service_interactions,
            fallback_interactions,
            technical_errors,
            total_resolution_time,
            resolved_interactions
        )
        VALUES (
            current_date,
            interactions,
            self_service,
            floor(random() * (interactions - self_service)),
            floor(random() * 10),
            floor(random() * 3600),
            floor(random() * interactions)
        );

        -- Generate random numbers for retention metrics
        total_users := floor(random() * 1000 + 500);
        returning_users := floor(random() * total_users);
        
        -- Insert retention metrics
        INSERT INTO retention_metrics (
            date,
            total_users,
            returning_users,
            churned_users,
            total_sessions
        )
        VALUES (
            current_date,
            total_users,
            returning_users,
            floor(random() * (total_users - returning_users)),
            floor(random() * (total_users * 3))
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to insert sample data
SELECT insert_sample_metrics_data(); 