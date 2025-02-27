-- Schema para rastreamento de uso da OpenAI
-- Execute este SQL no Supabase para criar as tabelas necessárias

-- Tabela principal para armazenar cada registro de uso da OpenAI
CREATE TABLE public.openai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    workflow_id TEXT NOT NULL,
    workflow_name TEXT,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL, -- completions, chat, embeddings, etc.
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    user_id UUID, -- opcional, se quiser rastrear por usuário
    request_id TEXT, -- ID único da solicitação
    tags TEXT[], -- tags do workflow
    metadata JSONB -- metadados adicionais, como parâmetros
);

-- Índices para consultas rápidas
CREATE INDEX idx_openai_usage_timestamp ON public.openai_usage(timestamp);
CREATE INDEX idx_openai_usage_workflow_id ON public.openai_usage(workflow_id);
CREATE INDEX idx_openai_usage_model ON public.openai_usage(model);
CREATE INDEX idx_openai_usage_user_id ON public.openai_usage(user_id);

-- Tabela para armazenar resumos diários (para análises rápidas)
CREATE TABLE public.openai_usage_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    workflow_id TEXT NOT NULL,
    model TEXT NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    UNIQUE(date, workflow_id, model)
);

CREATE INDEX idx_openai_usage_daily_date ON public.openai_usage_daily(date);

-- Visão para análises agregadas
CREATE OR REPLACE VIEW public.openai_usage_summary AS
SELECT
    DATE_TRUNC('day', timestamp) AS day,
    workflow_id,
    workflow_name,
    model,
    COUNT(*) AS total_requests,
    SUM(prompt_tokens) AS prompt_tokens,
    SUM(completion_tokens) AS completion_tokens,
    SUM(total_tokens) AS total_tokens,
    SUM(estimated_cost) AS total_cost
FROM
    public.openai_usage
GROUP BY
    DATE_TRUNC('day', timestamp),
    workflow_id,
    workflow_name,
    model
ORDER BY
    day DESC;

-- Função para inserir dados diários automaticamente
CREATE OR REPLACE FUNCTION public.refresh_openai_usage_daily()
RETURNS TRIGGER AS $$
BEGIN
    -- Remover dados existentes para o dia/workflow/model
    DELETE FROM public.openai_usage_daily
    WHERE date = DATE_TRUNC('day', NEW.timestamp)::DATE
    AND workflow_id = NEW.workflow_id
    AND model = NEW.model;
    
    -- Inserir novos dados agregados
    INSERT INTO public.openai_usage_daily (date, workflow_id, model, total_requests, total_tokens, total_cost)
    SELECT
        DATE_TRUNC('day', timestamp)::DATE AS date,
        workflow_id,
        model,
        COUNT(*) AS total_requests,
        SUM(total_tokens) AS total_tokens,
        SUM(estimated_cost) AS total_cost
    FROM
        public.openai_usage
    WHERE
        DATE_TRUNC('day', timestamp)::DATE = DATE_TRUNC('day', NEW.timestamp)::DATE
        AND workflow_id = NEW.workflow_id
        AND model = NEW.model
    GROUP BY
        DATE_TRUNC('day', timestamp)::DATE,
        workflow_id,
        model;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para manter a tabela diária atualizada
CREATE TRIGGER trigger_refresh_openai_usage_daily
AFTER INSERT ON public.openai_usage
FOR EACH ROW
EXECUTE FUNCTION public.refresh_openai_usage_daily();

-- Permissões RLS (Row Level Security)
ALTER TABLE public.openai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_usage_daily ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios dados
CREATE POLICY "Usuários podem ver apenas seus próprios dados" ON public.openai_usage
    FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

-- Política para permitir que a aplicação insira dados para qualquer usuário
CREATE POLICY "Aplicação pode inserir dados" ON public.openai_usage
    FOR INSERT
    WITH CHECK (true); 