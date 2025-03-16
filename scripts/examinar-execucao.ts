/**
 * Script para examinar uma execução específica do N8N
 * Este script ajuda a identificar onde podem estar os dados de uso da OpenAI
 * 
 * Uso:
 *   npx ts-node scripts/examinar-execucao.ts --workflow=ID_DO_WORKFLOW --execution=ID_DA_EXECUCAO
 */

// Importar requisitos
require('dotenv').config({ path: '.env.local' });

// Configurações
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || '';
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || '';

// Verificar configurações
if (!N8N_API_URL || !N8N_API_KEY) {
  console.error('Configurações da API do N8N não encontradas.');
  console.error('Defina as variáveis NEXT_PUBLIC_N8N_API_URL e NEXT_PUBLIC_N8N_API_KEY no .env.local');
  process.exit(1);
}

// Parsear argumentos
const args = process.argv.slice(2);
let workflowId = '';
let executionId = '';

args.forEach(arg => {
  if (arg.startsWith('--workflow=')) {
    workflowId = arg.split('=')[1];
  } else if (arg.startsWith('--execution=')) {
    executionId = arg.split('=')[1];
  }
});

// Validar argumentos
if (!workflowId && !executionId) {
  console.error('Uso: npx ts-node scripts/examinar-execucao.ts --workflow=ID_DO_WORKFLOW --execution=ID_DA_EXECUCAO');
  process.exit(1);
}

async function main() {
  console.log('=== Iniciando análise de execução ===');
  
  try {
    // Se não temos ID de execução, mas temos workflow, buscar a execução mais recente
    if (!executionId && workflowId) {
      console.log(`Buscando execução mais recente para o workflow ${workflowId}...`);
      
      const executionsUrl = new URL(`${N8N_API_URL}/executions`);
      executionsUrl.searchParams.append('workflowId', workflowId);
      executionsUrl.searchParams.append('limit', '1');
      
      const executionsResponse = await fetch(executionsUrl.toString(), {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (!executionsResponse.ok) {
        throw new Error(`Erro ao buscar execuções: ${executionsResponse.status}`);
      }
      
      const executionsData = await executionsResponse.json();
      
      if (executionsData.data && executionsData.data.length > 0) {
        executionId = executionsData.data[0].id;
        console.log(`Execução encontrada: ${executionId}`);
      } else {
        throw new Error('Nenhuma execução encontrada para o workflow especificado');
      }
    }
    
    // Com o ID da execução, buscar os detalhes
    console.log(`Buscando detalhes da execução ${executionId}...`);
    
    const executionResponse = await fetch(`${N8N_API_URL}/executions/${executionId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!executionResponse.ok) {
      throw new Error(`Erro ao buscar execução: ${executionResponse.status}`);
    }
    
    const execution = await executionResponse.json();
    
    // Informações básicas da execução
    console.log('\n=== Informações da Execução ===');
    console.log(`ID: ${execution.id}`);
    console.log(`Workflow: ${execution.workflowId}`);
    console.log(`Status: ${execution.status}`);
    console.log(`Início: ${execution.startedAt}`);
    console.log(`Fim: ${execution.stoppedAt}`);
    console.log(`Duração: ${Math.round((new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s`);
    
    // Verificar se temos dados de resultado
    if (!execution.data?.resultData?.runData) {
      console.log('\nEsta execução não contém dados de resultado.');
      process.exit(0);
    }
    
    const runData = execution.data.resultData.runData;
    
    // Listar todos os nós na execução
    console.log('\n=== Nós executados ===');
    for (const nodeName in runData) {
      if (!runData[nodeName] || !Array.isArray(runData[nodeName])) continue;
      console.log(`- ${nodeName} (${runData[nodeName].length} execuções)`);
    }
    
    // Procurar por potenciais respostas da OpenAI
    console.log('\n=== Procurando potenciais respostas da OpenAI ===');
    
    let foundPotentialOpenAI = false;
    const openAIKeys = ['model', 'usage', 'completion_tokens', 'prompt_tokens', 'total_tokens'];
    
    for (const nodeName in runData) {
      if (!runData[nodeName] || !Array.isArray(runData[nodeName])) continue;
      
      // Iterar sobre cada execução do nó
      for (let i = 0; i < runData[nodeName].length; i++) {
        const nodeExecution = runData[nodeName][i];
        
        // Verificar se temos dados JSON
        if (!nodeExecution.data?.json) continue;
        
        const json = nodeExecution.data.json;
        
        // Verificar em campos conhecidos e aninhados
        await checkForOpenAI(json, `${nodeName}.execução[${i}]`);
        
        // Campos aninhados comuns
        for (const field of ['request', 'response', 'data', 'result', 'output']) {
          if (json[field] && typeof json[field] === 'object') {
            await checkForOpenAI(json[field], `${nodeName}.execução[${i}].${field}`);
          }
        }
      }
    }
    
    if (!foundPotentialOpenAI) {
      console.log('Nenhuma resposta potencial da OpenAI encontrada.');
    }
    
    // Função para verificar se um objeto parece ser uma resposta da OpenAI
    async function checkForOpenAI(obj: any, path: string) {
      if (!obj || typeof obj !== 'object') return;
      
      // Verificar campos comuns
      const hasModel = obj.model !== undefined;
      const hasUsage = obj.usage !== undefined || 
                    obj.usage_stats !== undefined || 
                    obj.tokenUsage !== undefined;
      const hasTokens = obj.total_tokens !== undefined || 
                     obj.prompt_tokens !== undefined ||
                     obj.completion_tokens !== undefined;
      const hasObject = obj.object !== undefined && 
                     (obj.object === 'chat.completion' || 
                      obj.object === 'text_completion' ||
                      obj.object === 'embedding');
      
      // Se tiver alguns dos campos chave, registrar como potencial
      if (hasModel || hasUsage || hasTokens || hasObject) {
        console.log(`\nPotencial resposta OpenAI encontrada em: ${path}`);
        foundPotentialOpenAI = true;
        
        // Extrair e exibir campos relevantes
        const relevantFields: any = {};
        
        if (hasModel) relevantFields.model = obj.model;
        if (obj.usage) relevantFields.usage = obj.usage;
        if (obj.tokenUsage) relevantFields.tokenUsage = obj.tokenUsage;
        if (obj.usage_stats) relevantFields.usage_stats = obj.usage_stats;
        if (obj.object) relevantFields.object = obj.object;
        if (obj.prompt_tokens) relevantFields.prompt_tokens = obj.prompt_tokens;
        if (obj.completion_tokens) relevantFields.completion_tokens = obj.completion_tokens;
        if (obj.total_tokens) relevantFields.total_tokens = obj.total_tokens;
        
        console.log('Campos relevantes encontrados:');
        console.log(JSON.stringify(relevantFields, null, 2));
        
        // Sugerir ajustes no extrator
        console.log('\nSugestão de formato para atualizar no extrator:');
        if (obj.model) {
          console.log('- modelo encontrado como: obj.model');
        }
        
        if (obj.usage) {
          if (obj.usage.prompt_tokens !== undefined) {
            console.log('- prompt_tokens encontrado como: obj.usage.prompt_tokens');
          }
          if (obj.usage.completion_tokens !== undefined) {
            console.log('- completion_tokens encontrado como: obj.usage.completion_tokens');
          }
          if (obj.usage.total_tokens !== undefined) {
            console.log('- total_tokens encontrado como: obj.usage.total_tokens');
          }
        } else if (obj.tokenUsage) {
          if (obj.tokenUsage.promptTokens !== undefined) {
            console.log('- prompt_tokens encontrado como: obj.tokenUsage.promptTokens');
          }
          if (obj.tokenUsage.completionTokens !== undefined) {
            console.log('- completion_tokens encontrado como: obj.tokenUsage.completionTokens');
          }
          if (obj.tokenUsage.totalTokens !== undefined) {
            console.log('- total_tokens encontrado como: obj.tokenUsage.totalTokens');
          }
        } else if (obj.usage_stats) {
          console.log('- Formato não padrão em usage_stats, verificar estrutura');
        }
      }
    }
    
  } catch (error) {
    console.error('\nErro durante a análise:', error);
    process.exit(1);
  }
}

main().catch(console.error); 