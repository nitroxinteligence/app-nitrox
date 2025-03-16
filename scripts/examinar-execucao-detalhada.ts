// import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';

// Configuração
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || 'http://localhost:5678/api/v1';
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || '';

// Definir opções de linha de comando
program
  .option('-w, --workflow <id>', 'ID do workflow para analisar')
  .option('-e, --execution <id>', 'ID específico da execução para analisar')
  .option('-o, --output <path>', 'Caminho para salvar o resultado da análise', 'analise-execucao.json')
  .option('-d, --depth <number>', 'Profundidade máxima para exibir objetos aninhados', '3')
  .option('--full', 'Mostrar dados completos sem truncar', false);

program.parse(process.argv);
const options = program.opts();

// Interfaces para tipagem
interface ExecutionData {
  data?: {
    id: string;
    workflowId: string;
    workflowName?: string;
    status: string;
    startedAt: string;
    stoppedAt: string;
    mode: string;
    data?: {
      resultData?: {
        runData?: Record<string, any[]>;
        [key: string]: any;
      };
      [key: string]: any;
    };
    [key: string]: any;
  }[];
}

interface ExecutionDetail {
  data?: {
    id: string;
    workflowId: string;
    workflowName?: string;
    status: string;
    startedAt: string;
    stoppedAt: string;
    mode: string;
    data?: {
      resultData?: {
        runData?: Record<string, any[]>;
        [key: string]: any;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// Função principal
async function analisarExecucao() {
  try {
    if (!N8N_API_KEY) {
      throw new Error('API Key do N8N não configurada. Configure a variável de ambiente NEXT_PUBLIC_N8N_API_KEY.');
    }

    console.log(`Conectando à API do N8N: ${N8N_API_URL}`);

    // Verificar se temos ID do workflow
    if (!options.workflow && !options.execution) {
      throw new Error('É necessário fornecer o ID do workflow (-w) ou o ID da execução (-e)');
    }

    let executionId = options.execution;

    // Se não temos ID da execução, mas temos ID do workflow, buscar a execução mais recente
    if (!executionId && options.workflow) {
      console.log(`Buscando execução mais recente para o workflow ${options.workflow}...`);
      
      const executionsUrl = new URL(`${N8N_API_URL}/executions`);
      executionsUrl.searchParams.append('workflowId', options.workflow);
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
      
      const executionsData = await executionsResponse.json() as ExecutionData;
      
      if (!executionsData.data || executionsData.data.length === 0) {
        throw new Error(`Nenhuma execução encontrada para o workflow ${options.workflow}`);
      }
      
      executionId = executionsData.data[0].id;
      console.log(`Encontrada execução mais recente: ${executionId}`);
    }

    // Buscar detalhes da execução
    console.log(`Buscando detalhes da execução ${executionId}...`);
    
    const executionUrl = `${N8N_API_URL}/executions/${executionId}`;
    const executionResponse = await fetch(executionUrl, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!executionResponse.ok) {
      throw new Error(`Erro ao buscar detalhes da execução: ${executionResponse.status}`);
    }
    
    const executionData = await executionResponse.json() as ExecutionDetail;
    
    if (!executionData.data) {
      throw new Error('Dados da execução não encontrados');
    }
    
    const execution = executionData.data;
    
    // Analisar a estrutura da execução
    console.log('\n=== ANÁLISE DA EXECUÇÃO ===');
    console.log(`ID: ${execution.id}`);
    console.log(`Workflow: ${execution.workflowId} (${execution.workflowName || 'Nome não disponível'})`);
    console.log(`Status: ${execution.status}`);
    console.log(`Iniciada em: ${execution.startedAt}`);
    console.log(`Finalizada em: ${execution.stoppedAt}`);
    console.log(`Duração: ${(new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000}s`);
    
    // Verificar estrutura de dados
    console.log('\n=== ESTRUTURA DE DADOS ===');
    
    if (execution.data) {
      console.log(`Campos disponíveis: ${Object.keys(execution.data).join(', ')}`);
      
      if (execution.data.resultData) {
        console.log(`\nCampos em resultData: ${Object.keys(execution.data.resultData).join(', ')}`);
        
        if (execution.data.resultData.runData) {
          const runDataKeys = Object.keys(execution.data.resultData.runData);
          console.log(`\nNós em runData (${runDataKeys.length}): ${runDataKeys.join(', ')}`);
          
          // Analisar cada nó no runData
          console.log('\n=== ANÁLISE DOS NÓS ===');
          
          for (const nodeId of runDataKeys) {
            const nodeData = execution.data.resultData.runData[nodeId];
            
            if (!nodeData || !Array.isArray(nodeData) || nodeData.length === 0) {
              console.log(`\nNó "${nodeId}": Sem dados`);
              continue;
            }
            
            console.log(`\nNó "${nodeId}" (${nodeData.length} execuções):`);
            
            // Analisar cada execução do nó
            for (let i = 0; i < nodeData.length; i++) {
              const nodeExecution = nodeData[i];
              console.log(`  Execução ${i+1}:`);
              
              if (!nodeExecution.data) {
                console.log('    Sem dados');
                continue;
              }
              
              // Verificar data.json
              if (nodeExecution.data.json) {
                console.log('    data.json disponível');
                
                // Verificar se há dados da OpenAI
                const json = nodeExecution.data.json;
                
                // Verificar modelo
                if (json.model) {
                  console.log(`    Modelo: ${json.model}`);
                }
                
                // Verificar usage
                if (json.usage) {
                  console.log(`    Usage: prompt_tokens=${json.usage.prompt_tokens || 0}, completion_tokens=${json.usage.completion_tokens || 0}, total_tokens=${json.usage.total_tokens || 0}`);
                } else if (json.tokenUsage) {
                  console.log(`    TokenUsage: promptTokens=${json.tokenUsage.promptTokens || 0}, completionTokens=${json.tokenUsage.completionTokens || 0}, totalTokens=${json.tokenUsage.totalTokens || 0}`);
                }
                
                // Verificar campos aninhados
                for (const field of ['data', 'response', 'result', 'output', 'content']) {
                  if (json[field] && typeof json[field] === 'object') {
                    console.log(`    Campo "${field}" disponível`);
                    
                    if (json[field].model) {
                      console.log(`    Modelo em ${field}: ${json[field].model}`);
                    }
                    
                    if (json[field].usage) {
                      console.log(`    Usage em ${field}: prompt_tokens=${json[field].usage.prompt_tokens || 0}, completion_tokens=${json[field].usage.completion_tokens || 0}, total_tokens=${json[field].usage.total_tokens || 0}`);
                    } else if (json[field].tokenUsage) {
                      console.log(`    TokenUsage em ${field}: promptTokens=${json[field].tokenUsage.promptTokens || 0}, completionTokens=${json[field].tokenUsage.completionTokens || 0}, totalTokens=${json[field].tokenUsage.totalTokens || 0}`);
                    }
                  }
                }
                
                // Mostrar estrutura completa do JSON
                const maxDepth = parseInt(options.depth, 10);
                console.log(`    Estrutura do JSON (profundidade ${maxDepth}):`);
                console.log(stringifyWithDepth(json, maxDepth));
              }
              
              // Verificar data.binary
              if (nodeExecution.data.binary) {
                console.log('    data.binary disponível');
                
                for (const binaryKey in nodeExecution.data.binary) {
                  console.log(`    Binary "${binaryKey}": ${nodeExecution.data.binary[binaryKey].mimeType}`);
                  
                  // Tentar decodificar dados binários se forem JSON
                  try {
                    if (nodeExecution.data.binary[binaryKey].mimeType.includes('json') || 
                        nodeExecution.data.binary[binaryKey].mimeType.includes('text')) {
                      const decodedData = Buffer.from(nodeExecution.data.binary[binaryKey].data, 'base64').toString('utf-8');
                      
                      try {
                        const jsonData = JSON.parse(decodedData);
                        const maxDepth = parseInt(options.depth, 10);
                        console.log(`    Dados JSON decodificados de "${binaryKey}":`);
                        console.log(stringifyWithDepth(jsonData, maxDepth));
                      } catch (jsonError) {
                        console.log(`    Dados não são JSON válido: ${decodedData.substring(0, 100)}...`);
                      }
                    }
                  } catch (err: any) {
                    console.log(`    Erro ao decodificar dados binários: ${err.message}`);
                  }
                }
              }
            }
          }
        } else {
          console.log('\nrunData não está presente!');
        }
      } else {
        console.log('\nresultData não está presente!');
      }
    } else {
      console.log('\nNenhum dado na execução!');
    }
    
    // Salvar resultado completo em arquivo
    if (options.output) {
      const outputPath = path.resolve(options.output);
      console.log(`\nSalvando análise completa em ${outputPath}`);
      
      // Se a opção full estiver ativada, salvar os dados completos
      // Caso contrário, salvar uma versão simplificada
      const dataToSave = options.full ? execution : {
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflowName,
        status: execution.status,
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        mode: execution.mode,
        dataAvailable: !!execution.data,
        resultDataAvailable: !!(execution.data && execution.data.resultData),
        runDataAvailable: !!(execution.data && execution.data.resultData && execution.data.resultData.runData),
        nodesInRunData: execution.data && execution.data.resultData && execution.data.resultData.runData ? 
          Object.keys(execution.data.resultData.runData) : []
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(dataToSave, null, 2));
    }
    
    console.log('\nAnálise concluída!');
    
  } catch (error: any) {
    console.error(`\nErro: ${error.message}`);
    process.exit(1);
  }
}

// Função para stringificar objetos com limite de profundidade
function stringifyWithDepth(obj: any, maxDepth: number, currentDepth: number = 0): string {
  if (currentDepth >= maxDepth) {
    if (Array.isArray(obj)) {
      return `Array(${obj.length})`;
    } else if (obj !== null && typeof obj === 'object') {
      return `Object{${Object.keys(obj).join(', ')}}`;
    } else {
      return String(obj);
    }
  }
  
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    
    const items = obj.slice(0, 3).map(item => 
      stringifyWithDepth(item, maxDepth, currentDepth + 1)
    );
    
    if (obj.length > 3) {
      items.push(`... (${obj.length - 3} mais)`);
    }
    
    return `[\n${'  '.repeat(currentDepth + 1)}${items.join(`,\n${'  '.repeat(currentDepth + 1)}`)}\n${'  '.repeat(currentDepth)}]`;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    const entries = keys.slice(0, 5).map(key => 
      `${key}: ${stringifyWithDepth(obj[key], maxDepth, currentDepth + 1)}`
    );
    
    if (keys.length > 5) {
      entries.push(`... (${keys.length - 5} mais propriedades)`);
    }
    
    return `{\n${'  '.repeat(currentDepth + 1)}${entries.join(`,\n${'  '.repeat(currentDepth + 1)}`)}\n${'  '.repeat(currentDepth)}}`;
  }
  
  if (typeof obj === 'string') {
    if (obj.length > 100 && !options.full) {
      return `"${obj.substring(0, 100)}..."`;
    }
    return JSON.stringify(obj);
  }
  
  return String(obj);
}

// Executar função principal
analisarExecucao().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
}); 