-- Verificar se existem dados na tabela openai_usage
DO $$
DECLARE
    record_count INTEGER;
    current_date_var DATE := CURRENT_DATE;
BEGIN
    -- Obter contagem de registros na tabela openai_usage
    SELECT COUNT(*) INTO record_count FROM openai_usage;
    
    -- Se não houver registros, inserir alguns dados de teste
    IF record_count = 0 THEN
        -- Inserir registros de teste para o dia atual
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
            request_id
        ) VALUES 
        (current_date_var + '10:00:00'::TIME, 'wf_1', 'Workflow Teste 1', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 500, 300, 800, 0.012, 'req_1'),
        (current_date_var + '11:30:00'::TIME, 'wf_1', 'Workflow Teste 1', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 800, 400, 1200, 0.018, 'req_2'),
        (current_date_var + '14:15:00'::TIME, 'wf_2', 'Workflow Teste 2', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 1000, 500, 1500, 0.003, 'req_3'),
        (current_date_var + '16:45:00'::TIME, 'wf_2', 'Workflow Teste 2', 'gpt-3.5-turbo', 'gpt-3.5-turbo', 'chat', 1200, 600, 1800, 0.0036, 'req_4'),
        (current_date_var + '18:20:00'::TIME, 'wf_3', 'Workflow Teste 3', 'gpt-4-turbo', 'gpt-4-turbo', 'chat', 1500, 700, 2200, 0.033, 'req_5');
        
        RAISE NOTICE 'Inseridos 5 registros de teste para o dia atual';
        
        -- Agora atualizar o resumo diário
        PERFORM update_openai_daily_summary();
        
        RAISE NOTICE 'Resumo diário atualizado com dados de teste';
    ELSE
        RAISE NOTICE 'Já existem % registros na tabela openai_usage, pulando inserção de dados de teste', record_count;
    END IF;
END;
$$; 