/**
 * CORREÇÃO PARA O WORKFLOW OPENAI USAGE SYNC
 * 
 * Este script corrige problemas comuns no envio de dados do N8N para o Supabase:
 * 1. Formato correto de campos específicos (model, tags, metadata)
 * 2. Validação de dados antes do envio
 * 3. Normalização de nomes de modelo da OpenAI
 * 
 * Como usar:
 * 1. Substitua o script do nó "Sync OpenAI Usage" no workflow "OpenAI Usage Sync"
 * 2. Atualize as variáveis conforme necessário
 * 3. Execute o workflow manualmente para testar
 */

// Configurações
const SUPABASE_URL = process.env.SUPABASE_URL || $env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || $env.SUPABASE_SERVICE_KEY;
const N8N_API_URL = process.env.N8N_API_URL || $env.N8N_API_URL;
const N8N_API_KEY = process.env.N8N_API_KEY || $env.N8N_API_KEY;

// Validar configurações
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Configurações do Supabase ausentes (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
}

if (!N8N_API_URL || !N8N_API_KEY) {
  throw new Error('Configurações da API do n8n ausentes (N8N_API_URL, N8N_API_KEY)');
}

// Função para normalizar nomes de modelo (compatível com a função SQL map_to_correct_model)
function mapToCorrectModel(inputModel) {
  if (!inputModel) return 'unknown';
  
  const model = inputModel.toLowerCase().trim();
  
  if (model.includes('gpt-4') && model.includes('turbo')) {
    return 'gpt-4o';
  } else if (model.includes('gpt-3.5') && model.includes('turbo')) {
    return 'gpt-4o-mini';
  } else if (model.includes('vision') || model.includes('dall')) {
    return 'gpt-4-vision';
  } else {
    return model;
  }
}

// Função para extrair custos da OpenAI de uma execução
function extractOpenAICostsFromExecution(execution) {
  const costs = [];
  
  try {
    // Verificar se temos dados de resultado
    if (!execution.data?.resultData?.runData) {
      return costs;
    }
    
    const runData = execution.data.resultData.runData;
    
    // Iterar sobre cada nó na execução
    for (const nodeName in runData) {
      if (!runData[nodeName] || !Array.isArray(runData[nodeName])) continue;
      
      // Iterar sobre cada execução do nó
      for (let i = 0; i < runData[nodeName].length; i++) {
        const nodeExecution = runData[nodeName][i];
        
        // Verificar se temos dados JSON
        if (!nodeExecution.data?.json) continue;
        
        const json = nodeExecution.data.json;
        
        // Verificar se é uma resposta da OpenAI
        const openAIInfo = getOpenAIInfo(json);
        if (openAIInfo) {
          const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
          costs.push({
            ...openAIInfo,
            timestamp,
            executionId: execution.id,
            nodeId: nodeName,
            nodeName: nodeName
          });
        }
        
        // Verificar em campos aninhados
        ['request', 'response', 'data'].forEach(field => {
          if (json[field] && typeof json[field] === 'object') {
            const nestedInfo = getOpenAIInfo(json[field]);
            if (nestedInfo) {
              const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
              costs.push({
                ...nestedInfo,
                timestamp,
                executionId: execution.id,
                nodeId: nodeName,
                nodeName: nodeName
              });
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`Erro ao extrair custos da execução ${execution.id}:`, error);
  }
  
  return costs;
}

// Função para identificar e extrair informações de uso da OpenAI
function getOpenAIInfo(json) {
  // Verificar padrões comuns de resposta da OpenAI
  if (json.model && (json.usage || json.tokenUsage)) {
    // Extrai informações de tokens
    const usage = json.usage || json.tokenUsage || {};
    const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
    const completionTokens = usage.completion_tokens || usage.completionTokens || 0;
    const totalTokens = usage.total_tokens || usage.totalTokens || (promptTokens + completionTokens);
    
    // Buscar o modelo e normalizar para garantir compatibilidade
    const rawModel = json.model.trim();
    const normalizedModel = mapToCorrectModel(rawModel);
    
    // Calcular o custo com o modelo normalizado
    const cost = calculateCost(normalizedModel, promptTokens, completionTokens);
    
    return {
      model: normalizedModel,
      rawModel: rawModel, // Preservar o nome original para referência
      promptTokens,
      completionTokens,
      totalTokens,
      cost
    };
  }
  
  return null;
}

// Função para calcular o custo com base no modelo e tokens
function calculateCost(model, promptTokens, completionTokens) {
  // Tabela de custos por 1000 tokens (preços atualizados para os modelos mais comuns)
  const pricing = {
    'gpt-4o': { prompt: 0.01, completion: 0.03 },
    'gpt-4o-mini': { prompt: 0.0015, completion: 0.002 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
    'gpt-4-vision': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
    'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
    'text-embedding-ada-002': { prompt: 0.0001, completion: 0.0001 },
    'text-embedding-3-small': { prompt: 0.00002, completion: 0.00002 },
    'text-embedding-3-large': { prompt: 0.00013, completion: 0.00013 },
    'dall-e-3': { prompt: 0.04, completion: 0.04 }, // por imagem, simplificação
    'dall-e-2': { prompt: 0.02, completion: 0.02 }  // por imagem, simplificação
  };
  
  // Encontrar o preço para o modelo exato ou normalizado
  let modelPricing = pricing[model];
  
  // Se não encontrarmos preço para o modelo exato, usar correspondência parcial
  if (!modelPricing) {
    for (const [key, price] of Object.entries(pricing)) {
      if (model.includes(key)) {
        modelPricing = price;
        break;
      }
    }
  }
  
  // Usar preço padrão se não encontrarmos correspondência
  modelPricing = modelPricing || { prompt: 0.002, completion: 0.002 };
  
  // Calcular o custo total
  const promptCost = (promptTokens / 1000) * modelPricing.prompt;
  const completionCost = (completionTokens / 1000) * modelPricing.completion;
  
  return promptCost + completionCost;
}

// Função para formatar registro para o formato esperado pelo Supabase
function formatRecordForSupabase(cost, workflow) {
  // Garantir que temos um request_id único
  const requestId = `n8n_${cost.executionId || Date.now()}_${cost.nodeId || 'node'}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Formatar tags corretamente (sempre como array)
  let tags = ['agent'];
  if (workflow.tags) {
    if (Array.isArray(workflow.tags)) {
      workflow.tags.forEach(tag => {
        const tagName = typeof tag === 'string' ? tag : (tag?.name || '');
        if (tagName && !tags.includes(tagName)) tags.push(tagName);
      });
    } else if (typeof workflow.tags === 'string') {
      const tagsList = workflow.tags.split(',').map(t => t.trim());
      tagsList.forEach(tag => {
        if (tag && !tags.includes(tag)) tags.push(tag);
      });
    }
  }
  
  // Adicionar tags específicas
  if (!tags.includes('n8n')) tags.push('n8n');
  
  // Criar o registro formatado para o Supabase
  return {
    // Campos obrigatórios
    timestamp: cost.timestamp,
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    
    // Campos de identificação do nó
    node_id: cost.nodeId,
    node_name: cost.nodeName,
    execution_id: cost.executionId,
    
    // Campos de modelo - incluir ambas as versões (com M maiúsculo e minúsculo)
    model: cost.model,
    "Model": cost.model, // Versão com M maiúsculo para compatibilidade
    
    // Campos de uso
    endpoint: 'chat',
    prompt_tokens: cost.promptTokens,
    completion_tokens: cost.completionTokens,
    total_tokens: cost.totalTokens,
    estimated_cost: cost.cost,
    
    // Campos para identificação e agregação
    user_id: null, // Normalmente null para execuções de workflows
    request_id: requestId,
    tags: tags,
    
    // Metadados adicionais
    metadata: {
      source: 'n8n_sync',
      extracted_at: new Date().toISOString(),
      original_model: cost.rawModel,
      execution_id: cost.executionId,
      node_id: cost.nodeId,
      sync_version: '1.1.0',
      workflow_active: workflow.active
    }
  };
}

// Função principal de execução
async function main() {
  console.log('Iniciando sincronização de uso da OpenAI - VERSÃO CORRIGIDA');
  const stats = {
    workflowsProcessed: 0,
    executionsProcessed: 0,
    recordsExtracted: 0,
    recordsSaved: 0,
    errors: 0
  };
  
  try {
    // 1. Buscar workflows com tag 'agent'
    console.log('Buscando workflows...');
    const workflowsResponse = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error(`Erro ao buscar workflows: ${workflowsResponse.status} ${workflowsResponse.statusText}`);
    }
    
    const workflowsData = await workflowsResponse.json();
    const workflows = workflowsData.data || [];
    
    // Filtrar workflows com tag 'agent'
    const agentWorkflows = workflows.filter(wf => {
      if (!wf.tags) return false;
      
      // Verificar se as tags incluem 'agent'
      return wf.tags.some(tag => {
        if (typeof tag === 'string') {
          return tag.toLowerCase() === 'agent';
        } else if (tag && typeof tag === 'object' && tag.name) {
          return tag.name.toLowerCase() === 'agent';
        }
        return false;
      });
    });
    
    console.log(`Encontrados ${agentWorkflows.length} workflows com tag 'agent'`);
    
    // Listas para armazenar todos os registros a serem inseridos
    const allRecords = [];
    
    // 2. Para cada workflow, buscar execuções e extrair métricas
    for (const workflow of agentWorkflows) {
      try {
        console.log(`Processando workflow: ${workflow.name} (${workflow.id})`);
        stats.workflowsProcessed++;
        
        // Buscar execuções dos últimos 3 dias (limitar a 50 para evitar sobrecarga)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const executionsResponse = await fetch(
          `${N8N_API_URL}/api/v1/executions?workflowId=${workflow.id}&` +
          `lastId=&limit=50&firstId=&lastExecutionTime=${threeDaysAgo.toISOString()}`,
          {
            method: 'GET',
            headers: {
              'X-N8N-API-KEY': N8N_API_KEY,
              'Accept': 'application/json'
            }
          }
        );
        
        if (!executionsResponse.ok) {
          throw new Error(`Erro ao buscar execuções: ${executionsResponse.status} ${executionsResponse.statusText}`);
        }
        
        const executionsData = await executionsResponse.json();
        const executions = executionsData.data || [];
        
        console.log(`Encontradas ${executions.length} execuções para o workflow ${workflow.name}`);
        stats.executionsProcessed += executions.length;
        
        // Extrair métricas de cada execução
        for (const execution of executions) {
          const costs = extractOpenAICostsFromExecution(execution);
          console.log(`Extraídas ${costs.length} métricas de uso da OpenAI da execução ${execution.id}`);
          
          stats.recordsExtracted += costs.length;
          
          // Preparar registros para inserção no Supabase usando a função de formatação
          costs.forEach(cost => {
            const formattedRecord = formatRecordForSupabase(cost, workflow);
            allRecords.push(formattedRecord);
          });
        }
      } catch (workflowError) {
        console.error(`Erro ao processar workflow ${workflow.name}:`, workflowError);
        stats.errors++;
      }
    }
    
    // 3. Inserir registros no Supabase em lotes (até 50 por vez)
    if (allRecords.length > 0) {
      console.log(`Inserindo ${allRecords.length} registros no Supabase`);
      
      // Função para dividir um array em partes
      const chunk = (arr, size) => 
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
          arr.slice(i * size, i * size + size)
        );
      
      // Dividir registros em lotes de 50
      const batches = chunk(allRecords, 50);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Inserindo lote ${i+1}/${batches.length} (${batch.length} registros)`);
        
        try {
          // Log detalhado de um registro de exemplo para verificação
          if (i === 0) {
            console.log('Exemplo de registro a ser inserido:');
            console.log(JSON.stringify(batch[0], null, 2));
          }
          
          const response = await fetch(`${SUPABASE_URL}/rest/v1/openai_usage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(batch)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao inserir registros: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          stats.recordsSaved += batch.length;
        } catch (insertError) {
          console.error(`Erro ao inserir lote ${i+1}:`, insertError);
          stats.errors++;
        }
      }
      
      // 4. Atualizar agregações diárias
      try {
        console.log('Atualizando agregações diárias...');
        
        // Atualizar tabela de resumo diário geral
        const dailySummaryResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_openai_daily_summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        });
        
        if (!dailySummaryResponse.ok) {
          const errorText = await dailySummaryResponse.text();
          console.warn(`Aviso: Não foi possível atualizar resumo diário: ${dailySummaryResponse.status} - ${errorText}`);
        } else {
          console.log('Resumo diário atualizado com sucesso');
        }
        
        // Também atualizar tabela de execuções recentes
        const recentExecutionsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_recent_agent_executions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        });
        
        if (!recentExecutionsResponse.ok) {
          const errorText = await recentExecutionsResponse.text();
          console.warn(`Aviso: Não foi possível atualizar execuções recentes: ${recentExecutionsResponse.status} - ${errorText}`);
        } else {
          console.log('Tabela de execuções recentes atualizada com sucesso');
        }
      } catch (aggregationError) {
        console.warn('Aviso: Erro ao atualizar agregações:', aggregationError);
      }
    } else {
      console.log('Nenhum registro para inserir');
    }
    
    console.log('Sincronização concluída com sucesso!');
    console.log('Estatísticas:', stats);
    
    return { success: true, stats };
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return { success: false, error: error.message, stats };
  }
}

// Executar e retornar o resultado
return main(); 