-- Preencher inicialmente a tabela de resumo diário com dados históricos
DO $$
DECLARE
    current_date_var DATE := CURRENT_DATE;
    past_days INTEGER := 30; -- Últimos 30 dias
    i INTEGER;
    date_to_process DATE;
BEGIN
    -- Processar os últimos N dias
    FOR i IN 0..past_days LOOP
        date_to_process := current_date_var - (i * INTERVAL '1 day');
        
        -- Inserir ou atualizar o resumo para a data
        INSERT INTO openai_daily_summary (
            date,
            total_calls,
            total_requests,
            total_cost,
            total_tokens,
            updated_at
        )
        SELECT
            date_to_process,
            COUNT(*),
            COUNT(DISTINCT request_id),
            COALESCE(SUM(estimated_cost), 0),
            COALESCE(SUM(total_tokens), 0),
            now()
        FROM
            openai_usage
        WHERE
            DATE("timestamp") = date_to_process
        ON CONFLICT (date)
        DO UPDATE SET
            total_calls = EXCLUDED.total_calls,
            total_requests = EXCLUDED.total_requests,
            total_cost = EXCLUDED.total_cost,
            total_tokens = EXCLUDED.total_tokens,
            updated_at = EXCLUDED.updated_at;
    END LOOP;
    
    RAISE NOTICE 'Dados históricos dos últimos % dias foram carregados na tabela de resumo diário', past_days;
END;
$$; 