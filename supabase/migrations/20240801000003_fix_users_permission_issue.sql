-- Corrigir problema de permissão com a tabela auth.users (adicionais)

-- 1. Remover e recriar a referência de chave estrangeira para user_id

-- Primeiro verificar se a constraint existe
DO $$
DECLARE
    constraint_exists BOOLEAN;
    constraint_name TEXT;
BEGIN
    -- Buscar nome da constraint se existir
    SELECT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'openai_usage' AND column_name = 'user_id'
    ) INTO constraint_exists;

    IF constraint_exists THEN
        -- Obter o nome da constraint
        SELECT tc.constraint_name INTO constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'openai_usage' 
            AND ccu.column_name = 'user_id' 
            AND tc.constraint_type = 'FOREIGN KEY';
            
        -- Remover a constraint
        IF constraint_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.openai_usage DROP CONSTRAINT IF EXISTS ' || constraint_name;
            RAISE NOTICE 'Removida constraint de chave estrangeira: %', constraint_name;
        END IF;
    END IF;
END $$;

-- 2. Modificar a política para remover qualquer acesso à tabela auth.users
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios dados de uso" ON public.openai_usage;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios dados de uso" ON public.openai_usage;
DROP POLICY IF EXISTS "Administradores podem ver todos os dados de uso" ON public.openai_usage;

-- Recriar as políticas sem referência à tabela auth.users
-- Política baseada apenas em auth.uid()
CREATE POLICY "Usuários podem ver apenas seus próprios dados de uso"
  ON public.openai_usage
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role' OR
    (auth.jwt() IS NOT NULL AND auth.jwt()->'app_metadata'->>'is_admin' = 'true')
  );

-- Política para inserção de dados
CREATE POLICY "Usuários podem inserir dados de uso"
  ON public.openai_usage
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.role() = 'service_role'
  );

-- Política para administradores
CREATE POLICY "Administradores podem modificar dados de uso"
  ON public.openai_usage
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    (auth.jwt() IS NOT NULL AND auth.jwt()->'app_metadata'->>'is_admin' = 'true')
  );

-- 3. Verificar e corrigir outras tabelas
-- Aplicar mesmas políticas para tabelas de agregação

-- Remover qualquer política que possa referenciar auth.users
DROP POLICY IF EXISTS "Usuários autenticados podem ver dados agregados" ON public.openai_usage_daily;
DROP POLICY IF EXISTS "Usuários autenticados podem ver resumos" ON public.openai_usage_summary;

-- Recriar com políticas baseadas apenas em auth.role()
CREATE POLICY "Acesso a dados agregados"
  ON public.openai_usage_daily
  FOR ALL
  USING (true);  -- Permitir acesso público para leitura
  
CREATE POLICY "Acesso a resumos"
  ON public.openai_usage_summary
  FOR ALL
  USING (true);  -- Permitir acesso público para leitura

-- Políticas específicas para escrita
CREATE POLICY "Serviço pode modificar dados agregados"
  ON public.openai_usage_daily
  FOR ALL
  USING (auth.role() = 'service_role');
  
CREATE POLICY "Serviço pode modificar resumos"
  ON public.openai_usage_summary
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Garantir que as configurações de segurança estejam corretas
-- Verificar se as RLS estão habilitadas nas tabelas
ALTER TABLE public.openai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_usage_summary ENABLE ROW LEVEL SECURITY;

-- Permitir dados anônimos no webhook do n8n 
ALTER TABLE public.openai_usage ALTER COLUMN user_id DROP NOT NULL; 