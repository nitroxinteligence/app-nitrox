-- Criação da tabela para armazenar dados de completions da OpenAI
CREATE TABLE IF NOT EXISTS openai_completions_usage (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  input_cached_tokens INTEGER DEFAULT 0,
  input_audio_tokens INTEGER DEFAULT 0,
  output_audio_tokens INTEGER DEFAULT 0,
  num_model_requests INTEGER NOT NULL,
  project_id TEXT,
  user_id TEXT,
  api_key_id TEXT,
  model TEXT,
  efficiency INTEGER, -- Relação entre tokens de saída e entrada (%)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não haja duplicatas para a mesma data e modelo
  UNIQUE(date, model)
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_openai_completions_usage_date ON openai_completions_usage(date);
CREATE INDEX IF NOT EXISTS idx_openai_completions_usage_model ON openai_completions_usage(model);

-- Função para obter dados de completions agregados por data
CREATE OR REPLACE FUNCTION get_completions_usage_by_date(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  input_tokens BIGINT,
  output_tokens BIGINT,
  input_cached_tokens BIGINT,
  num_model_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.date,
    SUM(o.input_tokens)::BIGINT as input_tokens,
    SUM(o.output_tokens)::BIGINT as output_tokens,
    SUM(o.input_cached_tokens)::BIGINT as input_cached_tokens,
    SUM(o.num_model_requests)::BIGINT as num_model_requests
  FROM 
    openai_completions_usage o
  WHERE 
    o.date BETWEEN start_date AND end_date
  GROUP BY 
    o.date
  ORDER BY 
    o.date;
END;
$$ LANGUAGE plpgsql;

-- Função para obter dados de completions agregados por modelo
CREATE OR REPLACE FUNCTION get_completions_usage_by_model(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  model TEXT,
  input_tokens BIGINT,
  output_tokens BIGINT,
  input_cached_tokens BIGINT,
  num_model_requests BIGINT,
  efficiency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.model,
    SUM(o.input_tokens)::BIGINT as input_tokens,
    SUM(o.output_tokens)::BIGINT as output_tokens,
    SUM(o.input_cached_tokens)::BIGINT as input_cached_tokens,
    SUM(o.num_model_requests)::BIGINT as num_model_requests,
    CASE 
      WHEN SUM(o.input_tokens) > 0 THEN 
        ROUND((SUM(o.output_tokens)::NUMERIC / SUM(o.input_tokens)::NUMERIC) * 100)::INTEGER
      ELSE 0
    END as efficiency
  FROM 
    openai_completions_usage o
  WHERE 
    o.date BETWEEN start_date AND end_date
  GROUP BY 
    o.model
  ORDER BY 
    input_tokens DESC;
END;
$$ LANGUAGE plpgsql;

-- Adiciona permissões RLS para a tabela
ALTER TABLE openai_completions_usage ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserções pelo service role
CREATE POLICY "Service role can do all operations" ON openai_completions_usage 
  FOR ALL 
  TO service_role 
  USING (true);

-- Política para permitir acesso de leitura para usuários autenticados
CREATE POLICY "Authenticated users can read" ON openai_completions_usage 
  FOR SELECT 
  TO authenticated 
  USING (true); 