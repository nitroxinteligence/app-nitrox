-- Script SQL para verificar e corrigir a estrutura da tabela openai_usage
-- Execute este script no Editor SQL do Supabase

-- 1. Primeiro vamos verificar se a tabela existe
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'A tabela openai_usage já existe.';
    ELSE
        RAISE NOTICE 'A tabela openai_usage não existe. Criando a tabela...';
        
        -- Criar a tabela se não existir
        CREATE TABLE openai_usage (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workflow_id TEXT NOT NULL,
            workflow_name TEXT,
            execution_id TEXT,
            node_id TEXT,
            node_name TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER NOT NULL DEFAULT 0,
            completion_tokens INTEGER NOT NULL DEFAULT 0,
            total_tokens INTEGER NOT NULL DEFAULT 0,
            estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_estimated BOOLEAN DEFAULT FALSE,
            metadata JSONB
        );
        
        -- Criar índices para melhorar a performance
        CREATE INDEX idx_openai_usage_workflow_id ON openai_usage(workflow_id);
        CREATE INDEX idx_openai_usage_execution_id ON openai_usage(execution_id);
        CREATE INDEX idx_openai_usage_timestamp ON openai_usage(timestamp);
        CREATE INDEX idx_openai_usage_model ON openai_usage(model);
        
        RAISE NOTICE 'Tabela openai_usage criada com sucesso!';
    END IF;
END $$;

-- 2. Se a tabela já existe, verificar sua estrutura e adicionar colunas faltantes
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Verificar e adicionar coluna execution_id se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'execution_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna execution_id...';
        ALTER TABLE openai_usage ADD COLUMN execution_id TEXT;
    END IF;
    
    -- Verificar e adicionar coluna node_id se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'node_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna node_id...';
        ALTER TABLE openai_usage ADD COLUMN node_id TEXT;
    END IF;
    
    -- Verificar e adicionar coluna prompt_tokens se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'prompt_tokens'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna prompt_tokens...';
        
        -- Verificar se existe a coluna tokens_prompt (nome antigo)
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'openai_usage'
            AND column_name = 'tokens_prompt'
        ) INTO column_exists;
        
        IF column_exists THEN
            -- Renomear coluna antiga
            ALTER TABLE openai_usage RENAME COLUMN tokens_prompt TO prompt_tokens;
            RAISE NOTICE 'Coluna tokens_prompt renomeada para prompt_tokens';
        ELSE
            -- Criar nova coluna
            ALTER TABLE openai_usage ADD COLUMN prompt_tokens INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;
    
    -- Verificar e adicionar coluna completion_tokens se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'completion_tokens'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna completion_tokens...';
        
        -- Verificar se existe a coluna tokens_completion (nome antigo)
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'openai_usage'
            AND column_name = 'tokens_completion'
        ) INTO column_exists;
        
        IF column_exists THEN
            -- Renomear coluna antiga
            ALTER TABLE openai_usage RENAME COLUMN tokens_completion TO completion_tokens;
            RAISE NOTICE 'Coluna tokens_completion renomeada para completion_tokens';
        ELSE
            -- Criar nova coluna
            ALTER TABLE openai_usage ADD COLUMN completion_tokens INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;
    
    -- Verificar e adicionar coluna total_tokens se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'total_tokens'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna total_tokens...';
        
        -- Verificar se existe a coluna tokens_total (nome antigo)
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'openai_usage'
            AND column_name = 'tokens_total'
        ) INTO column_exists;
        
        IF column_exists THEN
            -- Renomear coluna antiga
            ALTER TABLE openai_usage RENAME COLUMN tokens_total TO total_tokens;
            RAISE NOTICE 'Coluna tokens_total renomeada para total_tokens';
        ELSE
            -- Criar nova coluna
            ALTER TABLE openai_usage ADD COLUMN total_tokens INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;
    
    -- Verificar e adicionar coluna estimated_cost se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'estimated_cost'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna estimated_cost...';
        
        -- Verificar se existe a coluna cost_usd (nome antigo)
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'openai_usage'
            AND column_name = 'cost_usd'
        ) INTO column_exists;
        
        IF column_exists THEN
            -- Renomear coluna antiga
            ALTER TABLE openai_usage RENAME COLUMN cost_usd TO estimated_cost;
            RAISE NOTICE 'Coluna cost_usd renomeada para estimated_cost';
        ELSE
            -- Criar nova coluna
            ALTER TABLE openai_usage ADD COLUMN estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0;
        END IF;
    END IF;
    
    -- Verificar e adicionar coluna metadata se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'metadata'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna metadata...';
        ALTER TABLE openai_usage ADD COLUMN metadata JSONB;
    END IF;
    
    -- Verificar e adicionar coluna is_estimated se não existir
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'openai_usage'
        AND column_name = 'is_estimated'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adicionando coluna is_estimated...';
        ALTER TABLE openai_usage ADD COLUMN is_estimated BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Verificar a estrutura final da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'openai_usage' 
ORDER BY ordinal_position;

-- 4. Mostrar os índices na tabela
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'openai_usage'
ORDER BY
    indexname;

-- 5. Contar registros na tabela
SELECT COUNT(*) AS total_registros FROM openai_usage; 