-- Script para verificar o esquema das tabelas do Supabase
-- Útil para garantir que a estrutura do banco de dados está correta

-- Verificar se a tabela openai_usage existe e sua estrutura
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' AND 
  table_name = 'openai_usage'
ORDER BY 
  ordinal_position;

-- Verificar especificamente a coluna "Model" 
-- para garantir que está com "M" maiúsculo
SELECT 
  column_name
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' AND 
  table_name = 'openai_usage' AND 
  column_name = 'Model';

-- Verificar se a tabela openai_usage_daily existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' AND 
  table_name = 'openai_usage_daily'
ORDER BY 
  ordinal_position;

-- Verificar se a tabela openai_usage_summary existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' AND 
  table_name = 'openai_usage_summary'
ORDER BY 
  ordinal_position;

-- Verificar se a função de agregação existe
SELECT 
  routine_name,
  data_type AS return_type
FROM 
  information_schema.routines
WHERE 
  routine_schema = 'public' AND 
  routine_name = 'update_openai_usage_aggregations';

-- Verificar as permissões RLS na tabela openai_usage
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'openai_usage'; 