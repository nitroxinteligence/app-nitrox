-- Script para atualizar e corrigir custos por modelo na tabela openai_usage
-- Executar este script no SQL Editor do Supabase para corrigir custos

-- 1. Primeiro, verificar e atualizar custos de registros existentes para garantir consistência
DO $$
DECLARE
    gpt4_count INTEGER;
    gpt35_count INTEGER;
BEGIN
    -- Verificar quantos registros de cada modelo temos
    SELECT COUNT(*) INTO gpt4_count FROM openai_usage WHERE model LIKE 'gpt-4%';
    SELECT COUNT(*) INTO gpt35_count FROM openai_usage WHERE model LIKE 'gpt-3.5%';
    
    RAISE NOTICE 'Registros encontrados: GPT-4: %, GPT-3.5: %', gpt4_count, gpt35_count;
    
    -- Atualizar custos do GPT-4 para garantir que reflitam corretamente o modelo
    -- GPT-4 custa aproximadamente 15x mais que o GPT-3.5
    UPDATE openai_usage
    SET estimated_cost = (
        -- Custo para prompt tokens: $0.01 por 1K tokens
        (COALESCE(prompt_tokens, 0) * 0.01 / 1000) +
        -- Custo para completion tokens: $0.03 por 1K tokens
        (COALESCE(completion_tokens, 0) * 0.03 / 1000)
    )
    WHERE model LIKE 'gpt-4%';
    
    -- Atualizar custos do GPT-3.5-turbo para garantir consistência
    UPDATE openai_usage
    SET estimated_cost = (
        -- Custo para prompt tokens: $0.0015 por 1K tokens
        (COALESCE(prompt_tokens, 0) * 0.0015 / 1000) +
        -- Custo para completion tokens: $0.002 por 1K tokens
        (COALESCE(completion_tokens, 0) * 0.002 / 1000)
    )
    WHERE model LIKE 'gpt-3.5%';
    
    RAISE NOTICE 'Custos atualizados para todos os registros existentes';
END;
$$;

-- 2. Verificar se precisamos adicionar dados de teste
DO $$
DECLARE
    workflow_count INTEGER;
BEGIN
    -- Limpar dados de teste anteriores para garantir que os novos dados sejam corretamente aplicados
    DELETE FROM openai_usage WHERE workflow_id IN ('wf_sistema_fups', 'wf_maria_clara') AND request_id LIKE 'test_%';
    
    RAISE NOTICE 'Dados de teste anteriores removidos, inserindo novos dados com valores distintos';
    
    -- Inserir registros de teste para o Workflow 1: Sistema de FUPs e Lembretes (usando GPT-3.5 com MENOS tokens)
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
    (NOW() - INTERVAL '6 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 120, 60, 180, 0.00033, 'test_fups_1', '["agent", "AI Agent"]'::jsonb),
    (NOW() - INTERVAL '5 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 150, 70, 220, 0.00040, 'test_fups_2', '["agent", "OpenAI Chat Model"]'::jsonb),
    (NOW() - INTERVAL '4 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 130, 65, 195, 0.00036, 'test_fups_3', '["agent", "AI Agent"]'::jsonb),
    (NOW() - INTERVAL '2 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 100, 50, 150, 0.00028, 'test_fups_4', '["agent", "OpenAI"]'::jsonb),
    (NOW() - INTERVAL '1 hour', 'wf_sistema_fups', '🟢📅 Sistema de FUPs e Lembretes', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 110, 55, 165, 0.00030, 'test_fups_5', '["agent", "OpenAI Chat Model"]'::jsonb);
    
    -- Inserir registros de teste para o Workflow 2: Maria Clara AI - Central (usando GPT-4 com MAIS tokens)
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
    (NOW() - INTERVAL '7 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 800, 400, 1200, 0.020, 'test_maria_1', '["agent", "AI Agent"]'::jsonb),
    (NOW() - INTERVAL '6 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 1000, 500, 1500, 0.025, 'test_maria_2', '["agent", "OpenAI"]'::jsonb),
    (NOW() - INTERVAL '5 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 1200, 600, 1800, 0.030, 'test_maria_3', '["agent", "OpenAI Chat Model"]'::jsonb),
    (NOW() - INTERVAL '3 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 950, 450, 1400, 0.0235, 'test_maria_4', '["agent", "AI Agent"]'::jsonb),
    (NOW() - INTERVAL '1 hour', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 1100, 550, 1650, 0.0275, 'test_maria_5', '["agent", "OpenAI"]'::jsonb),
    (NOW() - INTERVAL '30 minute', 'wf_maria_clara', '🟢🤖 Maria Clara AI - Central V.2 (+CloudIA)', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 900, 450, 1350, 0.0225, 'test_maria_6', '["agent", "OpenAI Chat Model"]'::jsonb);
    
    RAISE NOTICE 'Dados de teste inseridos com valores distintos: GPT-3.5 para Sistema FUPs (menos tokens) e GPT-4 para Maria Clara (mais tokens)';
    
    -- Atualizar o resumo diário após inserir novos dados
    PERFORM update_openai_daily_summary();
    RAISE NOTICE 'Resumo diário atualizado com os novos dados';
END;
$$;

-- 3. Verificar custos por modelo para confirmar diferenças corretas
SELECT 
    model, 
    COUNT(*) as registros,
    SUM(total_tokens) as tokens_totais,
    SUM(estimated_cost) as custo_total,
    CASE 
        WHEN SUM(total_tokens) > 0 
        THEN (SUM(estimated_cost)/SUM(total_tokens))*1000 
        ELSE 0 
    END as custo_por_1k_tokens
FROM 
    openai_usage
GROUP BY 
    model
ORDER BY 
    custo_total DESC;

-- 4. Verificar workflows diferentes e seus custos
SELECT 
    workflow_id,
    workflow_name,
    STRING_AGG(DISTINCT model, ', ') as modelos,
    COUNT(*) as registros,
    SUM(total_tokens) as tokens_totais,
    SUM(estimated_cost) as custo_total,
    CASE 
        WHEN SUM(total_tokens) > 0 
        THEN (SUM(estimated_cost)/SUM(total_tokens))*1000 
        ELSE 0 
    END as custo_por_1k_tokens
FROM 
    openai_usage
GROUP BY 
    workflow_id, workflow_name
ORDER BY 
    custo_total DESC;

-- 5. Verificar especificamente os custos dos nodes N8N mencionados
SELECT 
    json_array_elements_text(tags) as node_type,
    COUNT(*) as total_calls,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    CASE 
        WHEN SUM(total_tokens) > 0 
        THEN (SUM(estimated_cost)/SUM(total_tokens))*1000 
        ELSE 0 
    END as cost_per_1k
FROM 
    openai_usage
WHERE 
    tags::text LIKE '%AI Agent%' OR 
    tags::text LIKE '%OpenAI Chat Model%' OR 
    tags::text LIKE '%OpenAI%'
GROUP BY 
    node_type
ORDER BY 
    total_cost DESC; 