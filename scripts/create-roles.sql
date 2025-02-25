-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department_id TEXT REFERENCES departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Roles are viewable by authenticated users"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial roles data
INSERT INTO roles (id, name, description, department_id) VALUES
  -- Nível Estratégico
  ('cio', 'CIO', 'Chief Information Officer - Responsável pela estratégia de tecnologia', 'nivel-estrategico'),
  ('coo', 'COO', 'Chief Operating Officer - Responsável pela estratégia de operações', 'nivel-estrategico'),
  
  -- Departamento de Inteligência
  ('analista-dados', 'Analista de Dados', 'Responsável por análise de dados e insights', 'inteligencia'),
  ('especialista-processos', 'Especialista em Processos', 'Responsável por otimização de processos', 'inteligencia'),
  
  -- Departamento de Marketing
  ('gerente-marketing', 'Gerente de Marketing', 'Responsável pela estratégia de marketing', 'marketing'),
  ('especialista-growth', 'Especialista em Growth', 'Responsável por crescimento e aquisição', 'marketing'),
  
  -- Departamento de Vendas
  ('gerente-vendas', 'Gerente de Vendas', 'Responsável pela equipe de vendas', 'vendas'),
  ('vendedor', 'Vendedor', 'Responsável por vendas diretas', 'vendas'),
  
  -- Departamento de Sucesso do Cliente
  ('gerente-cs', 'Gerente de Customer Success', 'Responsável pela equipe de CS', 'sucesso-cliente'),
  ('cs-manager', 'Customer Success Manager', 'Responsável pelo sucesso dos clientes', 'sucesso-cliente'),
  
  -- Departamento de RH
  ('gerente-rh', 'Gerente de RH', 'Responsável pela equipe de RH', 'recursos-humanos'),
  ('analista-rh', 'Analista de RH', 'Responsável por processos de RH', 'recursos-humanos'),
  
  -- Departamento de Desenvolvimento de Produto
  ('product-manager', 'Product Manager', 'Responsável pela gestão do produto', 'desenvolvimento-produto'),
  ('product-owner', 'Product Owner', 'Responsável pelo backlog do produto', 'desenvolvimento-produto')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  department_id = EXCLUDED.department_id,
  updated_at = TIMEZONE('utc'::text, NOW()); 