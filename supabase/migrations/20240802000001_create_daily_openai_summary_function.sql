-- Função para calcular o resumo diário de uso da OpenAI
CREATE OR REPLACE FUNCTION get_daily_openai_usage_summary()
RETURNS TABLE (
  total_calls INTEGER,
  total_requests INTEGER,
  total_cost NUMERIC,
  total_tokens INTEGER,
  update_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY 
  WITH daily_totals AS (
    SELECT 
      COUNT(*) AS total_calls,
      SUM(CASE WHEN request_id IS NOT NULL THEN 1 ELSE 0 END) AS total_requests,
      COALESCE(SUM(estimated_cost), 0) AS total_cost,
      COALESCE(SUM(total_tokens), 0) AS total_tokens,
      MAX("timestamp") AS update_date
    FROM 
      openai_usage
    WHERE 
      "timestamp" >= CURRENT_DATE - INTERVAL '1 day'
  )
  SELECT 
    total_calls::INTEGER,
    total_requests::INTEGER,
    total_cost::NUMERIC,
    total_tokens::INTEGER,
    update_date
  FROM 
    daily_totals;
END;
$$ LANGUAGE plpgsql; 