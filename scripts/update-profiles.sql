-- Adiciona coluna openai_key à tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openai_key TEXT;

-- Atualiza as políticas de segurança para a nova coluna
DROP POLICY IF EXISTS "Usuários podem atualizar sua própria chave OpenAI" ON profiles;

CREATE POLICY "Usuários podem atualizar sua própria chave OpenAI"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Garante que apenas o próprio usuário pode ver sua chave
ALTER TABLE profiles 
  ALTER COLUMN openai_key SET DEFAULT NULL;

-- Garante permissões de atualização
GRANT UPDATE (openai_key) ON profiles TO authenticated; 