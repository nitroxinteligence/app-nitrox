import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Configuração do endpoint com proteção CRON
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos de tempo máximo de execução

// URLs e chaves de API
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";

// Chave para proteção do endpoint CRON
const CRON_SECRET = process.env.CRON_SECRET || "sync-n8n-cron-secret";

// Endpoint GET para facilitar a configuração do CRON no Vercel ou outros serviços
export async function GET(request: Request) {
  console.log("Sincronização CRON iniciada");
  
  // Verificar o token de autorização (para proteção do cron)
  const { searchParams } = new URL(request.url);
  const authToken = searchParams.get('token');
  
  if (authToken !== CRON_SECRET) {
    console.warn("Tentativa de acesso ao CRON com token inválido");
    return NextResponse.json(
      { success: false, error: "Token inválido" },
      { status: 401 }
    );
  }
  
  return await syncN8NData();
}

// Endpoint POST para acionamento manual
export async function POST(request: Request) {
  // Verificar o token de autorização no cabeçalho
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== CRON_SECRET) {
    console.warn("Tentativa de acesso ao CRON com token inválido");
    return NextResponse.json(
      { success: false, error: "Token inválido" },
      { status: 401 }
    );
  }
  
  return await syncN8NData();
}

// Função de sincronização
async function syncN8NData() {
  console.log("Iniciando sincronização direta N8N -> Supabase");
  
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("Configurações do Supabase ausentes");
      return NextResponse.json(
        { success: false, error: "Configurações do Supabase ausentes" },
        { status: 500 }
      );
    }
    
    if (!N8N_API_URL || !N8N_API_KEY) {
      console.error("Configurações da API do N8N ausentes");
      return NextResponse.json(
        { success: false, error: "Configurações da API do N8N ausentes" },
        { status: 500 }
      );
    }
    
    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Timestamp para log e rastreabilidade
    const startTime = new Date();
    console.log(`Sincronização iniciada em: ${startTime.toISOString()}`);
    
    // Estatísticas para retorno
    const stats = {
      workflowsProcessed: 0,
      executionsProcessed: 0,
      recordsExtracted: 0,
      recordsSaved: 0,
      errors: 0
    };
    
    // 1. Buscar workflows com tag 'agent'
    console.log('Buscando workflows...');
    const workflowsResponse = await fetch(`${N8N_API_URL}/workflows`, {
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
    const allWorkflows = workflowsData.data || [];
    
    // Filtrar workflows com tag 'agent'
    const agentWorkflows = allWorkflows.filter((wf: any) => hasAgentTag(wf));
    
    console.log(`Encontrados ${agentWorkflows.length} workflows com tag agent`);
    
    // Log detalhado para cada workflow
    for (const wf of agentWorkflows) {
      console.log(`  - Workflow: ${wf.name} (ID: ${wf.id})`);
      console.log(`    Tags: ${JSON.stringify(wf.tags)}`);
      console.log(`    Ativo: ${wf.active}`);
    }
    
    // 2. Para cada workflow, buscar execuções e extrair métricas
    const allRecords: any[] = [];
    const lookbackDays = 7; // Buscar execuções dos últimos 7 dias
    
    for (const workflow of agentWorkflows) {
      try {
        console.log(`Processando workflow: ${workflow.name} (${workflow.id})`);
        stats.workflowsProcessed++;
        
        // Buscar execuções dos últimos dias
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - lookbackDays);
        const dateStr = dateLimit.toISOString();
        
        // Construir URL para buscar execuções
        const executionsUrl = new URL(`${N8N_API_URL}/executions`);
        executionsUrl.searchParams.append('workflowId', workflow.id);
        executionsUrl.searchParams.append('status', 'success');
        executionsUrl.searchParams.append('limit', '100');
        
        console.log(`Buscando execuções desde: ${dateStr}`);
        
        const executionsResponse = await fetch(executionsUrl.toString(), {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        if (!executionsResponse.ok) {
          console.error(`Erro ao buscar execuções para workflow ${workflow.id}: ${executionsResponse.status}`);
          stats.errors++;
          continue;
        }
        
        const executionsData = await executionsResponse.json();
        const executions = executionsData.data || [];
        
        console.log(`Encontradas ${executions.length} execuções para o workflow ${workflow.name}`);
        
        // Processar cada execução
        for (const execution of executions) {
          try {
            stats.executionsProcessed++;
            
            // Extrair custos da OpenAI da execução
            const costs = extractOpenAICostsFromExecution(execution);
            
            if (costs.length > 0) {
              console.log(`Extraídos ${costs.length} registros de uso da OpenAI da execução ${execution.id}`);
              
              // Transformar em registros formatados para o Supabase
              const records = costs.map(cost => formatRecordForSupabase(cost, workflow));
              allRecords.push(...records);
              stats.recordsExtracted += costs.length;
            }
          } catch (executionError) {
            console.error(`Erro ao processar execução ${execution.id}:`, executionError);
            stats.errors++;
          }
        }
      } catch (workflowError) {
        console.error(`Erro ao processar workflow ${workflow.id}:`, workflowError);
        stats.errors++;
      }
    }
    
    // 3. Salvar registros no Supabase em lotes
    if (allRecords.length > 0) {
      console.log(`Salvando ${allRecords.length} registros no Supabase...`);
      
      // Dividir em lotes menores para evitar limites da API
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < allRecords.length; i += batchSize) {
        batches.push(allRecords.slice(i, i + batchSize));
      }
      
      console.log(`Dividido em ${batches.length} lotes de até ${batchSize} registros`);
      
      // Inserir cada lote
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Inserindo lote ${i+1}/${batches.length} (${batch.length} registros)`);
        
        try {
          // Enviar para o Supabase
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
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`Sincronização concluída em ${duration}s: ${stats.recordsSaved} registros salvos`);
    
    return NextResponse.json({
      success: true,
      message: `Sincronização automática concluída com sucesso em ${duration}s`,
      stats,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration}s`
    });
  } catch (error: any) {
    console.error("Erro fatal na sincronização CRON:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Função para verificar se um workflow tem a tag 'agent'
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

// Função para extrair custos da OpenAI de uma execução
function extractOpenAICostsFromExecution(execution: any): any[] {
  const costs: any[] = [];
  
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

// Função para extrair informações de uso da OpenAI de um objeto JSON
function getOpenAIInfo(json: any): any | null {
  // Verificar se é uma resposta da OpenAI
  if (!json || typeof json !== 'object') {
    return null;
  }
  
  // Verificar se temos um campo 'model' ou 'usage' indicando que é uma resposta da OpenAI
  if (!json.model && !json.usage && !json.object) {
    return null;
  }
  
  // Verificar pelos campos do objeto de resposta da OpenAI
  const isOpenAI = 
    json.object === 'chat.completion' || 
    json.object === 'text_completion' ||
    (json.usage && (json.usage.prompt_tokens || json.usage.completion_tokens));
  
  if (!isOpenAI) {
    return null;
  }
  
  // Extrair dados de uso
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  
  if (json.usage) {
    promptTokens = json.usage.prompt_tokens || 0;
    completionTokens = json.usage.completion_tokens || 0;
    totalTokens = json.usage.total_tokens || (promptTokens + completionTokens);
  } else {
    // Se não tiver usage explícito, tentar extrair de outros campos
    promptTokens = json.prompt_tokens || 0;
    completionTokens = json.completion_tokens || 0;
    totalTokens = json.total_tokens || (promptTokens + completionTokens);
  }
  
  // Normalizar nome do modelo
  const rawModel = json.model || '';
  const model = normalizeModelName(rawModel);
  
  // Calcular custo aproximado
  const cost = calculateCost(model, promptTokens, completionTokens);
  
  return {
    model,
    rawModel,
    promptTokens,
    completionTokens,
    totalTokens,
    cost
  };
}

// Função para normalizar o nome do modelo
function normalizeModelName(model: string): string {
  if (!model) return 'unknown';
  
  const modelLower = model.toLowerCase();
  
  // GPT-4
  if (modelLower.includes('gpt-4-turbo')) return 'gpt-4-turbo';
  if (modelLower.includes('gpt-4-1106')) return 'gpt-4-turbo';
  if (modelLower.includes('gpt-4-0125')) return 'gpt-4-turbo';
  if (modelLower.includes('gpt-4-32k')) return 'gpt-4-32k';
  if (modelLower.includes('gpt-4-')) return 'gpt-4'; // Outras variantes do GPT-4
  if (modelLower.includes('gpt-4')) return 'gpt-4';
  
  // GPT-3.5 Turbo
  if (modelLower.includes('gpt-3.5-turbo-16k')) return 'gpt-3.5-turbo-16k';
  if (modelLower.includes('gpt-3.5-turbo-1106')) return 'gpt-3.5-turbo';
  if (modelLower.includes('gpt-3.5-turbo-0125')) return 'gpt-3.5-turbo';
  if (modelLower.includes('gpt-3.5-turbo')) return 'gpt-3.5-turbo';
  
  // Modelos Claude
  if (modelLower.includes('claude-3-opus')) return 'claude-3-opus';
  if (modelLower.includes('claude-3-sonnet')) return 'claude-3-sonnet';
  if (modelLower.includes('claude-3-haiku')) return 'claude-3-haiku';
  if (modelLower.includes('claude-2')) return 'claude-2';
  if (modelLower.includes('claude-1')) return 'claude-1';
  if (modelLower.includes('claude-instant')) return 'claude-instant';
  
  // Outros modelos Groq
  if (modelLower.includes('llama-3')) return 'llama-3';
  if (modelLower.includes('llama2')) return 'llama2';
  if (modelLower.includes('mixtral')) return 'mixtral';
  
  // Retornar o nome original se não reconhecido
  return model;
}

// Função para calcular o custo aproximado
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Preços por 1000 tokens em USD
  const prices: Record<string, [number, number]> = {
    'gpt-4-turbo': [0.01, 0.03],  // Input, Output
    'gpt-4': [0.03, 0.06],
    'gpt-4-32k': [0.06, 0.12],
    'gpt-3.5-turbo': [0.0005, 0.0015],
    'gpt-3.5-turbo-16k': [0.001, 0.002],
    'claude-3-opus': [0.015, 0.075],
    'claude-3-sonnet': [0.003, 0.015],
    'claude-3-haiku': [0.00025, 0.00125],
    'claude-2': [0.008, 0.024],
    'claude-1': [0.008, 0.024],
    'claude-instant': [0.0016, 0.0056],
    'llama-3': [0.0004, 0.0004],  // Taxa fixa
    'llama2': [0.0004, 0.0004],   // Taxa fixa
    'mixtral': [0.0004, 0.0004]   // Taxa fixa
  };
  
  // Use o preço do modelo especificado ou um padrão conservador
  const [promptPrice, completionPrice] = prices[model] || [0.01, 0.03];
  
  // Calcular o custo total
  const promptCost = (promptTokens / 1000) * promptPrice;
  const completionCost = (completionTokens / 1000) * completionPrice;
  
  return promptCost + completionCost;
}

// Função para formatar registro para o formato esperado pelo Supabase
function formatRecordForSupabase(cost: any, workflow: any): any {
  // Gerar request_id único baseado na execução e no nó
  const requestId = `n8n_${cost.executionId || Date.now()}_${cost.nodeId || 'node'}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Formatar tags corretamente (sempre como array)
  let tags = ['agent'];
  if (workflow.tags) {
    if (Array.isArray(workflow.tags)) {
      workflow.tags.forEach((tag: any) => {
        // Melhor tratamento para diferentes tipos de tag
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
    
    // Campos de modelo - incluir ambas as versões
    model: cost.model,
    "Model": cost.model, // Versão com M maiúsculo para compatibilidade com a interface
    
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