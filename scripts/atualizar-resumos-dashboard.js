#!/usr/bin/env node

/**
 * Script para atualizar manualmente os resumos diários no dashboard
 * 
 * Este script se conecta ao Supabase e chama o procedimento armazenado
 * para atualizar as tabelas de resumo do dashboard.
 * 
 * Uso:
 *   node scripts/atualizar-resumos-dashboard.js [dias]
 * 
 * Onde [dias] é o número de dias para atualizar (padrão: 30)
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
  // Obter o número de dias como argumento da linha de comando
  const dias = parseInt(process.argv[2], 10) || 30;
  
  console.log(`=== Atualizando resumos diários do dashboard para os últimos ${dias} dias ===`);
  console.log(`URL do Supabase: ${supabaseUrl}`);
  
  try {
    console.log('\nVerificando se as tabelas de resumo existem...');
    
    // Verificar se a tabela openai_daily_summary existe
    const { data: resumoDiario, error: erroResumoDiario } = await supabase
      .from('openai_daily_summary')
      .select('count(*)', { count: 'exact' })
      .limit(1);
    
    if (erroResumoDiario) {
      if (erroResumoDiario.code === '42P01') {
        console.error('\nErro: A tabela openai_daily_summary não existe no Supabase.');
        console.log('Execute o script SQL scripts/criar-tabelas-dashboard.sql para criar as tabelas necessárias.');
        return;
      } else {
        console.error('\nErro ao verificar a tabela de resumo diário:', erroResumoDiario);
        return;
      }
    }
    
    // Verificar se a tabela workflow_daily_summary existe
    const { data: resumoWorkflow, error: erroResumoWorkflow } = await supabase
      .from('workflow_daily_summary')
      .select('count(*)', { count: 'exact' })
      .limit(1);
    
    if (erroResumoWorkflow) {
      if (erroResumoWorkflow.code === '42P01') {
        console.error('\nErro: A tabela workflow_daily_summary não existe no Supabase.');
        console.log('Execute o script SQL scripts/criar-tabelas-dashboard.sql para criar as tabelas necessárias.');
        return;
      } else {
        console.error('\nErro ao verificar a tabela de resumo por workflow:', erroResumoWorkflow);
        return;
      }
    }
    
    console.log('✅ Tabelas de resumo verificadas com sucesso.');
    
    // Chamar o procedimento armazenado para atualizar os resumos
    console.log(`\nChamando procedimento para atualizar resumos para os últimos ${dias} dias...`);
    
    const { error: erroAtualizacao } = await supabase.rpc('update_daily_summaries', { days_lookback: dias });
    
    if (erroAtualizacao) {
      console.error('\nErro ao atualizar resumos:', erroAtualizacao);
      console.log('Verifique se o procedimento update_daily_summaries existe no banco de dados.');
      console.log('Execute o script SQL scripts/criar-tabelas-dashboard.sql para criar as funções necessárias.');
      return;
    }
    
    console.log('✅ Resumos atualizados com sucesso!');
    
    // Verificar os registros atualizados
    const { data: contagem, error: erroContagem } = await supabase
      .from('openai_daily_summary')
      .select('count(*)', { count: 'exact' });
    
    if (!erroContagem) {
      console.log(`\nRegistros na tabela openai_daily_summary: ${contagem?.count || 0}`);
    }
    
    const { data: contagemWorkflow, error: erroContagemWorkflow } = await supabase
      .from('workflow_daily_summary')
      .select('count(*)', { count: 'exact' });
    
    if (!erroContagemWorkflow) {
      console.log(`Registros na tabela workflow_daily_summary: ${contagemWorkflow?.count || 0}`);
    }
    
    console.log('\n=== Atualização concluída com sucesso ===');
    console.log('Os dados do dashboard agora devem estar atualizados.');
    console.log('Atualize a página do dashboard para ver as alterações.');
    
  } catch (error) {
    console.error('\nErro durante a atualização:', error.message);
    process.exit(1);
  }
}

// Executar a função principal
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
}); 