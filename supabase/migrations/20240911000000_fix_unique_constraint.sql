-- Migração para adicionar a restrição UNIQUE na tabela openai_completions_usage

-- 1. Verificar se a restrição já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'openai_completions_usage_date_model_key' 
        AND conrelid = 'openai_completions_usage'::regclass
    ) THEN
        -- Adicionar a restrição UNIQUE se não existir
        ALTER TABLE openai_completions_usage 
        ADD CONSTRAINT openai_completions_usage_date_model_key UNIQUE (date, model);
        
        RAISE NOTICE 'Restrição UNIQUE adicionada nas colunas date e model.';
    ELSE
        RAISE NOTICE 'Restrição UNIQUE já existe nas colunas date e model.';
    END IF;
END $$; 