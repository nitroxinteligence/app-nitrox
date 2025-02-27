-- Corrigir referências às colunas na função de atualização de agregações

-- Solução para lidar com case sensitivity na coluna 'model'
DO $$
DECLARE
  column_exists BOOLEAN;
  model_column_name TEXT;
BEGIN
  -- Verificar se existe uma coluna 'model' (lowercase)
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'openai_usage' 
    AND column_name = 'model'
  ) INTO column_exists;

  -- Se existe, usar 'model'
  IF column_exists THEN
    model_column_name := 'model';
  ELSE
    -- Verificar 'Model' (capitalized)
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'openai_usage' 
      AND column_name = 'Model'
    ) INTO column_exists;
    
    -- Se existe 'Model', usar esse nome
    IF column_exists THEN
      model_column_name := '"Model"';
    ELSE
      RAISE EXCEPTION 'Nenhuma coluna model encontrada na tabela openai_usage';
    END IF;
  END IF;
  
  -- Criar a função com o nome de coluna dinâmico
  EXECUTE format('
  CREATE OR REPLACE FUNCTION public.update_openai_usage_aggregations()
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $func$
  DECLARE
    current_month TEXT;
    current_year TEXT;
  BEGIN
    -- Configurações
    current_month := TO_CHAR(CURRENT_DATE, ''YYYY-MM'');
    current_year := TO_CHAR(CURRENT_DATE, ''YYYY'');

    -- 1. Atualizar tabela diária
    -- Primeiro, excluir e recriar os registros dos últimos 7 dias para garantir precisão
    DELETE FROM public.openai_usage_daily
    WHERE date >= (CURRENT_DATE - INTERVAL ''7 days'');
    
    -- Inserir dados agregados por dia e modelo
    INSERT INTO public.openai_usage_daily (
      date, model, total_tokens, prompt_tokens, completion_tokens, 
      estimated_cost, request_count
    )
    SELECT 
      DATE(timestamp) AS date,
      %s AS model,
      SUM(total_tokens) AS total_tokens,
      SUM(prompt_tokens) AS prompt_tokens,
      SUM(completion_tokens) AS completion_tokens,
      SUM(estimated_cost) AS estimated_cost,
      COUNT(*) AS request_count
    FROM public.openai_usage
    WHERE timestamp >= (CURRENT_DATE - INTERVAL ''7 days'')
    GROUP BY DATE(timestamp), %s
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
    WHERE period = ''month:'' || current_month;
    
    -- Inserir dados agregados para o mês atual por modelo
    INSERT INTO public.openai_usage_summary (
      period, model, total_tokens, prompt_tokens, completion_tokens, 
      estimated_cost, request_count
    )
    SELECT 
      ''month:'' || current_month AS period,
      %s AS model,
      SUM(total_tokens) AS total_tokens,
      SUM(prompt_tokens) AS prompt_tokens,
      SUM(completion_tokens) AS completion_tokens,
      SUM(estimated_cost) AS estimated_cost,
      COUNT(*) AS request_count
    FROM public.openai_usage
    WHERE TO_CHAR(timestamp, ''YYYY-MM'') = current_month
    GROUP BY %s;

    -- 3. Atualizar resumo anual
    -- Primeiro excluir os registros do ano atual para recomputar
    DELETE FROM public.openai_usage_summary 
    WHERE period = ''year:'' || current_year;
    
    -- Inserir dados agregados para o ano atual por modelo
    INSERT INTO public.openai_usage_summary (
      period, model, total_tokens, prompt_tokens, completion_tokens, 
      estimated_cost, request_count
    )
    SELECT 
      ''year:'' || current_year AS period,
      %s AS model,
      SUM(total_tokens) AS total_tokens,
      SUM(prompt_tokens) AS prompt_tokens,
      SUM(completion_tokens) AS completion_tokens,
      SUM(estimated_cost) AS estimated_cost,
      COUNT(*) AS request_count
    FROM public.openai_usage
    WHERE TO_CHAR(timestamp, ''YYYY'') = current_year
    GROUP BY %s;

    -- 4. Atualizar resumo total (todos os tempos)
    -- Primeiro excluir os registros de todos os tempos para recomputar
    DELETE FROM public.openai_usage_summary 
    WHERE period = ''all_time'';
    
    -- Inserir dados agregados para todos os tempos por modelo
    INSERT INTO public.openai_usage_summary (
      period, model, total_tokens, prompt_tokens, completion_tokens, 
      estimated_cost, request_count
    )
    SELECT 
      ''all_time'' AS period,
      %s AS model,
      SUM(total_tokens) AS total_tokens,
      SUM(prompt_tokens) AS prompt_tokens,
      SUM(completion_tokens) AS completion_tokens,
      SUM(estimated_cost) AS estimated_cost,
      COUNT(*) AS request_count
    FROM public.openai_usage
    GROUP BY %s;
    
    -- Registrar conclusão
    RAISE NOTICE ''Atualização de agregações de uso da OpenAI concluída'';
  END;
  $func$;', 
  model_column_name, model_column_name, model_column_name, model_column_name, 
  model_column_name, model_column_name, model_column_name, model_column_name);
  
  RAISE NOTICE 'Função de agregação atualizada para usar a coluna %', model_column_name;
END $$; 