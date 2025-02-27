-- Corrigir problema de permissão com a tabela auth.users

-- Remover a política atual que pode estar causando problemas
DROP POLICY IF EXISTS "Administradores podem ver todos os dados de uso" ON public.openai_usage;

-- Criar uma nova política baseada em funções em vez de consulta direta
CREATE POLICY "Administradores podem ver todos os dados de uso"
  ON public.openai_usage
  FOR ALL
  USING (
    -- Usar is_admin do JWT em vez de consultar a tabela users diretamente
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true'
  );

-- Adicionar uma política para permitir acesso ao serviço
CREATE POLICY "Serviço pode acessar todos os dados de uso"
  ON public.openai_usage
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Adicionar a mesma política para tabelas de agregação
CREATE POLICY "Serviço pode acessar dados agregados"
  ON public.openai_usage_daily
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Serviço pode acessar resumos"
  ON public.openai_usage_summary
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Corrigir a função de agregação para não referenciar a tabela users
-- Modificação na função que calcula o uso mensal
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
  -- Verificar se o usuário tem permissão (o caller da função)
  IF user_id_param IS NOT NULL AND
     auth.uid() != user_id_param AND
     auth.jwt() ->> 'role' != 'service_role' AND 
     auth.jwt() ->> 'app_metadata' ->> 'is_admin' != 'true' THEN
    RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para ver estes dados';
  END IF;

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