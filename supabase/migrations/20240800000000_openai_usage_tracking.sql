-- Cria tabela para rastreamento de uso da OpenAI
CREATE TABLE IF NOT EXISTS public.openai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost NUMERIC(10, 6) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  request_id TEXT NOT NULL,
  workflow_id TEXT,
  workflow_name TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adiciona índices para consultas comuns
CREATE INDEX IF NOT EXISTS openai_usage_timestamp_idx ON public.openai_usage (timestamp);
CREATE INDEX IF NOT EXISTS openai_usage_user_id_idx ON public.openai_usage (user_id);
CREATE INDEX IF NOT EXISTS openai_usage_model_idx ON public.openai_usage (model);
CREATE INDEX IF NOT EXISTS openai_usage_workflow_id_idx ON public.openai_usage (workflow_id);

-- Configura políticas RLS (Row Level Security)
ALTER TABLE public.openai_usage ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas seus próprios dados
CREATE POLICY "Usuários podem ver apenas seus próprios dados de uso"
  ON public.openai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para inserção de dados
CREATE POLICY "Usuários podem inserir seus próprios dados de uso"
  ON public.openai_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Política para administradores verem todos os dados
CREATE POLICY "Administradores podem ver todos os dados de uso"
  ON public.openai_usage
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'
  ));

-- Função para calcular o uso mensal por usuário
CREATE OR REPLACE FUNCTION public.get_monthly_openai_usage(
  user_id_param UUID,
  year_month TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
RETURNS TABLE (
  total_cost NUMERIC,
  total_tokens BIGINT,
  model TEXT,
  model_cost NUMERIC,
  model_tokens BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_usage AS (
    SELECT
      model,
      SUM(estimated_cost) AS cost,
      SUM(total_tokens) AS tokens
    FROM public.openai_usage
    WHERE 
      (user_id = user_id_param OR user_id_param IS NULL)
      AND TO_CHAR(timestamp, 'YYYY-MM') = year_month
    GROUP BY model
  )
  SELECT
    SUM(cost) OVER() AS total_cost,
    SUM(tokens) OVER() AS total_tokens,
    model,
    cost AS model_cost,
    tokens AS model_tokens
  FROM monthly_usage;
END;
$$; 

-- Criar tabelas de agregação para uso diário e resumo
CREATE TABLE IF NOT EXISTS public.openai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  model TEXT NOT NULL,
  total_tokens INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  estimated_cost NUMERIC(10, 6) NOT NULL,
  request_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (date, model)
);

CREATE TABLE IF NOT EXISTS public.openai_usage_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL, -- 'all_time', 'month:YYYY-MM', 'year:YYYY', etc.
  model TEXT NOT NULL,
  total_tokens BIGINT NOT NULL,
  prompt_tokens BIGINT NOT NULL,
  completion_tokens BIGINT NOT NULL,
  estimated_cost NUMERIC(12, 6) NOT NULL,
  request_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (period, model)
);

-- Adicionar índices para consultas eficientes
CREATE INDEX IF NOT EXISTS openai_usage_daily_date_idx ON public.openai_usage_daily (date);
CREATE INDEX IF NOT EXISTS openai_usage_daily_model_idx ON public.openai_usage_daily (model);
CREATE INDEX IF NOT EXISTS openai_usage_summary_period_idx ON public.openai_usage_summary (period);
CREATE INDEX IF NOT EXISTS openai_usage_summary_model_idx ON public.openai_usage_summary (model);

-- Criar políticas de RLS para as tabelas de agregação
ALTER TABLE public.openai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_usage_summary ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura por qualquer usuário autenticado
CREATE POLICY "Usuários autenticados podem ver dados agregados"
  ON public.openai_usage_daily
  FOR SELECT
  USING (auth.role() = 'authenticated');
  
CREATE POLICY "Usuários autenticados podem ver resumos"
  ON public.openai_usage_summary
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Função para atualizar as tabelas de agregação
CREATE OR REPLACE FUNCTION public.update_openai_usage_aggregations()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month TEXT;
  current_year TEXT;
BEGIN
  -- Configurações
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- 1. Atualizar tabela diária
  -- Primeiro, excluir e recriar os registros dos últimos 7 dias para garantir precisão
  DELETE FROM public.openai_usage_daily
  WHERE date >= (CURRENT_DATE - INTERVAL '7 days');
  
  -- Inserir dados agregados por dia e modelo
  INSERT INTO public.openai_usage_daily (
    date, model, total_tokens, prompt_tokens, completion_tokens, 
    estimated_cost, request_count
  )
  SELECT 
    DATE(timestamp) AS date,
    model,
    SUM(total_tokens) AS total_tokens,
    SUM(prompt_tokens) AS prompt_tokens,
    SUM(completion_tokens) AS completion_tokens,
    SUM(estimated_cost) AS estimated_cost,
    COUNT(*) AS request_count
  FROM public.openai_usage
  WHERE timestamp >= (CURRENT_DATE - INTERVAL '7 days')
  GROUP BY DATE(timestamp), model
  ON CONFLICT (date, model) 
  DO UPDATE SET
    total_tokens = EXCLUDED.total_tokens,
    prompt_tokens = EXCLUDED.prompt_tokens,
    completion_tokens = EXCLUDED.completion_tokens,
    estimated_cost = EXCLUDED.estimated_cost,
    request_count = EXCLUDED.request_count,
    updated_at = now();

  -- 2. Atualizar resumo mensal
  -- Primeiro excluir os registros do mês atual para recomputar
  DELETE FROM public.openai_usage_summary 
  WHERE period = 'month:' || current_month;
  
  -- Inserir dados agregados para o mês atual por modelo
  INSERT INTO public.openai_usage_summary (
    period, model, total_tokens, prompt_tokens, completion_tokens, 
    estimated_cost, request_count
  )
  SELECT 
    'month:' || current_month AS period,
    model,
    SUM(total_tokens) AS total_tokens,
    SUM(prompt_tokens) AS prompt_tokens,
    SUM(completion_tokens) AS completion_tokens,
    SUM(estimated_cost) AS estimated_cost,
    COUNT(*) AS request_count
  FROM public.openai_usage
  WHERE TO_CHAR(timestamp, 'YYYY-MM') = current_month
  GROUP BY model;

  -- 3. Atualizar resumo anual
  -- Primeiro excluir os registros do ano atual para recomputar
  DELETE FROM public.openai_usage_summary 
  WHERE period = 'year:' || current_year;
  
  -- Inserir dados agregados para o ano atual por modelo
  INSERT INTO public.openai_usage_summary (
    period, model, total_tokens, prompt_tokens, completion_tokens, 
    estimated_cost, request_count
  )
  SELECT 
    'year:' || current_year AS period,
    model,
    SUM(total_tokens) AS total_tokens,
    SUM(prompt_tokens) AS prompt_tokens,
    SUM(completion_tokens) AS completion_tokens,
    SUM(estimated_cost) AS estimated_cost,
    COUNT(*) AS request_count
  FROM public.openai_usage
  WHERE TO_CHAR(timestamp, 'YYYY') = current_year
  GROUP BY model;

  -- 4. Atualizar resumo total (todos os tempos)
  -- Primeiro excluir os registros de todos os tempos para recomputar
  DELETE FROM public.openai_usage_summary 
  WHERE period = 'all_time';
  
  -- Inserir dados agregados para todos os tempos por modelo
  INSERT INTO public.openai_usage_summary (
    period, model, total_tokens, prompt_tokens, completion_tokens, 
    estimated_cost, request_count
  )
  SELECT 
    'all_time' AS period,
    model,
    SUM(total_tokens) AS total_tokens,
    SUM(prompt_tokens) AS prompt_tokens,
    SUM(completion_tokens) AS completion_tokens,
    SUM(estimated_cost) AS estimated_cost,
    COUNT(*) AS request_count
  FROM public.openai_usage
  GROUP BY model;
  
  -- Registrar conclusão
  RAISE NOTICE 'Atualização de agregações de uso da OpenAI concluída';
END;
$$; 