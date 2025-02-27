-- Adicionar função para obter informações sobre colunas de uma tabela
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text,
    column_default::text
  FROM 
    information_schema.columns
  WHERE 
    table_schema = 'public' 
    AND table_name = table_name;
$$;

-- Conceder permissão de execução para anônimos e usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_table_columns TO anon, authenticated;

-- Adicionar função para verificar existência de tabela
CREATE OR REPLACE FUNCTION public.table_exists(table_name text)
RETURNS boolean
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = table_name
  );
$$;

-- Conceder permissão de execução para anônimos e usuários autenticados
GRANT EXECUTE ON FUNCTION public.table_exists TO anon, authenticated; 