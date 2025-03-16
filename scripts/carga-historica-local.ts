/**
 * Script para sincronização de dados históricos do N8N com o Supabase
 * 
 * Versão LOCAL que utiliza a API HTTP do Next.js ao invés da Edge Function.
 * 
 * Uso:
 *   npx ts-node scripts/carga-historica-local.ts --dias=30 --batch=10 --modo=avancado
 */

// Importar requisitos
require('dotenv').config({ path: '.env.local' });

// URL base da aplicação (localhost por padrão)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'sync-n8n-cron-secret';

// Parsear argumentos
const args = process.argv.slice(2);
let dias = 30; // Default: 30 dias
let batchSize = 10; // Default: 10 workflows por vez
let modo = 'normal'; // Default: modo normal (compatibilidade)

args.forEach(arg => {
  if (arg.startsWith('--dias=')) {
    dias = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--batch=')) {
    batchSize = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--modo=')) {
    modo = arg.split('=')[1].toLowerCase();
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

if (modo !== 'normal' && modo !== 'avancado') {
  console.error('O modo deve ser "normal" ou "avancado"');
  console.error('  - normal: usa o modo de extração padrão');
  console.error('  - avancado: usa o modo de extração avançado com identificação de nós OpenAI');
  process.exit(1);
}

async function iniciarCargaHistorica() {
  console.log('=== Iniciando Carga Histórica ===');
  console.log(`Período: últimos ${dias} dias`);
  console.log(`Batch: ${batchSize} workflows por vez`);
  console.log(`Modo: ${modo}`);
  console.log(`Usando API em: ${BASE_URL}`);
  console.log('');
  
  const startTime = new Date();
  
  try {
    // Chamamos diferentes endpoints dependendo do modo
    let endpoint = '';
    
    if (modo === 'avancado') {
      console.log('Usando modo AVANÇADO: identificação direta de nós OpenAI');
      endpoint = `${BASE_URL}/api/cron/sync-n8n`;
    } else {
      console.log('Usando modo NORMAL: extração padrão');
      endpoint = `${BASE_URL}/api/cron/sync-n8n`;
    }
    
    // Chamar a API local com os parâmetros específicos
    const response = await fetch(`${endpoint}?token=${CRON_SECRET}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      body: JSON.stringify({
        forceSync: true,
        debug: true,
        source: 'carga_historica',
        lookbackDays: dias,
        batchSize: batchSize,
        mode: modo
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
    console.log(`Workflows processados: ${result.stats?.workflowsProcessados || 0}`);
    console.log(`Nós OpenAI encontrados: ${result.stats?.nodesOpenAI || 0}`);
    console.log(`Execuções processadas: ${result.stats?.execucoesProcessadas || 0}`);
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