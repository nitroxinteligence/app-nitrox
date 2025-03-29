-- Criação da tabela campaign_requests para armazenar solicitações de criação de campanhas
CREATE TABLE IF NOT EXISTS campaign_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  chat_session_id TEXT NOT NULL,
  briefing_data JSONB NOT NULL DEFAULT '{}',
  campaign_config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  campaign_id TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para melhorar o desempenho de consultas
CREATE INDEX IF NOT EXISTS campaign_requests_user_id_idx ON campaign_requests(user_id);
CREATE INDEX IF NOT EXISTS campaign_requests_status_idx ON campaign_requests(status);
CREATE INDEX IF NOT EXISTS campaign_requests_created_at_idx ON campaign_requests(created_at DESC);

-- Permissões RLS (Row Level Security)
ALTER TABLE campaign_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver apenas suas próprias solicitações"
  ON campaign_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir apenas suas próprias solicitações"
  ON campaign_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas suas próprias solicitações"
  ON campaign_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_campaign_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_requests_updated_at
BEFORE UPDATE ON campaign_requests
FOR EACH ROW
EXECUTE FUNCTION update_campaign_requests_updated_at(); 