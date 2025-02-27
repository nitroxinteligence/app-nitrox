-- Criar uma versão mais robusta da função de resumo diário
CREATE OR REPLACE FUNCTION get_daily_openai_usage_summary()
RETURNS TABLE (
  total_calls INTEGER,
  total_requests INTEGER,
  total_cost NUMERIC,
  total_tokens INTEGER,
  update_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  summary_exists BOOLEAN;
BEGIN
  -- Verificar se já existe um resumo para hoje
  SELECT EXISTS (
    SELECT 1 FROM openai_daily_summary 
    WHERE date = CURRENT_DATE
  ) INTO summary_exists;
  
  -- Se não existir, criar um resumo
  IF NOT summary_exists THEN
    PERFORM update_openai_daily_summary();
  END IF;
  
  -- Retornar os dados do resumo
  RETURN QUERY 
  SELECT 
    COALESCE(s.total_calls, 0)::INTEGER,
    COALESCE(s.total_requests, 0)::INTEGER,
    COALESCE(s.total_cost, 0)::NUMERIC,
    COALESCE(s.total_tokens, 0)::INTEGER,
    COALESCE(s.updated_at, NOW())
  FROM 
    openai_daily_summary s
  WHERE 
    s.date = CURRENT_DATE;
    
  -- Se ainda não tiver resultados, retornar um registro vazio
  IF NOT FOUND THEN
    -- Buscar diretamente da tabela openai_usage como fallback
    RETURN QUERY 
    SELECT 
      COUNT(*)::INTEGER AS total_calls,
      COUNT(DISTINCT request_id)::INTEGER AS total_requests,
      COALESCE(SUM(estimated_cost), 0)::NUMERIC AS total_cost,
      COALESCE(SUM(total_tokens), 0)::INTEGER AS total_tokens,
      NOW() AS update_date
    FROM 
      openai_usage
    WHERE 
      DATE(timestamp) = CURRENT_DATE;
      
    -- Se ainda não tiver resultados, retornar zeros
    IF NOT FOUND THEN
      RETURN QUERY SELECT 
        0::INTEGER, 
        0::INTEGER, 
        0::NUMERIC, 
        0::INTEGER, 
        NOW()::TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql; 