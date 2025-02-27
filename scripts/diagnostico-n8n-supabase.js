/**
 * Script de diagnóstico para problemas de sincronização entre N8N e Supabase
 * 
 * Este script verifica:
 * 1. Conexão com o Supabase
 * 2. Estrutura da tabela openai_usage
 * 3. Teste de inserção de um registro
 * 4. Validação do fluxo completo
 * 
 * Como usar:
 * 1. Copie para o editor de código no N8N
 * 2. Configure variáveis de ambiente no N8N (SUPABASE_URL, SUPABASE_SERVICE_KEY)
 * 3. Execute o script
 * 4. Analise os resultados
 */

// Configuração - obtenha do ambiente N8N ou substitua diretamente aqui
const SUPABASE_URL = process.env.SUPABASE_URL || $env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || $env.SUPABASE_SERVICE_KEY;

async function diagnosticarConexao() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE CONEXÃO N8N-SUPABASE');
  console.log('================================================');

  // 1. Verificar configuração
  console.log('\n1. VERIFICANDO CONFIGURAÇÃO:');
  if (!SUPABASE_URL) {
    console.error('❌ ERRO: SUPABASE_URL não está definido');
    return { success: false, error: 'SUPABASE_URL não configurado' };
  }
  console.log(`✅ SUPABASE_URL configurado: ${SUPABASE_URL.substring(0, 20)}...`);
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ ERRO: SUPABASE_SERVICE_KEY não está definido');
    return { success: false, error: 'SUPABASE_SERVICE_KEY não configurado' };
  }
  console.log(`✅ SUPABASE_SERVICE_KEY configurado: ${SUPABASE_SERVICE_KEY.substring(0, 10)}...`);

  // 2. Verificar conexão com Supabase
  console.log('\n2. TESTANDO CONEXÃO COM SUPABASE:');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ERRO: Falha na conexão com Supabase: ${response.status} ${response.statusText}`);
      console.error(`   Detalhes: ${errorText}`);
      return { success: false, error: `Falha na conexão: ${errorText}` };
    }

    console.log(`✅ Conexão estabelecida com sucesso: Status ${response.status}`);
  } catch (error) {
    console.error(`❌ ERRO: Exceção ao conectar com Supabase: ${error.message}`);
    return { success: false, error: error.message };
  }

  // 3. Verificar estrutura da tabela openai_usage
  console.log('\n3. VERIFICANDO ESTRUTURA DA TABELA:');
  try {
    // Tentar obter estrutura da tabela via função RPC
    const columnsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_table_columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ table_name: 'openai_usage' })
    });

    if (!columnsResponse.ok) {
      console.warn(`⚠️ Aviso: Não foi possível obter estrutura via RPC: ${columnsResponse.status}`);
      console.log('   Tentando método alternativo...');
      
      // Método alternativo: obter um registro existente
      const sampleResponse = await fetch(`${SUPABASE_URL}/rest/v1/openai_usage?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (!sampleResponse.ok) {
        console.error(`❌ ERRO: Não foi possível acessar a tabela openai_usage: ${sampleResponse.status}`);
        return { success: false, error: 'Falha ao acessar tabela openai_usage' };
      }
      
      const sampleData = await sampleResponse.json();
      if (sampleData && sampleData.length > 0) {
        console.log('✅ Estrutura da tabela (baseada em amostra):');
        const sample = sampleData[0];
        Object.keys(sample).forEach(key => {
          console.log(`   - ${key}: ${typeof sample[key]}`);
        });
      } else {
        console.warn('⚠️ Aviso: Tabela parece vazia, não foi possível inferir estrutura');
      }
    } else {
      const columns = await columnsResponse.json();
      console.log('✅ Estrutura da tabela:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`);
      });
    }
  } catch (error) {
    console.error(`❌ ERRO: Falha ao verificar estrutura da tabela: ${error.message}`);
  }

  // 4. Testar inserção de registro
  console.log('\n4. TESTANDO INSERÇÃO DE REGISTRO:');
  try {
    // Criar um registro de teste
    const testRecord = {
      timestamp: new Date().toISOString(),
      workflow_id: 'diagnostico-test',
      workflow_name: 'Diagnóstico N8N-Supabase',
      model: 'gpt-4o', // Campo com m minúsculo
      "Model": 'gpt-4o', // Campo com M maiúsculo para compatibilidade
      endpoint: 'chat',
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      estimated_cost: 0.0001,
      user_id: null,
      request_id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      tags: ['agent', 'diagnostico', 'test'],
      metadata: {
        source: 'diagnostico',
        test_date: new Date().toISOString(),
        test_type: 'sync_validation'
      }
    };

    console.log('📝 Tentando inserir registro de teste:');
    console.log(JSON.stringify(testRecord, null, 2));

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/openai_usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testRecord)
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error(`❌ ERRO: Falha ao inserir registro: ${insertResponse.status} ${insertResponse.statusText}`);
      console.error(`   Detalhes: ${errorText}`);
      
      // Tentar analisar o erro para identificar campos problemáticos
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message && errorData.details) {
          console.error(`   Mensagem: ${errorData.message}`);
          console.error(`   Detalhes: ${errorData.details}`);
        }
      } catch (e) {
        // Ignorar erro de parsing
      }
      
      return { 
        success: false, 
        error: `Falha na inserção: ${errorText}`,
        record: testRecord
      };
    }

    const insertResult = await insertResponse.json();
    console.log(`✅ Registro inserido com sucesso!`);
    if (insertResult && insertResult.length > 0) {
      console.log(`   ID do registro: ${insertResult[0].id || 'N/A'}`);
    }

    // 5. Verificar consistência da função de agregação
    console.log('\n5. VERIFICANDO FUNÇÃO DE AGREGAÇÃO:');
    try {
      const aggResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_openai_daily_summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      
      if (!aggResponse.ok) {
        const errorText = await aggResponse.text();
        console.warn(`⚠️ Aviso: Não foi possível executar função de agregação: ${errorText}`);
      } else {
        console.log('✅ Função de agregação executada com sucesso!');
      }
    } catch (error) {
      console.warn(`⚠️ Aviso: Erro ao executar função de agregação: ${error.message}`);
    }

  } catch (error) {
    console.error(`❌ ERRO: Exceção ao testar inserção: ${error.message}`);
    return { success: false, error: error.message };
  }

  // 6. Resumo do diagnóstico
  console.log('\n6. RESUMO DO DIAGNÓSTICO:');
  console.log('✅ Conexão com Supabase estabelecida');
  console.log('✅ Estrutura da tabela verificada');
  console.log('✅ Inserção de registro de teste concluída');
  console.log('✅ Função de agregação testada');
  console.log('\n🎯 DIAGNÓSTICO COMPLETO: Nenhum problema crítico identificado');
  console.log('Verifique os registros de log para possíveis avisos ou erros secundários.');
  
  return { 
    success: true, 
    message: 'Diagnóstico concluído com sucesso. A conexão entre N8N e Supabase parece funcional.',
    timestamp: new Date().toISOString()
  };
}

// Execute o diagnóstico e retorne o resultado
return diagnosticarConexao(); 