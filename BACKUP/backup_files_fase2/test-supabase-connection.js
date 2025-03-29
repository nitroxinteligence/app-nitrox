#!/usr/bin/env node

/**
 * Script para testar a conexão com o Supabase e verificar a configuração
 * 
 * Uso: 
 * 1. Certifique-se de que o arquivo .env.local existe na raiz do projeto
 * 2. Execute: node scripts/test-supabase-connection.js
 */

// Importar dotenv para carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Cores para saída do console
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m"
};

// Função para exibir mensagens formatadas
function log(type, message) {
  const types = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCESSO]${colors.reset}`,
    error: `${colors.red}[ERRO]${colors.reset}`,
    warning: `${colors.yellow}[AVISO]${colors.reset}`,
    step: `${colors.magenta}[PASSO]${colors.reset}`
  };
  
  console.log(`${types[type] || ''} ${message}`);
}

// Função principal
async function main() {
  log('info', 'Iniciando teste de conexão com o Supabase');
  
  // Verificar variáveis de ambiente
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log('error', 'Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas');
    process.exit(1);
  }
  
  if (!SUPABASE_SERVICE_KEY) {
    log('warning', 'Variável de ambiente SUPABASE_SERVICE_KEY não definida - algumas operações podem falhar');
  }
  
  log('step', 'Conectando ao Supabase com chave anônima...');
  
  // Criar cliente com chave anônima
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Testar conexão básica
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('openai_usage_summary')
      .select('count(*)')
      .limit(1);
    
    if (anonError) {
      log('error', `Falha ao conectar com chave anônima: ${anonError.message}`);
    } else {
      log('success', 'Conexão com chave anônima bem-sucedida');
    }
  } catch (error) {
    log('error', `Erro ao testar conexão anônima: ${error.message}`);
  }
  
  // Testar com chave de serviço se disponível
  if (SUPABASE_SERVICE_KEY) {
    log('step', 'Conectando ao Supabase com chave de serviço...');
    
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
      // Testar permissões de leitura
      const { data: readData, error: readError } = await supabaseService
        .from('openai_usage')
        .select('count(*)')
        .limit(1);
      
      if (readError) {
        log('error', `Falha ao ler dados com chave de serviço: ${readError.message}`);
      } else {
        log('success', 'Leitura com chave de serviço bem-sucedida');
      }
      
      // Testar inserção de registro de teste
      const testRecord = {
        timestamp: new Date().toISOString(),
        workflow_id: 'test-script',
        workflow_name: 'Test Script',
        Model: 'test-model',
        endpoint: 'test',
        prompt_tokens: 1,
        completion_tokens: 1,
        total_tokens: 2,
        estimated_cost: 0.0001,
        user_id: null,
        request_id: `test-${Date.now()}`,
        tags: ['test'],
        metadata: { source: 'test-script' }
      };
      
      const { data: insertData, error: insertError } = await supabaseService
        .from('openai_usage')
        .insert(testRecord)
        .select();
      
      if (insertError) {
        log('error', `Falha ao inserir registro de teste: ${insertError.message}`);
      } else {
        log('success', 'Inserção de registro de teste bem-sucedida');
        
        // Apagar o registro de teste
        const { error: deleteError } = await supabaseService
          .from('openai_usage')
          .delete()
          .eq('request_id', testRecord.request_id);
        
        if (deleteError) {
          log('warning', `Falha ao apagar registro de teste: ${deleteError.message}`);
        } else {
          log('success', 'Remoção de registro de teste bem-sucedida');
        }
      }
      
      // Verificar função de agregação
      try {
        const { data: rpcData, error: rpcError } = await supabaseService
          .rpc('update_openai_usage_aggregations');
        
        if (rpcError) {
          log('error', `Falha ao chamar função de agregação: ${rpcError.message}`);
        } else {
          log('success', 'Chamada à função de agregação bem-sucedida');
        }
      } catch (error) {
        log('error', `Erro ao chamar função de agregação: ${error.message}`);
      }
    } catch (error) {
      log('error', `Erro ao testar com chave de serviço: ${error.message}`);
    }
  }
  
  // Verificar tabelas necessárias
  log('step', 'Verificando estrutura do banco de dados...');
  const requiredTables = ['openai_usage', 'openai_usage_daily', 'openai_usage_summary'];
  
  const client = SUPABASE_SERVICE_KEY ? 
    createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : 
    supabaseAnon;
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await client
        .from(table)
        .select('count(*)')
        .limit(1);
      
      if (error) {
        log('error', `Tabela '${table}' não encontrada ou sem permissão: ${error.message}`);
      } else {
        log('success', `Tabela '${table}' existe e está acessível`);
      }
    } catch (error) {
      log('error', `Erro ao verificar tabela '${table}': ${error.message}`);
    }
  }
  
  log('info', 'Teste de conexão concluído');
}

// Executar função principal
main().catch(error => {
  log('error', `Erro fatal: ${error.message}`);
  process.exit(1);
}); 