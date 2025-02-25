-- Primeiro, limpar dados existentes
TRUNCATE TABLE lead_metrics, sales_metrics, satisfaction_metrics, operational_metrics, retention_metrics;

-- Função para gerar dados diários
CREATE OR REPLACE FUNCTION generate_metrics_data(p_start_date DATE, p_end_date DATE) RETURNS void AS $$
DECLARE
    metric_date DATE;
    base_leads INTEGER;
    base_opportunities INTEGER;
    base_responses INTEGER;
    base_interactions INTEGER;
    base_users INTEGER;
BEGIN
    metric_date := p_start_date;
    
    WHILE metric_date <= p_end_date LOOP
        -- Gerar números base com alguma variação diária
        base_leads := 100 + (random() * 50)::INTEGER;
        base_opportunities := (base_leads * (0.3 + random() * 0.2))::INTEGER;
        base_responses := 800 + (random() * 200)::INTEGER;
        base_interactions := 150 + (random() * 100)::INTEGER;
        base_users := 900 + (random() * 200)::INTEGER;

        -- Lead Metrics
        INSERT INTO lead_metrics (
            date,
            total_leads,
            qualified_leads,
            unqualified_leads
        ) VALUES (
            metric_date,
            base_leads,
            (base_leads * (0.5 + random() * 0.2))::INTEGER,
            (base_leads * (0.3 + random() * 0.2))::INTEGER
        );

        -- Sales Metrics
        INSERT INTO sales_metrics (
            date,
            total_opportunities,
            converted_opportunities,
            revenue,
            total_cost
        ) VALUES (
            metric_date,
            base_opportunities,
            (base_opportunities * (0.4 + random() * 0.3))::INTEGER,
            (base_opportunities * (300 + random() * 200))::DECIMAL(10,2),
            (base_opportunities * (50 + random() * 30))::DECIMAL(10,2)
        );

        -- Satisfaction Metrics
        INSERT INTO satisfaction_metrics (
            date,
            total_responses,
            promoters,
            passives,
            detractors,
            satisfied_responses,
            positive_sentiments,
            total_sentiments
        ) VALUES (
            metric_date,
            base_responses,
            (base_responses * (0.4 + random() * 0.2))::INTEGER,
            (base_responses * (0.3 + random() * 0.1))::INTEGER,
            (base_responses * (0.2 + random() * 0.1))::INTEGER,
            (base_responses * (0.7 + random() * 0.2))::INTEGER,
            (base_responses * (0.6 + random() * 0.2))::INTEGER,
            base_responses
        );

        -- Operational Metrics
        INSERT INTO operational_metrics (
            date,
            total_interactions,
            self_service_interactions,
            fallback_interactions,
            technical_errors,
            total_resolution_time,
            resolved_interactions
        ) VALUES (
            metric_date,
            base_interactions,
            (base_interactions * (0.6 + random() * 0.2))::INTEGER,
            (base_interactions * (0.2 + random() * 0.1))::INTEGER,
            (random() * 20)::INTEGER,
            (base_interactions * (2 + random() * 3))::INTEGER,
            (base_interactions * (0.8 + random() * 0.15))::INTEGER
        );

        -- Retention Metrics
        INSERT INTO retention_metrics (
            date,
            total_users,
            returning_users,
            churned_users,
            total_sessions
        ) VALUES (
            metric_date,
            base_users,
            (base_users * (0.6 + random() * 0.2))::INTEGER,
            (base_users * (0.1 + random() * 0.1))::INTEGER,
            (base_users * (2.5 + random() * 1))::INTEGER
        );

        metric_date := metric_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar a função para gerar dados de 01/jan/2025 até 01/mar/2025
DO $$
BEGIN
    PERFORM generate_metrics_data('2025-01-01'::DATE, '2025-03-01'::DATE);
END $$;

-- Limpar a função após o uso
DROP FUNCTION IF EXISTS generate_metrics_data(DATE, DATE); 