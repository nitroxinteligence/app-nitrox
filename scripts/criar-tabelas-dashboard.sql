-- Script para criar tabelas de resumo e funções para o dashboard
-- Este script cria as tabelas necessárias para exibir resumos diários de uso do OpenAI
-- e funções para calcular esses resumos a partir dos dados brutos.

-- 1. Criar tabela de resumo diário de uso do OpenAI
CREATE TABLE IF NOT EXISTS openai_daily_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_calls INTEGER NOT NULL DEFAULT 0,
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    update_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para melhorar performance de consultas por data
CREATE INDEX IF NOT EXISTS idx_openai_daily_summary_date ON openai_daily_summary(date);

-- 2. Criar tabela de resumo diário por workflow
CREATE TABLE IF NOT EXISTS workflow_daily_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    total_calls INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    update_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, workflow_id) -- Garante apenas um registro por workflow por dia
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_workflow_daily_summary_date ON workflow_daily_summary(date);
CREATE INDEX IF NOT EXISTS idx_workflow_daily_summary_workflow_id ON workflow_daily_summary(workflow_id);

-- 3. Adicionar coluna request_id à tabela openai_usage se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'openai_usage' 
        AND column_name = 'request_id'
    ) THEN
        ALTER TABLE openai_usage ADD COLUMN request_id TEXT;
        RAISE NOTICE 'Coluna request_id adicionada à tabela openai_usage';
    ELSE
        RAISE NOTICE 'Coluna request_id já existe na tabela openai_usage';
    END IF;
    
    -- Adicionar coluna tags se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'openai_usage' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE openai_usage ADD COLUMN tags JSONB;
        RAISE NOTICE 'Coluna tags adicionada à tabela openai_usage';
    ELSE
        RAISE NOTICE 'Coluna tags já existe na tabela openai_usage';
    END IF;
END $$;

-- 4. Criar função para calcular o resumo diário de uso do OpenAI
CREATE OR REPLACE FUNCTION get_daily_openai_usage_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_calls INTEGER,
    total_requests INTEGER,
    total_tokens INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost DECIMAL(10, 6),
    update_date TIMESTAMPTZ
) AS $$
BEGIN
    -- Verificar se existe um resumo para a data especificada
    IF EXISTS (SELECT 1 FROM openai_daily_summary WHERE date = target_date) THEN
        -- Retornar o resumo existente
        RETURN QUERY
        SELECT 
            ods.total_calls,
            ods.total_requests,
            ods.total_tokens,
            ods.prompt_tokens,
            ods.completion_tokens,
            ods.total_cost,
            ods.update_date
        FROM 
            openai_daily_summary ods
        WHERE 
            ods.date = target_date;
    ELSE
        -- Calcular resumo a partir dos dados brutos
        RETURN QUERY
        WITH summary AS (
            SELECT
                COUNT(*) AS total_calls,
                COUNT(DISTINCT workflow_id) AS total_requests,
                SUM(total_tokens) AS total_tokens,
                SUM(prompt_tokens) AS prompt_tokens,
                SUM(completion_tokens) AS completion_tokens,
                SUM(estimated_cost) AS total_cost,
                NOW() AS update_date
            FROM
                openai_usage
            WHERE
                DATE(timestamp) = target_date
        )
        SELECT
            COALESCE(total_calls, 0) AS total_calls,
            COALESCE(total_requests, 0) AS total_requests,
            COALESCE(total_tokens, 0) AS total_tokens,
            COALESCE(prompt_tokens, 0) AS prompt_tokens,
            COALESCE(completion_tokens, 0) AS completion_tokens,
            COALESCE(total_cost, 0) AS total_cost,
            update_date
        FROM
            summary;
            
        -- Opcional: Salvar o resultado na tabela de resumo para futuras consultas
        -- (Comentado por enquanto, descomente se necessário)
        /*
        INSERT INTO openai_daily_summary (
            date, 
            total_calls, 
            total_requests, 
            total_tokens,
            prompt_tokens,
            completion_tokens,
            total_cost
        )
        SELECT
            target_date,
            s.total_calls,
            s.total_requests,
            s.total_tokens,
            s.prompt_tokens,
            s.completion_tokens,
            s.total_cost
        FROM get_daily_openai_usage_summary(target_date) s
        ON CONFLICT (date) DO UPDATE SET
            total_calls = EXCLUDED.total_calls,
            total_requests = EXCLUDED.total_requests,
            total_tokens = EXCLUDED.total_tokens,
            prompt_tokens = EXCLUDED.prompt_tokens,
            completion_tokens = EXCLUDED.completion_tokens,
            total_cost = EXCLUDED.total_cost,
            update_date = NOW();
        */
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar procedimento para atualizar resumos diários
CREATE OR REPLACE PROCEDURE update_daily_summaries(days_lookback INTEGER DEFAULT 30)
AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    target_date DATE;
    day_counter INTEGER;
BEGIN
    -- Loop pelos últimos N dias
    FOR day_counter IN 0..days_lookback LOOP
        target_date := current_date - day_counter * INTERVAL '1 day';
        
        -- Inserir ou atualizar o resumo diário geral
        INSERT INTO openai_daily_summary (
            date, 
            total_calls, 
            total_requests, 
            total_tokens,
            prompt_tokens,
            completion_tokens,
            total_cost,
            update_date
        )
        SELECT
            target_date,
            COALESCE(COUNT(*), 0),
            COALESCE(COUNT(DISTINCT workflow_id), 0),
            COALESCE(SUM(total_tokens), 0),
            COALESCE(SUM(prompt_tokens), 0),
            COALESCE(SUM(completion_tokens), 0),
            COALESCE(SUM(estimated_cost), 0),
            NOW()
        FROM
            openai_usage
        WHERE
            DATE(timestamp) = target_date
        ON CONFLICT (date) DO UPDATE SET
            total_calls = EXCLUDED.total_calls,
            total_requests = EXCLUDED.total_requests,
            total_tokens = EXCLUDED.total_tokens,
            prompt_tokens = EXCLUDED.prompt_tokens,
            completion_tokens = EXCLUDED.completion_tokens,
            total_cost = EXCLUDED.total_cost,
            update_date = NOW();
        
        -- Inserir ou atualizar resumos por workflow
        -- Primeiro, encontre todos os workflows que têm dados para esta data
        WITH workflows AS (
            SELECT DISTINCT workflow_id
            FROM openai_usage
            WHERE DATE(timestamp) = target_date
        )
        INSERT INTO workflow_daily_summary (
            date,
            workflow_id,
            workflow_name,
            total_calls,
            total_tokens,
            total_cost,
            update_date
        )
        SELECT
            target_date,
            u.workflow_id,
            COALESCE(MAX(u.workflow_name), 'Unknown Workflow'), -- Pega o nome mais recente do workflow
            COALESCE(COUNT(*), 0),
            COALESCE(SUM(u.total_tokens), 0),
            COALESCE(SUM(u.estimated_cost), 0),
            NOW()
        FROM
            workflows w
        LEFT JOIN
            openai_usage u ON w.workflow_id = u.workflow_id AND DATE(u.timestamp) = target_date
        GROUP BY
            u.workflow_id
        HAVING
            u.workflow_id IS NOT NULL
        ON CONFLICT (date, workflow_id) DO UPDATE SET
            workflow_name = EXCLUDED.workflow_name,
            total_calls = EXCLUDED.total_calls,
            total_tokens = EXCLUDED.total_tokens,
            total_cost = EXCLUDED.total_cost,
            update_date = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar gatilho para atualizar resumos automaticamente
CREATE OR REPLACE FUNCTION trigger_update_summaries() RETURNS TRIGGER AS $$
BEGIN
    -- Chamamos o procedimento apenas para o dia atual
    CALL update_daily_summaries(0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o gatilho na tabela openai_usage
DROP TRIGGER IF EXISTS trigger_update_openai_summaries ON openai_usage;
CREATE TRIGGER trigger_update_openai_summaries
AFTER INSERT OR UPDATE ON openai_usage
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_update_summaries();

-- 7. Atualizar resumos para os últimos 30 dias
CALL update_daily_summaries(30);

-- Exibir estrutura das tabelas criadas
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('openai_daily_summary', 'workflow_daily_summary')
ORDER BY table_name, ordinal_position;

-- Exibir funções criadas
SELECT 
    routine_name,
    routine_type
FROM 
    information_schema.routines 
WHERE 
    routine_schema = 'public'
    AND routine_name IN ('get_daily_openai_usage_summary', 'trigger_update_summaries')
ORDER BY 
    routine_name; 