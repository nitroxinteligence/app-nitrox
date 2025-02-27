/**
 * Script para sincronização de dados históricos do N8N com o Supabase
 * 
 * Este script permite definir um período de tempo mais amplo para sincronização,
 * útil para carregar execuções históricas que aconteceram antes da implementação
 * da sincronização automática.
 * 
 * Uso:
 *   npx ts-node scripts/carga-historica.ts --dias=30 --batch=10
 */

// Importar requisitos
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Configurações do Supabase não encontradas. Defina as variáveis de ambiente:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Parsear argumentos
const args = process.argv.slice(2);
let dias = 30; // Default: 30 dias
let batchSize = 10; // Default: 10 workflows por vez

args.forEach(arg => {
  if (arg.startsWith('--dias=')) {
    dias = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--batch=')) {
    batchSize = parseInt(arg.split('=')[1], 10);
  }
});

// Validar argumentos
if (isNaN(dias) || dias <= 0) {
  console.error('O número de dias deve ser um número positivo');
  process.exit(1);
}

if (isNaN(batchSize) || batchSize <= 0) {
  console.error('O tamanho do batch deve ser um número positivo');
  process.exit(1);
}

async function iniciarCargaHistorica() {
  console.log('=== Iniciando Carga Histórica ===');
  console.log(`Período: últimos ${dias} dias`);
  console.log(`Batch: ${batchSize} workflows por vez`);
  console.log('');
  
  const startTime = new Date();
  
  try {
    // Chamar a Edge Function com os parâmetros específicos
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        forceSync: true,
        debug: true,
        source: 'carga_historica',
        lookbackDays: dias,
        batchSize: batchSize
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na carga histórica: ${response.status}`);
      console.error(errorText);
      process.exit(1);
    }
    
    const result = await response.json();
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log('');
    console.log('=== Carga Histórica Concluída ===');
    console.log(`Duração: ${duration.toFixed(2)} segundos`);
    console.log(`Workflows processados: ${result.stats?.workflowsProcessed || 0}`);
    console.log(`Execuções processadas: ${result.stats?.executionsProcessed || 0}`);
    console.log(`Registros extraídos: ${result.stats?.recordsExtracted || 0}`);
    console.log(`Registros salvos: ${result.stats?.recordsSaved || 0}`);
    console.log(`Erros: ${result.stats?.errors || 0}`);
    
    // Verificar se houve diferença entre extraídos e salvos
    if (result.stats?.recordsExtracted !== result.stats?.recordsSaved) {
      console.log('');
      console.log('ATENÇÃO: O número de registros extraídos difere do número de registros salvos.');
      console.log('Isso pode ser normal se houver registros duplicados ou com problemas.');
    }
    
    console.log('');
    console.log('Para verificar os dados, acesse a página de monitoramento.');
  } catch (error) {
    console.error('Erro fatal ao executar carga histórica:', error);
    process.exit(1);
  }
}

// Executar a função principal
iniciarCargaHistorica().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
}); 