-- Script de correção para problemas de monitoramento OpenAI
-- Este script corrige os problemas de individualização de dados por workflow e ajusta os modelos da OpenAI

-- 1. Criar ou atualizar a função para individualizar dados por workflow na tabela openai_daily_summary
CREATE OR REPLACE FUNCTION update_openai_daily_summary() 
RETURNS void AS $$
DECLARE
    current_date date := current_date;
BEGIN
    -- Limpar dados existentes para o dia atual para evitar duplicidade
    DELETE FROM openai_daily_summary WHERE date = current_date;
    
    -- Inserir resumo geral para o dia atual
    INSERT INTO openai_daily_summary (
        date, 
        total_tokens, 
        total_cost, 
        total_requests,
        total_calls,
        updated_at
    )
    SELECT 
        current_date,
        COALESCE(SUM(total_tokens), 0),
        COALESCE(SUM(estimated_cost::numeric), 0),
        COUNT(DISTINCT request_id),
        COUNT(*),
        NOW()
    FROM 
        openai_usage
    WHERE 
        DATE(timestamp) = current_date;
    
    -- Criar tabela temporária para armazenar resumos por workflow
    DROP TABLE IF EXISTS temp_workflow_summary;
    CREATE TEMP TABLE temp_workflow_summary AS
    SELECT 
        current_date as date,
        workflow_id,
        workflow_name,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(estimated_cost::numeric), 0) as total_cost,
        COUNT(DISTINCT request_id) as total_requests,
        COUNT(*) as total_calls,
        STRING_AGG(DISTINCT model, ', ') as models_used
    FROM 
        openai_usage
    WHERE 
        DATE(timestamp) = current_date AND
        workflow_id IS NOT NULL
    GROUP BY 
        workflow_id, workflow_name;
    
    -- Inserir ou atualizar as informações de workflow na tabela de workflow_daily_summary (se existir)
    -- Se a tabela não existir, você precisará criá-la primeiro
    BEGIN
        -- Tentar atualizar dados na tabela de resumo por workflow se ela existir
        DELETE FROM workflow_daily_summary WHERE date = current_date;
        
        INSERT INTO workflow_daily_summary (
            date,
            workflow_id,
            workflow_name,
            total_tokens,
            total_cost,
            total_requests,
            total_calls,
            models_used,
            updated_at
        )
        SELECT 
            date,
            workflow_id,
            workflow_name,
            total_tokens,
            total_cost,
            total_requests,
            total_calls,
            models_used,
            NOW()
        FROM 
            temp_workflow_summary;
    EXCEPTION
        WHEN undefined_table THEN
            -- Se a tabela não existe, criá-la primeiro
            CREATE TABLE workflow_daily_summary (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                workflow_id TEXT NOT NULL,
                workflow_name TEXT NOT NULL,
                total_tokens BIGINT NOT NULL DEFAULT 0,
                total_cost DECIMAL(12,6) NOT NULL DEFAULT 0,
                total_requests INTEGER NOT NULL DEFAULT 0,
                total_calls INTEGER NOT NULL DEFAULT 0,
                models_used TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(date, workflow_id)
            );
            
            -- Inserir dados na tabela recém-criada
            INSERT INTO workflow_daily_summary (
                date,
                workflow_id,
                workflow_name,
                total_tokens,
                total_cost,
                total_requests,
                total_calls,
                models_used,
                updated_at
            )
            SELECT 
                date,
                workflow_id,
                workflow_name,
                total_tokens,
                total_cost,
                total_requests,
                total_calls,
                models_used,
                NOW()
            FROM 
                temp_workflow_summary;
    END;
    
    RAISE NOTICE 'Resumo diário de uso da OpenAI atualizado com sucesso!';
END;
$$ LANGUAGE plpgsql;

-- 2. Criar ou atualizar a função para corrigir os modelos da OpenAI
CREATE OR REPLACE FUNCTION map_to_correct_model(input_model TEXT) 
RETURNS TEXT AS $$
BEGIN
    -- Mapear os modelos incorretos para os corretos
    CASE 
        WHEN input_model ILIKE 'gpt-4%turbo%' THEN
            RETURN 'gpt-4o';
        WHEN input_model ILIKE 'gpt-3.5%turbo%' THEN
            RETURN 'gpt-4o-mini';
        WHEN input_model ILIKE '%vision%' OR input_model ILIKE '%dall%' THEN
            RETURN 'gpt-4-vision';
        ELSE
            RETURN input_model;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 3. Aplicar correção aos modelos existentes
UPDATE openai_usage
SET model = map_to_correct_model(model),
    "Model" = map_to_correct_model("Model")
WHERE 
    model ILIKE 'gpt-4%turbo%' OR
    model ILIKE 'gpt-3.5%turbo%' OR
    model ILIKE '%vision%' OR
    model ILIKE '%dall%';

-- 4. Atualizar custos para os modelos corrigidos
-- GPT-4o custa aproximadamente $0.01 por 1K tokens para prompt e $0.03 por 1K tokens para completion
UPDATE openai_usage
SET estimated_cost = (
    -- Custo para prompt tokens: $0.01 por 1K tokens
    (COALESCE(prompt_tokens, 0) * 0.01 / 1000) +
    -- Custo para completion tokens: $0.03 por 1K tokens
    (COALESCE(completion_tokens, 0) * 0.03 / 1000)
)
WHERE model = 'gpt-4o';

-- GPT-4o-mini custa aproximadamente $0.0015 por 1K tokens para prompt e $0.002 por 1K tokens para completion
UPDATE openai_usage
SET estimated_cost = (
    -- Custo para prompt tokens: $0.0015 por 1K tokens
    (COALESCE(prompt_tokens, 0) * 0.0015 / 1000) +
    -- Custo para completion tokens: $0.002 por 1K tokens
    (COALESCE(completion_tokens, 0) * 0.002 / 1000)
)
WHERE model = 'gpt-4o-mini';

-- GPT-4-vision custa aproximadamente $0.01 por 1K tokens para prompt e $0.03 por 1K tokens para completion
UPDATE openai_usage
SET estimated_cost = (
    -- Custo para prompt tokens: $0.01 por 1K tokens
    (COALESCE(prompt_tokens, 0) * 0.01 / 1000) +
    -- Custo para completion tokens: $0.03 por 1K tokens
    (COALESCE(completion_tokens, 0) * 0.03 / 1000)
)
WHERE model = 'gpt-4-vision';

-- 5. Atualizar o resumo diário com os dados corrigidos
SELECT update_openai_daily_summary();

-- 6. Verificar os resultados
-- Verificar os modelos agora utilizados
SELECT 
    model, 
    COUNT(*) as registros,
    SUM(total_tokens) as tokens_totais,
    SUM(estimated_cost::numeric) as custo_total
FROM 
    openai_usage
GROUP BY 
    model
ORDER BY 
    custo_total DESC;

-- Verificar os resumos por workflow para o dia atual
SELECT * FROM workflow_daily_summary WHERE date = current_date ORDER BY total_cost DESC;

-- Verificar o resumo geral do dia
SELECT * FROM openai_daily_summary WHERE date = current_date; 