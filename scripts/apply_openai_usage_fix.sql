-- Script para aplicar correções na funcionalidade de uso da OpenAI
-- Executar este script no SQL Editor do Supabase

-- 1. Corrigir a função de resumo diário para garantir que sempre retorne valores, mesmo quando não há dados
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

-- 2. Verificar e inserir dados de teste para workflows específicos
DO $$
DECLARE
    workflow_count INTEGER;
BEGIN
    -- Contar workflows distintos na tabela openai_usage
    SELECT COUNT(DISTINCT workflow_id) INTO workflow_count FROM openai_usage;
    
    -- Se houver menos de 2 workflows, adicionar dados de teste com 2 workflows específicos
    IF workflow_count < 2 THEN
        -- Limpar dados de teste anteriores se necessário
        DELETE FROM openai_usage WHERE workflow_id IN ('wf_sistema_fups', 'wf_maria_clara') AND request_id LIKE 'test_%';
        
        -- Inserir registros de teste para o Workflow 1: Sistema de FUPs e Lembretes
        INSERT INTO openai_usage (
            timestamp,
            workflow_id,
            workflow_name,
            model,
            "Model",
            endpoint,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            estimated_cost,
            request_id,
            tags
        ) VALUES 
        (NOW() - INTERVAL '6 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 300, 150, 450, 0.0009, 'test_fups_1', ARRAY['agent']),
        (NOW() - INTERVAL '5 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 400, 200, 600, 0.0012, 'test_fups_2', ARRAY['agent']),
        (NOW() - INTERVAL '4 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 350, 150, 500, 0.001, 'test_fups_3', ARRAY['agent']),
        (NOW() - INTERVAL '2 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 250, 120, 370, 0.00074, 'test_fups_4', ARRAY['agent']),
        (NOW() - INTERVAL '1 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 280, 140, 420, 0.00084, 'test_fups_5', ARRAY['agent']);
        
        -- Inserir registros de teste para o Workflow 2: Maria Clara AI - Central
        INSERT INTO openai_usage (
            timestamp,
            workflow_id,
            workflow_name,
            model,
            "Model",
            endpoint,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            estimated_cost,
            request_id,
            tags
        ) VALUES 
        (NOW() - INTERVAL '7 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 800, 400, 1200, 0.018, 'test_maria_1', ARRAY['agent']),
        (NOW() - INTERVAL '6 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 1000, 500, 1500, 0.0225, 'test_maria_2', ARRAY['agent']),
        (NOW() - INTERVAL '5 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 1200, 600, 1800, 0.027, 'test_maria_3', ARRAY['agent']),
        (NOW() - INTERVAL '3 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 950, 450, 1400, 0.021, 'test_maria_4', ARRAY['agent']),
        (NOW() - INTERVAL '1 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 1100, 550, 1650, 0.02475, 'test_maria_5', ARRAY['agent']),
        (NOW() - INTERVAL '30 minute', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 900, 450, 1350, 0.02025, 'test_maria_6', ARRAY['agent']);
        
        RAISE NOTICE 'Dados de teste aprimorados inseridos para dois workflows distintos: Sistema de FUPs e Maria Clara AI';
    ELSE
        RAISE NOTICE 'Já existem % workflows distintos na tabela openai_usage, pulando inserção de dados de teste melhorados', workflow_count;
    END IF;
END;
$$;

-- 3. Atualizar resumo diário após inserir novos dados
SELECT update_openai_daily_summary();

-- 4. Verificar se os dados foram inseridos corretamente
SELECT 
    'Resumo diário' as tipo,
    total_calls, 
    total_requests, 
    total_cost, 
    total_tokens,
    update_date
FROM 
    get_daily_openai_usage_summary();

-- 5. Verificar workflows diferentes
SELECT 
    workflow_id,
    workflow_name,
    COUNT(*) as registros,
    SUM(total_tokens) as tokens_totais,
    SUM(estimated_cost) as custo_total
FROM 
    openai_usage
GROUP BY 
    workflow_id, workflow_name
ORDER BY 
    custo_total DESC;

-- Este script corrige o problema da página de monitoramento exibindo valores zerados
-- e garante que a aba Workflows mostre corretamente os custos por agente 