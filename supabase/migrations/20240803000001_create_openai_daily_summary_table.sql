-- Criar tabela para armazenar o resumo diário de uso da OpenAI
CREATE TABLE IF NOT EXISTS openai_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_date UNIQUE (date)
);

-- Habilitar RLS e criar políticas
ALTER TABLE openai_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON openai_daily_summary
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON openai_daily_summary
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON openai_daily_summary
FOR UPDATE USING (auth.role() = 'authenticated');

-- Função para atualizar o resumo diário
CREATE OR REPLACE FUNCTION update_openai_daily_summary()
RETURNS VOID AS $$
DECLARE
  current_date_var DATE := CURRENT_DATE;
BEGIN
  -- Inserir ou atualizar o resumo do dia atual
  INSERT INTO openai_daily_summary (
    date,
    total_calls,
    total_requests,
    total_cost,
    total_tokens,
    updated_at
  )
  SELECT
    current_date_var,
    COUNT(*),
    COUNT(DISTINCT request_id),
    COALESCE(SUM(estimated_cost), 0),
    COALESCE(SUM(total_tokens), 0),
    now()
  FROM
    openai_usage
  WHERE
    DATE("timestamp") = current_date_var
  ON CONFLICT (date)
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    total_requests = EXCLUDED.total_requests,
    total_cost = EXCLUDED.total_cost,
    total_tokens = EXCLUDED.total_tokens,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Atualizar a função get_daily_openai_usage_summary para usar a nova tabela
CREATE OR REPLACE FUNCTION get_daily_openai_usage_summary()
RETURNS TABLE (
  total_calls INTEGER,
  total_requests INTEGER,
  total_cost NUMERIC,
  total_tokens INTEGER,
  update_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Primeiro, atualizar o resumo
  PERFORM update_openai_daily_summary();
  
  -- Retornar os dados atualizados
  RETURN QUERY 
  SELECT 
    s.total_calls,
    s.total_requests,
    s.total_cost,
    s.total_tokens,
    s.updated_at AS update_date
  FROM 
    openai_daily_summary s
  WHERE 
    s.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar o resumo diário após inserções/atualizações na tabela openai_usage
CREATE OR REPLACE FUNCTION trigger_update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a data da operação for hoje, atualizar o resumo
  IF DATE(NEW."timestamp") = CURRENT_DATE THEN
    PERFORM update_openai_daily_summary();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS update_daily_summary_trigger ON openai_usage;

-- Criar o trigger
CREATE TRIGGER update_daily_summary_trigger
AFTER INSERT OR UPDATE ON openai_usage
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_summary(); 