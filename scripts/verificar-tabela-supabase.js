#!/usr/bin/env node

/**
 * Script para verificar a estrutura da tabela openai_usage no Supabase
 * 
 * Este script se conecta ao Supabase e verifica as colunas existentes na tabela openai_usage
 * para ajudar a resolver problemas de incompatibilidade entre o código e a estrutura da tabela.
 * 
 * Uso:
 *   node scripts/verificar-tabela-supabase.js
 */

// Importar módulos necessários
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificar configurações
if (!supabaseUrl || !supabaseKey) {
  console.error('\nErro: Variáveis de ambiente do Supabase não configuradas.');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) estão definidas no arquivo .env.local');
  process.exit(1);
}

// Inicializar o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Função principal
async function main() {
  console.log('=== Verificando a estrutura da tabela openai_usage no Supabase ===');
  console.log(`URL do Supabase: ${supabaseUrl}`);
  
  try {
    // Verificar se a tabela existe e obter uma linha para analisar sua estrutura
    console.log('\nVerificando se a tabela exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('openai_usage')
      .select('*')
      .limit(1);
    
    if (tableError) {
      if (tableError.code === '42P01') {
        console.error('\nErro: A tabela openai_usage não existe no Supabase.');
        console.log('\nExecute o seguinte SQL para criar a tabela:');
        console.log(`
CREATE TABLE openai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,
  execution_id TEXT NOT NULL,
  node_id TEXT,
  node_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_estimated BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

-- Índices para melhorar a performance das consultas
CREATE INDEX idx_openai_usage_workflow_id ON openai_usage(workflow_id);
CREATE INDEX idx_openai_usage_execution_id ON openai_usage(execution_id);
CREATE INDEX idx_openai_usage_timestamp ON openai_usage(timestamp);
CREATE INDEX idx_openai_usage_model ON openai_usage(model);
        `);
        return;
      } else {
        console.error('\nErro ao verificar a tabela:', tableError);
        return;
      }
    }
    
    // Verificar a estrutura da tabela
    console.log('\nVerificando a estrutura da tabela...');
    
    // Usando pg_catalog para obter informações sobre as colunas
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      target_table: 'openai_usage'
    });
    
    if (columnsError) {
      console.error('\nErro ao obter colunas usando RPC:', columnsError);
      console.log('\nTentando método alternativo...');
      
      // Método alternativo: consultar uma linha e verificar suas propriedades
      const sampleRow = tableExists && tableExists.length > 0 ? tableExists[0] : null;
      
      if (sampleRow) {
        console.log('\nEstrutura da tabela baseada em uma linha existente:');
        const columns = Object.keys(sampleRow);
        
        columns.forEach(column => {
          const value = sampleRow[column];
          const type = typeof value;
          console.log(`- ${column} (${type}): ${formatValue(value)}`);
        });
      } else {
        console.log('\nA tabela existe mas está vazia. Criando SQL para verificar a estrutura...');
        
        // Criar SQL para descrever a tabela
        console.log('\nExecute a seguinte consulta SQL no Supabase para verificar a estrutura da tabela:');
        console.log(`
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'openai_usage'
ORDER BY 
  ordinal_position;
        `);
        
        // Sugerir alternativas para o código
        sugerirAlternativas();
      }
    } else {
      console.log('\nColunas encontradas na tabela openai_usage:');
      columns.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type})`);
      });
    }
    
    // Propor uma solução com base nas descobertas
    sugerirAlternativas();
    
  } catch (error) {
    console.error('\nErro durante a verificação:', error.message);
    process.exit(1);
  }
}

// Função auxiliar para formatar valores
function formatValue(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
  if (typeof value === 'string') return value.substring(0, 50) + (value.length > 50 ? '...' : '');
  return String(value);
}

// Função para sugerir alternativas
function sugerirAlternativas() {
  console.log('\n=== Possíveis soluções para o problema ===');
  
  console.log('\n1. Ajustar a tabela do Supabase para corresponder ao código:');
  console.log(`
-- Adicionar colunas que possam estar faltando
ALTER TABLE openai_usage 
ADD COLUMN IF NOT EXISTS execution_id TEXT,
ADD COLUMN IF NOT EXISTS node_id TEXT,
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN;

-- Atualizar colunas que possam ter nomes diferentes
-- Por exemplo, se a tabela tem 'tokens_prompt' em vez de 'prompt_tokens':
-- ALTER TABLE openai_usage RENAME COLUMN tokens_prompt TO prompt_tokens;
  `);
  
  console.log('\n2. Ajustar o código para corresponder à tabela do Supabase:');
  console.log(`
1. Abra o arquivo app/api/webhooks/n8n-openai/route.ts
2. Encontre o código que processa os registros (função POST)
3. Ajuste os nomes dos campos no objeto processedRecords para corresponder às colunas da tabela
4. Por exemplo, se a tabela usa tokens_prompt em vez de prompt_tokens:
   
   return {
     workflow_id: record.workflow_id,
     workflow_name: record.workflow_name || "Desconhecido",
     // use o nome correto das colunas conforme a tabela
     tokens_prompt: promptTokens,
     tokens_completion: completionTokens,
     tokens_total: totalTokens,
     cost_usd: cost,
     created_at: record.timestamp || new Date().toISOString(),
     ...
   };
  `);
  
  console.log('\n3. Crie uma nova tabela com a estrutura correta e migre os dados:');
  console.log(`
-- Criar nova tabela com a estrutura correta
CREATE TABLE openai_usage_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,
  execution_id TEXT NOT NULL,
  node_id TEXT,
  node_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_estimated BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

-- Migrar dados da tabela antiga para a nova (ajuste os nomes das colunas conforme necessário)
INSERT INTO openai_usage_new (...)
SELECT ... FROM openai_usage;

-- Renomear tabelas
ALTER TABLE openai_usage RENAME TO openai_usage_old;
ALTER TABLE openai_usage_new RENAME TO openai_usage;

-- Criar índices
CREATE INDEX idx_openai_usage_workflow_id ON openai_usage(workflow_id);
CREATE INDEX idx_openai_usage_execution_id ON openai_usage(execution_id);
CREATE INDEX idx_openai_usage_timestamp ON openai_usage(timestamp);
CREATE INDEX idx_openai_usage_model ON openai_usage(model);
  `);
}

// Executar a função principal
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
}); 