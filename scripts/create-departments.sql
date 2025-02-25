-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create agents table if not exists
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department_id TEXT REFERENCES departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create chat_sessions table if not exists
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT REFERENCES agents(id),
  title TEXT NOT NULL DEFAULT 'Novo Chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Departments are viewable by everyone" ON departments FOR SELECT USING (true);
CREATE POLICY "Agents are viewable by everyone" ON agents FOR SELECT USING (true);
CREATE POLICY "Chat sessions are viewable by everyone" ON chat_sessions FOR SELECT USING (true);
CREATE POLICY "Chat sessions can be created by everyone" ON chat_sessions FOR INSERT WITH CHECK (true);

-- Clear existing data
TRUNCATE departments, agents, chat_sessions CASCADE;

-- Insert departments
INSERT INTO departments (id, name, description) VALUES
  ('nivel-estrategico', 'Departamento Nível Estratégico', 'Departamento responsável pela visão estratégica e tomada de decisões de alto nível'),
  ('inteligencia', 'Departamento de Inteligência', 'Responsável por análises estratégicas e planejamento'),
  ('marketing', 'Departamento de Marketing', 'Responsável por estratégias de marketing e comunicação'),
  ('vendas', 'Departamento de Vendas', 'Responsável por vendas e relacionamento com clientes'),
  ('sucesso-cliente', 'Departamento de Sucesso do Cliente', 'Responsável pelo sucesso e satisfação dos clientes'),
  ('recursos-humanos', 'Departamento de Recursos Humanos', 'Responsável pela gestão de pessoas e cultura'),
  ('produto', 'Departamento de Produto', 'Responsável pelo desenvolvimento e gestão de produtos')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Insert agents with their respective departments
INSERT INTO agents (id, name, description, department_id) VALUES
  -- Nível Estratégico
  ('cio-coo', 'CIO/COO (Head GROWTH BUSINESS)', 'Auxilia com questões relacionadas a gestão de TI e operações', 'nivel-estrategico'),
  
  -- Inteligência
  ('inteligencia', 'Inteligência', 'Fornece suporte em análises e estratégias', 'inteligencia'),
  ('estrategista', 'Estrategista', 'Auxilia no planejamento e execução de estratégias', 'inteligencia'),
  
  -- Marketing
  ('cmo', 'CMO', 'Chief Marketing Officer - Responsável pela estratégia de marketing', 'marketing'),
  ('copywriter', 'Copywriter', 'Especialista em criação de conteúdo', 'marketing'),
  ('estrategias-mkt', 'Estratégias de Marketing', 'Auxilia no desenvolvimento de estratégias de marketing', 'marketing'),
  
  -- Vendas
  ('head-sales', 'Head de Vendas', 'Responsável pela gestão da equipe de vendas', 'vendas'),
  ('pre-vendas', 'Pré-Vendas', 'Auxilia na qualificação e preparação de leads', 'vendas'),
  ('sales-rep', 'Representante de Vendas', 'Auxilia no processo de vendas', 'vendas'),
  
  -- Sucesso do Cliente
  ('head-expansao', 'Head de Expansão', 'Responsável pela estratégia de crescimento de contas', 'sucesso-cliente'),
  ('suporte', 'Suporte', 'Fornece suporte técnico aos clientes', 'sucesso-cliente'),
  ('onboarding', 'Onboarding', 'Auxilia no processo de implementação', 'sucesso-cliente'),
  
  -- Recursos Humanos
  ('rh', 'RH', 'Auxilia em processos de recursos humanos', 'recursos-humanos'),
  
  -- Produto
  ('inteligencia-mercado', 'Inteligência de Mercado', 'Análise de mercado e concorrência', 'produto'),
  ('inteligencia-negocio', 'Inteligência de Negócio', 'Análise de dados e insights de negócio', 'produto')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  department_id = EXCLUDED.department_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_department ON agents(department_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(agent_id);

-- Grant necessary permissions
GRANT SELECT ON departments TO anon, authenticated;
GRANT SELECT ON agents TO anon, authenticated;
GRANT SELECT, INSERT ON chat_sessions TO anon, authenticated; 