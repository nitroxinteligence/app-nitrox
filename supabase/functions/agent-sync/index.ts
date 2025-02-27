import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OpenAICost {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
  executionId: string;
  nodeId: string;
  cost: number;
  nodeName?: string;
  rawModel?: string;
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: any[];
}

serve(async (req) => {
  // Configuração do CORS para permitir requisições da sua aplicação
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Obter as variáveis de ambiente
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const N8N_API_URL = Deno.env.get('N8N_API_URL') || '';
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY') || '';

    // Verificar configurações necessárias
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações do Supabase não encontradas' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!N8N_API_URL || !N8N_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações da API do N8N não encontradas' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase com chave de serviço para ter permissões completas
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Estatísticas para retorno
    const stats = {
      workflowsProcessed: 0,
      executionsProcessed: 0,
      recordsExtracted: 0,
      recordsSaved: 0,
      errors: 0
    };

    // Parâmetros opcionais da solicitação
    let params = {};
    try {
      params = await req.json();
    } catch (e) {
      // Se não for possível analisar o corpo, continuamos com parâmetros padrão
      console.log('Corpo da requisição vazio ou inválido, usando parâmetros padrão');
    }

    const forceSync = params.forceSync || true;
    const debug = params.debug || true;

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
    const agentWorkflows = workflows.filter((wf: N8nWorkflow) => {
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
    
    // Lista para armazenar todos os registros a serem inseridos
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
          
          // Preparar registros para inserção no Supabase
          costs.forEach((cost: OpenAICost) => {
            allRecords.push(formatRecordForSupabase(cost, workflow));
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
      const chunk = (arr: any[], size: number) => 
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
          arr.slice(i * size, i * size + size)
        );
      
      // Dividir registros em lotes de 50
      const batches = chunk(allRecords, 50);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Inserindo lote ${i+1}/${batches.length} (${batch.length} registros)`);
        
        try {
          // Enviar diretamente para o Supabase
          const { data, error } = await supabase
            .from('openai_usage')
            .upsert(batch, { 
              onConflict: 'request_id',
              ignoreDuplicates: false
            });
          
          if (error) {
            throw new Error(`Erro ao inserir registros: ${error.message}`);
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
        
        // Atualizar tabela de resumo diário 
        const { error: dailySummaryError } = await supabase.rpc('update_openai_daily_summary');
        
        if (dailySummaryError) {
          console.warn(`Aviso: Não foi possível atualizar resumo diário: ${dailySummaryError.message}`);
        } else {
          console.log('Resumo diário atualizado com sucesso');
        }
        
        // Atualizar execuções recentes
        const { error: recentExecutionsError } = await supabase.rpc('update_recent_agent_executions');
        
        if (recentExecutionsError) {
          console.warn(`Aviso: Não foi possível atualizar execuções recentes: ${recentExecutionsError.message}`);
        } else {
          console.log('Execuções recentes atualizadas com sucesso');
        }
      } catch (aggregationError) {
        console.warn('Aviso: Erro ao atualizar agregações:', aggregationError);
      }
    } else {
      console.log('Nenhum registro para inserir');
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída: ${stats.recordsSaved} registros salvos de ${stats.recordsExtracted} extraídos`,
        stats
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        } 
      }
    );
  } catch (error) {
    console.error('Erro na sincronização:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido na sincronização' 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        } 
      }
    );
  }
});

// Função para extrair custos da OpenAI de uma execução
function extractOpenAICostsFromExecution(execution: any): OpenAICost[] {
  const costs: OpenAICost[] = [];
  
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
        
        // Verificar em campos aninhados (request, response, data)
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
function getOpenAIInfo(json: any): OpenAICost | null {
  // Verificar padrões comuns de resposta da OpenAI
  if (json.model && (json.usage || json.tokenUsage)) {
    // Extrai informações de tokens
    const usage = json.usage || json.tokenUsage || {};
    const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
    const completionTokens = usage.completion_tokens || usage.completionTokens || 0;
    const totalTokens = usage.total_tokens || usage.totalTokens || (promptTokens + completionTokens);
    
    // Buscar o modelo e calcular o custo
    const rawModel = json.model;
    const model = mapToCorrectModel(rawModel);
    const cost = calculateCost(model, promptTokens, completionTokens);
    
    return {
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      timestamp: '',  // Será preenchido pela função chamadora
      executionId: '', // Será preenchido pela função chamadora
      nodeId: '',     // Será preenchido pela função chamadora
      rawModel
    };
  }
  
  return null;
}

// Função para normalizar nomes de modelo
function mapToCorrectModel(inputModel: string): string {
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

// Função para calcular o custo com base no modelo e tokens
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Tabela de custos por 1000 tokens (preços atualizados)
  const pricing: Record<string, { prompt: number, completion: number }> = {
    'gpt-4o': { prompt: 0.005, completion: 0.015 },
    'gpt-4o-mini': { prompt: 0.0015, completion: 0.002 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-4-vision': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
    'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
    'text-embedding-ada-002': { prompt: 0.0001, completion: 0.0001 },
    'text-embedding-3-small': { prompt: 0.00002, completion: 0.00002 },
    'text-embedding-3-large': { prompt: 0.00013, completion: 0.00013 }
  };
  
  // Encontrar o preço correto usando correspondência parcial
  let modelPricing;
  for (const [key, price] of Object.entries(pricing)) {
    if (model.includes(key)) {
      modelPricing = price;
      break;
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
function formatRecordForSupabase(cost: OpenAICost, workflow: N8nWorkflow): any {
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
      node_name: cost.nodeName,
      workflow_active: workflow.active
    }
  };
} 