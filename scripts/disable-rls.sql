-- Desabilitar RLS para todas as tabelas relevantes
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Agents are viewable by authenticated users" ON agents;
DROP POLICY IF EXISTS "Agents can be created by authenticated users" ON agents;

-- Garantir que todos têm acesso às tabelas
GRANT ALL ON chat_sessions TO anon;
GRANT ALL ON messages TO anon;
GRANT ALL ON agents TO anon;
GRANT ALL ON profiles TO anon;

-- Criar política pública para permitir todas as operações
CREATE POLICY "Public access" ON chat_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access" ON messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access" ON agents
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access" ON profiles
  FOR ALL
  USING (true)
  WITH CHECK (true); 