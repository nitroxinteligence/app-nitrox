#!/usr/bin/env node

/**
 * Script para aplicar a correção da coluna efficiency no Supabase
 * Executa o SQL definido na migração 20240910000000_fix_efficiency_column.sql
 * 
 * Uso: npm run fix-efficiency
 * Ou: node scripts/apply-fix-efficiency.js
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Necessário usar a chave de serviço para SQL

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Inicializar cliente
const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar se a coluna efficiency existe
async function checkColumnExists() {
  console.log('🔍 Verificando se a coluna efficiency existe...');
  
  try {
    // Tentar selecionar a coluna efficiency diretamente
    const { data, error } = await supabase
      .from('openai_completions_usage')
      .select('efficiency')
      .limit(1);
    
    if (error) {
      if (error.message && error.message.includes('column "efficiency" does not exist')) {
        console.log('🔴 A coluna efficiency não existe na tabela.');
        return false;
      } else {
        console.error('❌ Erro ao verificar a coluna:', error.message);
        // Se for outro erro, assumimos que a coluna existe para continuar com a correção
        return true;
      }
    }
    
    console.log('✅ A coluna efficiency existe na tabela.');
    return true;
  } catch (e) {
    console.error('❌ Exceção ao verificar a coluna:', e);
    // Em caso de erro, prosseguir com a correção
    return true;
  }
}

// Executar SQL com fallback para queries individuais
async function executeSql(sql) {
  // Tentar usar a função rpc exec_sql primeiro (requer função específica no Supabase)
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (!error) {
      return { success: true, error: null };
    }
    
    // Se a função não existe, cai no catch ou continua se for outro erro
    if (error.message && error.message.includes('function exec_sql() does not exist')) {
      console.log('⚠️ Função exec_sql não disponível, usando método alternativo...');
      throw new Error('Function not available');
    } else {
      return { success: false, error };
    }
  } catch (e) {
    // Método alternativo: executar como query direta (com limitações)
    try {
      const { error } = await supabase.realtime.subscribe('direct_sql', {
        config: { query: sql }
      });
      
      if (error) {
        return { success: false, error };
      }
      return { success: true, error: null };
    } catch (directError) {
      // Último recurso: executar operações simples 
      if (sql.trim().toLowerCase().startsWith('alter table') || 
          sql.trim().toLowerCase().startsWith('update')) {
        console.log('⚠️ Tentando executar alteração básica via API...');
        // Não podemos executar este SQL diretamente via API, 
        // então reportamos como erro para ação manual
        return {
          success: false,
          error: new Error('SQL não pode ser executado via API. Execute manualmente no console SQL do Supabase.')
        };
      }
      return { success: false, error: directError };
    }
  }
}

async function main() {
  console.log('🔧 Aplicando correção para a coluna efficiency na tabela openai_completions_usage...');
  
  // Verificar se a coluna existe antes de prosseguir
  const columnExists = await checkColumnExists();
  
  try {
    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, '../supabase/migrations/20240910000000_fix_efficiency_column.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    // Dividir em comandos individuais (para melhor gestão de erros)
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));
    
    console.log(`📝 Encontrados ${sqlCommands.length} comandos SQL para executar`);
    
    // Executar cada comando separadamente
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (!command) continue;
      
      try {
        console.log(`⏳ Executando comando ${i+1}/${sqlCommands.length}...`);
        const { error } = await executeSql(command);
        
        if (error) {
          console.error(`❌ Erro ao executar comando ${i+1}:`, error.message);
          console.error('Comando:', command.substring(0, 100) + '...');
          failureCount++;
        } else {
          console.log(`✅ Comando ${i+1} executado com sucesso`);
          successCount++;
        }
      } catch (cmdError) {
        console.error(`❌ Exceção ao executar comando ${i+1}:`, cmdError);
        failureCount++;
      }
    }
    
    console.log(`📊 Resultado: ${successCount} comandos executados com sucesso, ${failureCount} falhas.`);
    
    if (failureCount > 0) {
      console.log('\n⚠️ ATENÇÃO: Alguns comandos falharam.');
      console.log('Você pode precisar executar estes comandos manualmente através da interface do Supabase SQL:');
      console.log(`1. Acesse https://app.supabase.com/project/_/sql`);
      console.log(`2. Cole o conteúdo do arquivo:`, sqlFilePath);
      console.log(`3. Execute o script SQL manualmente.`);
    }
    
    // Testando a coluna após a correção
    try {
      console.log('\n🧪 Testando a coluna efficiency após a correção...');
      
      const columnExistsAfter = await checkColumnExists();
      
      if (!columnExistsAfter) {
        console.error('❌ A coluna efficiency ainda não existe após as correções!');
        console.error('Você precisará criar a coluna manualmente via SQL:');
        console.error('ALTER TABLE openai_completions_usage ADD COLUMN efficiency INTEGER;');
        process.exit(1);
      }
      
      // Verificar se a função get_completions_usage_by_model está funcionando
      console.log('🧪 Testando a função get_completions_usage_by_model...');
      
      const { data: modelData, error: modelError } = await supabase
        .rpc('get_completions_usage_by_model');
      
      if (modelError) {
        console.error('❌ Erro ao testar a função get_completions_usage_by_model:', modelError.message);
        console.log('Você pode precisar recriar a função manualmente via SQL.');
      } else {
        console.log(`✅ Função get_completions_usage_by_model funciona corretamente: ${modelData.length} modelos retornados`);
        
        // Mostrar um exemplo dos dados retornados
        if (modelData.length > 0) {
          console.log('📊 Exemplo dos dados retornados:');
          console.log(modelData[0]);
        }
      }
      
      // Verificar se os registros têm eficiência calculada
      const { data: records, error: recordsError } = await supabase
        .from('openai_completions_usage')
        .select('id, date, model, input_tokens, output_tokens, efficiency')
        .limit(5);
      
      if (recordsError) {
        console.error('❌ Erro ao verificar registros da tabela:', recordsError.message);
      } else {
        console.log(`✅ Registros verificados com sucesso: ${records.length} registros retornados`);
        
        if (records.length > 0) {
          console.log('📊 Amostra dos registros:');
          records.forEach(record => {
            console.log(`ID: ${record.id}, Data: ${record.date}, Modelo: ${record.model}, Eficiência: ${record.efficiency}`);
          });
        }
      }
    } catch (testError) {
      console.error('❌ Erro ao testar a correção:', testError);
    }
    
    console.log('\n✅ Processo de correção concluído!');
    console.log('📝 IMPORTANTE: Reinicie a aplicação para atualizar o cache do Supabase');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar correção:', error);
    process.exit(1);
  }
}

main(); 