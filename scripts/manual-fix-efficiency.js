/**
 * Script simplificado para corrigir problemas na tabela openai_completions_usage
 * Esta é uma versão alternativa que pode ser executada sem depender de variáveis de ambiente
 * 
 * Para executar:
 * node scripts/manual-fix-efficiency.js
 */

const { createClient } = require('@supabase/supabase-js');

// *** CONFIGURE ESTES VALORES ANTES DE EXECUTAR ***
const SUPABASE_URL = "https://dkvqjisxtdlrdgseiooq.supabase.co"; // Exemplo, substituir pelo valor real
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdnFqaXN4dGRscmRnc2Vpb29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzg2MDY5NSwiZXhwIjoyMDUzNDM2Njk1fQ.kFV65mUt9ljbP9sFaaKQ7JlzL5aiEf-ZOsgdmOk1Lqo"; // Substituir pela chave de serviço real

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Configuração incompleta: defina SUPABASE_URL e SUPABASE_SERVICE_KEY no script');
  process.exit(1);
}

// Inicializar cliente
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Função simplificada para corrigir a tabela
async function fixTable() {
  console.log('🔧 Corrigindo a tabela openai_completions_usage...');
  
  try {
    // 1. Verificar se a coluna efficiency existe
    console.log('1. Verificando se a coluna efficiency existe...');
    
    try {
      const { data, error } = await supabase
        .from('openai_completions_usage')
        .select('efficiency')
        .limit(1);
      
      if (!error) {
        console.log('✅ A coluna efficiency já existe!');
      } else if (error.message && error.message.includes('column "efficiency" does not exist')) {
        console.log('🔴 A coluna efficiency não existe, será criada...');
      } else {
        console.error('❌ Erro ao verificar a coluna:', error.message);
      }
      
    } catch (e) {
      console.error('❌ Erro ao verificar a coluna:', e);
    }
    
    // 2. Adicionar a coluna efficiency
    console.log('2. Adicionando a coluna efficiency...');
    
    const addColumnSQL = "ALTER TABLE openai_completions_usage ADD COLUMN IF NOT EXISTS efficiency INTEGER;";
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apiKey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ sql: addColumnSQL })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Coluna efficiency adicionada com sucesso!');
      } else {
        console.error('❌ Erro ao adicionar coluna:', result);
      }
    } catch (e) {
      console.error('❌ Erro ao fazer requisição:', e);
    }
    
    // 3. Adicionar a restrição UNIQUE que está faltando
    console.log('3. Adicionando restrição UNIQUE nas colunas date e model...');
    
    const addConstraintSQL = `
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'openai_completions_usage_date_model_key' 
              AND conrelid = 'openai_completions_usage'::regclass
          ) THEN
              ALTER TABLE openai_completions_usage 
              ADD CONSTRAINT openai_completions_usage_date_model_key UNIQUE (date, model);
          END IF;
      END $$;
    `;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apiKey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ sql: addConstraintSQL })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Restrição UNIQUE adicionada com sucesso!');
      } else {
        console.error('❌ Erro ao adicionar restrição UNIQUE:', result);
      }
    } catch (e) {
      console.error('❌ Erro ao fazer requisição:', e);
    }
    
    // 4. Atualizar os valores existentes
    console.log('4. Atualizando valores de efficiency existentes...');
    
    const updateQuery = `
      UPDATE openai_completions_usage 
      SET efficiency = 
        CASE 
          WHEN input_tokens > 0 THEN 
            ROUND((output_tokens::NUMERIC / input_tokens::NUMERIC) * 100)::INTEGER
          ELSE 0
        END;
    `;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apiKey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ sql: updateQuery })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Valores atualizados com sucesso!');
      } else {
        console.error('❌ Erro ao atualizar valores:', result);
      }
    } catch (e) {
      console.error('❌ Erro ao fazer requisição de atualização:', e);
    }
    
    // 5. Criar função e trigger para cálculo automático de efficiency
    console.log('5. Criando função e trigger para cálculo automático...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION calculate_efficiency()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.input_tokens > 0 THEN
          NEW.efficiency := ROUND((NEW.output_tokens::NUMERIC / NEW.input_tokens::NUMERIC) * 100)::INTEGER;
        ELSE
          NEW.efficiency := 0;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_calculate_efficiency ON openai_completions_usage;
      CREATE TRIGGER trigger_calculate_efficiency
      BEFORE INSERT OR UPDATE OF input_tokens, output_tokens
      ON openai_completions_usage
      FOR EACH ROW
      EXECUTE FUNCTION calculate_efficiency();
    `;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apiKey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ sql: createFunctionSQL })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Função e trigger criados com sucesso!');
      } else {
        console.error('❌ Erro ao criar função e trigger:', result);
      }
    } catch (e) {
      console.error('❌ Erro ao fazer requisição:', e);
    }
    
    // Verificar se a correção funcionou
    console.log('\n🧪 Verificando correções...');
    
    try {
      // Testar restrição UNIQUE
      const { data: constraintData, error: constraintError } = await supabase
        .from('pg_constraint')
        .select('*')
        .eq('conname', 'openai_completions_usage_date_model_key')
        .limit(1);
      
      if (constraintError) {
        console.log('⚠️ Não foi possível verificar a restrição UNIQUE diretamente.');
      } else if (constraintData && constraintData.length > 0) {
        console.log('✅ Restrição UNIQUE confirmada!');
      }
      
      // Testar inserção
      console.log('🧪 Testando inserção de dados...');
      
      // Dados para teste
      const testDate = new Date().toISOString().split('T')[0];
      const testModel = 'test-model-' + Math.floor(Math.random() * 1000);
      
      const { error: insertError } = await supabase
        .from('openai_completions_usage')
        .upsert({
          date: testDate,
          model: testModel,
          start_time: Math.floor(Date.now() / 1000),
          end_time: Math.floor(Date.now() / 1000) + 3600,
          input_tokens: 100,
          output_tokens: 50,
          num_model_requests: 1,
          created_at: new Date().toISOString()
        }, { 
          onConflict: 'date,model' 
        });
      
      if (insertError) {
        console.error('❌ Teste de inserção falhou:', insertError.message);
      } else {
        console.log('✅ Teste de inserção bem-sucedido!');
      }
    } catch (e) {
      console.error('❌ Erro ao testar correções:', e);
    }
    
    console.log('\n✅ Processo de correção concluído!');
    console.log('📝 IMPORTANTE: Reinicie a aplicação para que o Supabase atualize seu cache de esquema.');
    
    return true;
  } catch (error) {
    console.error('❌ Erro não tratado:', error);
    return false;
  }
}

// Executar a função
fixTable();