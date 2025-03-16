-- Migração para adicionar ou corrigir a coluna efficiency na tabela openai_completions_usage

-- 1. Primeiro verificamos se a coluna existe, se não, a criamos
DO $$
BEGIN
    -- Verificar se a coluna efficiency existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'openai_completions_usage' 
        AND column_name = 'efficiency'
    ) THEN
        -- Adicionar a coluna se não existir
        ALTER TABLE openai_completions_usage 
        ADD COLUMN efficiency INTEGER;
        
        RAISE NOTICE 'Coluna efficiency adicionada com sucesso.';
    ELSE
        -- Alterar a coluna se já existir
        ALTER TABLE openai_completions_usage 
        ALTER COLUMN efficiency DROP NOT NULL,
        ALTER COLUMN efficiency SET DEFAULT NULL;
        
        RAISE NOTICE 'Coluna efficiency já existe, apenas ajustando propriedades.';
    END IF;
END $$;

-- 2. Atualizar a coluna para todos os registros existentes
UPDATE openai_completions_usage 
SET efficiency = 
  CASE 
    WHEN input_tokens > 0 THEN 
      ROUND((output_tokens::NUMERIC / input_tokens::NUMERIC) * 100)::INTEGER
    ELSE 0
  END;

-- 3. Recriamos a função para garantir que a mesma lógica de cálculo 
-- seja aplicada tanto na atualização quanto nas consultas
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

-- 4. Adicionamos também um trigger para atualizar a coluna eficiência automaticamente
-- Este trigger é opcional, já que estamos calculando eficiência na consulta,
-- mas pode ser útil para ter a eficiência pré-calculada nos registros

CREATE OR REPLACE FUNCTION calculate_efficiency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.input_tokens > 0 THEN
    NEW.efficiency := ROUND((NEW.output_tokens::NUMERIC / NEW.input_tokens::NUMERIC) * 100)::INTEGER;
  ELSE
    NEW.efficiency := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novos registros e atualizações
DROP TRIGGER IF EXISTS trigger_calculate_efficiency ON openai_completions_usage;
CREATE TRIGGER trigger_calculate_efficiency
BEFORE INSERT OR UPDATE OF input_tokens, output_tokens
ON openai_completions_usage
FOR EACH ROW
EXECUTE FUNCTION calculate_efficiency();

-- Comentário para documentação
COMMENT ON COLUMN openai_completions_usage.efficiency IS 'Relação entre tokens de saída e entrada (%)';

-- Atualizar o esquema no cache do Supabase (pseudo-comando explicativo)
-- NOTA: Este comando é apenas para documentação - não é um comando SQL real
-- O cache do Supabase é atualizado ao reiniciar o serviço ou executando
-- uma operação que força a atualização do cache, como adicionar uma coluna.
-- REFRESH SCHEMA CACHE openai_completions_usage; 