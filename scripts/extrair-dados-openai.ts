/**
 * Script avançado para extrair dados de uso da OpenAI diretamente dos nós OpenAI no N8N
 * Foca especificamente em nós: OpenAI, OpenAI Chat Model, Embeddings OpenAI
 * 
 * Uso:
 *   npx ts-node scripts/extrair-dados-openai.ts --dias=30
 */

// Importar requisitos
require('dotenv').config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

// Configurações
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || '';
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Verificar configurações
if (!N8N_API_URL || !N8N_API_KEY) {
  console.error('Configurações da API do N8N não encontradas.');
  console.error('Defina as variáveis NEXT_PUBLIC_N8N_API_URL e NEXT_PUBLIC_N8N_API_KEY no .env.local');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Configurações do Supabase não encontradas.');
  console.error('Defina as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Tipos OpenAI
interface OpenAINode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: any;
}

interface OpenAIExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  timestamp: string;
  workflowId: string;
  workflowName: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  parameters?: any;
  rawData?: any;
}

// Parsear argumentos
const args = process.argv.slice(2);
let dias = 30; // Default: 30 dias

args.forEach(arg => {
  if (arg.startsWith('--dias=')) {
    dias = parseInt(arg.split('=')[1], 10);
  }
});

// Validar argumentos
if (isNaN(dias) || dias <= 0) {
  console.error('O número de dias deve ser um número positivo');
  process.exit(1);
}

async function main() {
  console.log('=== Iniciando Extração Avançada de Dados OpenAI do N8N ===');
  console.log(`Período: últimos ${dias} dias`);
  
  const startTime = new Date();
  
  // Estatísticas para retorno
  const stats = {
    workflowsProcessados: 0,
    nodesOpenAI: 0,
    execucoesProcessadas: 0,
    registrosExtraidos: 0,
    registrosSalvos: 0,
    erros: 0
  };
  
  try {
    // 1. Buscar workflows com tag 'agent'
    console.log('Buscando workflows com tag "agent"...');
    
    const workflowsResponse = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error(`Erro ao buscar workflows: ${workflowsResponse.status}`);
    }
    
    const workflowsData = await workflowsResponse.json();
    const allWorkflows = workflowsData.data || [];
    
    // Filtrar workflows com tag 'agent'
    const agentWorkflows = allWorkflows.filter((wf: any) => hasAgentTag(wf));
    
    console.log(`Encontrados ${agentWorkflows.length} workflows com tag agent`);
    
    // 2. Para cada workflow, buscar a definição completa para identificar nós OpenAI
    const allRecords: any[] = [];
    
    for (const workflowSummary of agentWorkflows) {
      try {
        console.log(`\nAnalisando workflow: ${workflowSummary.name} (ID: ${workflowSummary.id})`);
        stats.workflowsProcessados++;
        
        // Buscar a definição completa do workflow
        const workflowResponse = await fetch(`${N8N_API_URL}/workflows/${workflowSummary.id}`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        if (!workflowResponse.ok) {
          console.error(`  Erro ao buscar definição do workflow: ${workflowResponse.status}`);
          stats.erros++;
          continue;
        }
        
        const workflow = await workflowResponse.json();
        
        // Encontrar nós de OpenAI
        const openaiNodes = findOpenAINodes(workflow);
        stats.nodesOpenAI += openaiNodes.length;
        
        if (openaiNodes.length === 0) {
          console.log(`  Nenhum nó OpenAI encontrado neste workflow.`);
          continue;
        }
        
        console.log(`  Encontrados ${openaiNodes.length} nós OpenAI:`);
        openaiNodes.forEach(node => {
          console.log(`    - ${node.name} (${node.type})`);
        });
        
        // 3. Buscar execuções recentes do workflow
        console.log(`  Buscando execuções dos últimos ${dias} dias...`);
        
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - dias);
        
        const executionsUrl = new URL(`${N8N_API_URL}/executions`);
        executionsUrl.searchParams.append('workflowId', workflow.id);
        executionsUrl.searchParams.append('limit', '100');
        
        const executionsResponse = await fetch(executionsUrl.toString(), {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        if (!executionsResponse.ok) {
          console.error(`  Erro ao buscar execuções: ${executionsResponse.status}`);
          stats.erros++;
          continue;
        }
        
        const executionsData = await executionsResponse.json();
        const executions = executionsData.data || [];
        
        console.log(`  Encontradas ${executions.length} execuções.`);
        
        // 4. Para cada execução, extrair dados dos nós OpenAI
        const openAIExecutions: OpenAIExecution[] = [];
        
        for (const execution of executions) {
          try {
            stats.execucoesProcessadas++;
            
            // Processar a execução para extrair dados dos nós OpenAI
            const executionData = await processExecution(execution, openaiNodes, workflow);
            openAIExecutions.push(...executionData);
          } catch (error) {
            console.error(`  Erro ao processar execução ${execution.id}:`, error);
            stats.erros++;
          }
        }
        
        console.log(`  Extraídos ${openAIExecutions.length} registros de uso da OpenAI.`);
        stats.registrosExtraidos += openAIExecutions.length;
        
        // 5. Formatar registros para o Supabase
        if (openAIExecutions.length > 0) {
          const supabaseRecords = openAIExecutions.map(execution => 
            formatRecordForSupabase(execution, workflow)
          );
          
          allRecords.push(...supabaseRecords);
        }
        
      } catch (error) {
        console.error(`Erro ao processar workflow ${workflowSummary.id}:`, error);
        stats.erros++;
      }
    }
    
    // 6. Salvar todos os registros no Supabase
    if (allRecords.length > 0) {
      console.log(`\nSalvando ${allRecords.length} registros no Supabase...`);
      
      // Dividir em lotes para evitar limites da API
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < allRecords.length; i += batchSize) {
        batches.push(allRecords.slice(i, i + batchSize));
      }
      
      console.log(`Dividido em ${batches.length} lotes.`);
      
      // Inserir cada lote
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Inserindo lote ${i+1}/${batches.length} (${batch.length} registros)`);
        
        try {
          const { data, error } = await supabase
            .from('openai_usage')
            .upsert(batch, { 
              onConflict: 'request_id',
              ignoreDuplicates: false
            });
          
          if (error) {
            throw new Error(`Erro ao inserir registros: ${error.message}`);
          }
          
          stats.registrosSalvos += batch.length;
        } catch (insertError) {
          console.error(`Erro ao inserir lote ${i+1}:`, insertError);
          stats.erros++;
        }
      }
      
      // 7. Atualizar agregações
      try {
        console.log('Atualizando agregações diárias...');
        
        // Atualizar resumo diário
        const { error: dailySummaryError } = await supabase.rpc('update_openai_daily_summary');
        
        if (dailySummaryError) {
          console.warn(`Aviso: Não foi possível atualizar resumo diário: ${dailySummaryError.message}`);
        } else {
          console.log('Resumo diário atualizado com sucesso.');
        }
        
        // Atualizar execuções recentes
        const { error: recentExecutionsError } = await supabase.rpc('update_recent_agent_executions');
        
        if (recentExecutionsError) {
          console.warn(`Aviso: Não foi possível atualizar execuções recentes: ${recentExecutionsError.message}`);
        } else {
          console.log('Execuções recentes atualizadas com sucesso.');
        }
      } catch (aggregationError) {
        console.warn('Aviso: Erro ao atualizar agregações:', aggregationError);
      }
    } else {
      console.log('\nNenhum registro para inserir.');
    }
    
    // Calcular duração total
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`\n=== Extração Concluída ===`);
    console.log(`Duração: ${duration.toFixed(2)} segundos`);
    console.log(`Workflows processados: ${stats.workflowsProcessados}`);
    console.log(`Nós OpenAI encontrados: ${stats.nodesOpenAI}`);
    console.log(`Execuções processadas: ${stats.execucoesProcessadas}`);
    console.log(`Registros extraídos: ${stats.registrosExtraidos}`);
    console.log(`Registros salvos: ${stats.registrosSalvos}`);
    console.log(`Erros: ${stats.erros}`);
    
  } catch (error) {
    console.error('Erro fatal durante a extração:', error);
    process.exit(1);
  }
}

// Função para verificar tag 'agent'
function hasAgentTag(workflow: any): boolean {
  if (!workflow.tags || !Array.isArray(workflow.tags) || workflow.tags.length === 0) {
    return false;
  }
  
  return workflow.tags.some((tag: any) => {
    // Caso 1: tag é uma string
    if (typeof tag === 'string') {
      return tag.toLowerCase() === 'agent';
    }
    // Caso 2: tag é um objeto com propriedade name
    else if (tag && typeof tag === 'object' && tag.name) {
      return tag.name.toLowerCase() === 'agent';
    }
    // Caso 3: tag é um objeto com propriedade id e text
    else if (tag && typeof tag === 'object' && tag.id && tag.text) {
      return tag.text.toLowerCase() === 'agent';
    }
    return false;
  });
}

// Função para encontrar nós OpenAI no workflow
function findOpenAINodes(workflow: any): OpenAINode[] {
  const openaiNodes: OpenAINode[] = [];
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return openaiNodes;
  }
  
  // Tipos de nós OpenAI para procurar
  const openaiNodeTypes = [
    'n8n-nodes-base.openAi',
    'n8n-nodes-base.openAiChatModel',
    'n8n-nodes-base.openAiEmbedding',
    'n8n-nodes-base.openAiAssistant',
    'n8n-nodes-base.openAiTextCompletion',
    'n8n-nodes-base.openAiCreateImage',
    // Adicionar outros tipos de nós relevantes
  ];
  
  // Verificar também pelo nome do nó (pode ser personalizado pelo usuário)
  const openaiNodeNamePatterns = [
    /openai/i,
    /gpt/i,
    /chatgpt/i,
    /assistant/i,
    /embedding/i,
    /completion/i,
    // Adicionar outros padrões relevantes
  ];
  
  for (const node of workflow.nodes) {
    // Verificar por tipo
    const matchesByType = openaiNodeTypes.some(type => 
      node.type === type
    );
    
    // Verificar por nome
    const matchesByName = openaiNodeNamePatterns.some(pattern => 
      pattern.test(node.name)
    );
    
    if (matchesByType || matchesByName) {
      openaiNodes.push({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position,
        parameters: node.parameters
      });
    }
  }
  
  return openaiNodes;
}

// Função para processar uma execução e extrair dados dos nós OpenAI
async function processExecution(
  execution: any, 
  openaiNodes: OpenAINode[], 
  workflow: any
): Promise<OpenAIExecution[]> {
  const results: OpenAIExecution[] = [];
  
  // Se não temos dados detalhados, buscar a execução completa
  if (!execution.data && execution.id) {
    try {
      const executionResponse = await fetch(`${N8N_API_URL}/executions/${execution.id}`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (!executionResponse.ok) {
        console.warn(`  Aviso: Não foi possível obter detalhes da execução ${execution.id}`);
        return results;
      }
      
      execution = await executionResponse.json();
    } catch (error) {
      console.warn(`  Aviso: Erro ao buscar detalhes da execução ${execution.id}`);
      return results;
    }
  }
  
  // Timestamp da execução
  const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
  
  // Se tivermos dados de resultado da execução
  if (execution.data?.resultData?.runData) {
    const runData = execution.data.resultData.runData;
    
    // Para cada nó OpenAI, verificar dados da execução
    for (const openaiNode of openaiNodes) {
      // Verificar se temos resultados para este nó
      if (runData[openaiNode.name] && Array.isArray(runData[openaiNode.name])) {
        for (const nodeExecution of runData[openaiNode.name]) {
          // Tentar extrair dados do resultado
          if (nodeExecution.data?.json) {
            const openAIData = extractOpenAIData(nodeExecution.data.json, openaiNode, timestamp, execution.id);
            
            if (openAIData) {
              openAIData.workflowId = workflow.id;
              openAIData.workflowName = workflow.name;
              results.push(openAIData);
            }
          }
        }
      }
    }
  }
  
  // Se após todas as verificações não tivermos nenhum resultado,
  // vamos criar registros baseados nos parâmetros dos nós
  if (results.length === 0) {
    // Estratégia alternativa: criar registros estimados com base nos parâmetros do nó
    for (const openaiNode of openaiNodes) {
      const estimatedData = estimateOpenAIUsage(openaiNode, timestamp, execution.id, workflow);
      if (estimatedData) {
        results.push(estimatedData);
      }
    }
  }
  
  return results;
}

// Função para extrair dados de uso da OpenAI dos resultados
function extractOpenAIData(
  json: any, 
  node: OpenAINode, 
  timestamp: string, 
  executionId: string
): OpenAIExecution | null {
  // Verificar se temos dados relevantes
  const hasOpenAIData = (
    json.model || 
    json.usage || 
    json.tokenUsage || 
    json.prompt_tokens || 
    json.completion_tokens || 
    json.total_tokens ||
    (json.object && ['chat.completion', 'text_completion', 'embedding'].includes(json.object))
  );
  
  if (!hasOpenAIData) {
    // Verificar em campos aninhados comuns
    for (const field of ['data', 'response', 'result', 'output']) {
      if (json[field] && typeof json[field] === 'object') {
        if (json[field].model || json[field].usage || json[field].tokenUsage) {
          json = json[field];
          break;
        }
      }
    }
  }
  
  // Extrair modelo
  let model = '';
  if (json.model) {
    model = json.model;
  } else if (node.parameters?.model) {
    model = node.parameters.model;
  } else if (json.data?.model) {
    model = json.data.model;
  }
  
  // Extrair tokens
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  
  // Verificar formatos comuns
  if (json.usage) {
    promptTokens = json.usage.prompt_tokens || 0;
    completionTokens = json.usage.completion_tokens || 0;
    totalTokens = json.usage.total_tokens || (promptTokens + completionTokens);
  } else if (json.tokenUsage) {
    promptTokens = json.tokenUsage.promptTokens || 0;
    completionTokens = json.tokenUsage.completionTokens || 0;
    totalTokens = json.tokenUsage.totalTokens || (promptTokens + completionTokens);
  } else {
    promptTokens = json.prompt_tokens || 0;
    completionTokens = json.completion_tokens || 0;
    totalTokens = json.total_tokens || (promptTokens + completionTokens);
  }
  
  // Se não temos nem modelo nem tokens, retornar null
  if (!model && totalTokens === 0) {
    return null;
  }
  
  // Calcular custo estimado
  const cost = calculateOpenAICost(model, promptTokens, completionTokens);
  
  return {
    id: `${executionId}_${node.id}_${Date.now()}`,
    nodeId: node.id,
    nodeName: node.name,
    timestamp,
    workflowId: '',  // Preenchido depois
    workflowName: '', // Preenchido depois
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    cost,
    parameters: node.parameters,
    rawData: json
  };
}

// Função para estimar uso da OpenAI com base nos parâmetros do nó
function estimateOpenAIUsage(
  node: OpenAINode, 
  timestamp: string, 
  executionId: string, 
  workflow: any
): OpenAIExecution | null {
  // Extrair modelo dos parâmetros do nó
  let model = '';
  let promptEstimate = 0;
  
  if (node.parameters?.model) {
    model = node.parameters.model;
  }
  
  // Se não temos modelo, verificar o tipo do nó
  if (!model) {
    if (node.type.includes('openAiChatModel')) {
      model = 'gpt-3.5-turbo';
    } else if (node.type.includes('openAiTextCompletion')) {
      model = 'text-davinci-003';
    } else if (node.type.includes('openAiEmbedding')) {
      model = 'text-embedding-ada-002';
    } else if (node.type.includes('openAiAssistant')) {
      model = 'gpt-4';
    } else {
      model = 'unknown';
    }
  }
  
  // Estimar tokens baseado em parâmetros (aproximação muito grosseira)
  if (node.parameters?.messages && Array.isArray(node.parameters.messages)) {
    promptEstimate = node.parameters.messages.reduce((acc: number, msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return acc + (content.length / 4); // Estimativa grosseira: 4 caracteres ~= 1 token
    }, 0);
  } else if (node.parameters?.prompt) {
    const promptContent = typeof node.parameters.prompt === 'string' ? 
      node.parameters.prompt : JSON.stringify(node.parameters.prompt);
    promptEstimate = promptContent.length / 4;
  }
  
  // Arredondar para número inteiro
  promptEstimate = Math.round(promptEstimate) || 10; // Mínimo de 10 tokens
  
  // Completions: assumir proporção típica 3:1 entre prompt e completion para chat
  const completionEstimate = model.includes('gpt-4') || model.includes('gpt-3.5') ? 
    Math.round(promptEstimate / 3) : 0;
  
  // Calcular custo estimado
  const cost = calculateOpenAICost(model, promptEstimate, completionEstimate);
  
  return {
    id: `${executionId}_${node.id}_${Date.now()}`,
    nodeId: node.id,
    nodeName: node.name,
    timestamp,
    workflowId: workflow.id,
    workflowName: workflow.name,
    model,
    promptTokens: promptEstimate,
    completionTokens: completionEstimate,
    totalTokens: promptEstimate + completionEstimate,
    cost,
    parameters: node.parameters
  };
}

// Função para calcular custo da OpenAI
function calculateOpenAICost(model: string, promptTokens: number, completionTokens: number): number {
  // Preço por 1000 tokens (em USD)
  const prices: Record<string, [number, number]> = {
    // GPT-4
    'gpt-4': [0.03, 0.06],
    'gpt-4-32k': [0.06, 0.12],
    'gpt-4o': [0.005, 0.015],
    'gpt-4o-mini': [0.0015, 0.002],
    'gpt-4-turbo': [0.01, 0.03],
    'gpt-4-vision': [0.01, 0.03],
    
    // GPT-3.5
    'gpt-3.5-turbo': [0.0015, 0.002],
    'gpt-3.5-turbo-16k': [0.003, 0.004],
    'gpt-3.5-turbo-instruct': [0.0015, 0.002],
    
    // Embeddings
    'text-embedding-ada-002': [0.0001, 0.0001],
    'text-embedding-3-small': [0.00002, 0.00002],
    'text-embedding-3-large': [0.00013, 0.00013]
  };
  
  // Determinar preço baseado no modelo (correspondência parcial)
  let modelPrice: [number, number] = [0.01, 0.03]; // Valor padrão conservador
  
  // Buscar por correspondência parcial
  for (const [key, price] of Object.entries(prices)) {
    if (model.toLowerCase().includes(key.toLowerCase())) {
      modelPrice = price;
      break;
    }
  }
  
  // Calcular custo total
  const promptCost = (promptTokens / 1000) * modelPrice[0];
  const completionCost = (completionTokens / 1000) * modelPrice[1];
  
  return promptCost + completionCost;
}

// Função para formatar registro para o Supabase
function formatRecordForSupabase(execution: OpenAIExecution, workflow: any): any {
  // Criar um ID de request único
  const requestId = `${execution.workflowId}_${execution.nodeId}_${execution.id}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Preparar tags
  let tags = ['agent'];
  if (workflow.tags) {
    if (Array.isArray(workflow.tags)) {
      workflow.tags.forEach((tag: any) => {
        let tagName = '';
        if (typeof tag === 'string') {
          tagName = tag;
        } else if (tag && typeof tag === 'object') {
          tagName = tag.name || tag.text || '';
        }
        
        if (tagName && !tags.includes(tagName)) {
          tags.push(tagName);
        }
      });
    }
  }
  
  // Adicionar tags específicas
  if (!tags.includes('n8n')) tags.push('n8n');
  
  // Formatar endpoint
  let endpoint = 'chat';
  if (execution.model.includes('embedding')) {
    endpoint = 'embeddings';
  } else if (execution.model.includes('dall-e') || execution.model.includes('image')) {
    endpoint = 'images';
  }
  
  // Criar registro formatado para o Supabase
  return {
    // Campos obrigatórios
    timestamp: execution.timestamp,
    workflow_id: execution.workflowId,
    workflow_name: execution.workflowName,
    
    // Campos de identificação do nó
    node_id: execution.nodeId,
    node_name: execution.nodeName,
    execution_id: execution.id,
    
    // Campos de modelo - incluir ambas as versões
    model: execution.model,
    "Model": execution.model, // Versão com M maiúsculo para compatibilidade
    
    // Campos de uso
    endpoint,
    prompt_tokens: execution.promptTokens,
    completion_tokens: execution.completionTokens,
    total_tokens: execution.totalTokens,
    estimated_cost: execution.cost,
    
    // Campos para identificação e agregação
    user_id: null,
    request_id: requestId,
    tags: tags,
    
    // Metadados adicionais
    metadata: {
      source: 'n8n_direct_extract',
      extracted_at: new Date().toISOString(),
      is_estimate: execution.rawData ? false : true,
      execution_id: execution.id,
      node_id: execution.nodeId,
      node_name: execution.nodeName,
      node_type: execution.parameters?.nodeType || 'unknown'
    }
  };
}

// Executar o script
main().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
}); 