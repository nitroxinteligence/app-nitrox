-- Verificar se existem workflows na tabela openai_usage
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
        
        -- Agora atualizar o resumo diário
        PERFORM update_openai_daily_summary();
        
        RAISE NOTICE 'Dados de teste aprimorados inseridos para dois workflows distintos: Sistema de FUPs e Maria Clara AI';
    ELSE
        RAISE NOTICE 'Já existem % workflows distintos na tabela openai_usage, pulando inserção de dados de teste melhorados', workflow_count;
    END IF;
END;
$$; 