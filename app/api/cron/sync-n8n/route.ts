import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || '';
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || 'sync-n8n-cron-secret';

// Tipos de nós OpenAI
const OPENAI_NODE_TYPES = [
  'n8n-nodes-base.openAi',
  'n8n-nodes-base.openAiChatModel',
  'n8n-nodes-base.openAiEmbedding',
  'n8n-nodes-base.openAiAssistant',
  'n8n-nodes-base.openAiTextCompletion',
  'n8n-nodes-base.openAiCreateImage',
  'n8n-nodes-base.openAi', // Mais comum
  'openAi', // Versão simplificada
  'OPENAI', // Versão em maiúsculo
  'OpenAI', // Outra variação
  'openai', // Outra variação
  'chatgpt', // Possível nome personalizado
  'gpt', // Nome personalizado comum
];

// Padrões de nome para nós OpenAI
const OPENAI_NODE_NAME_PATTERNS = [
  /openai/i,
  /gpt/i,
  /chatgpt/i,
  /assistant/i,
  /embedding/i,
  /completion/i,
  /chat model/i,
  /gpt-3/i,
  /gpt-4/i,
  /text-davinci/i,
  /davinci/i,
  /dall-e/i,
  /ai model/i,
  /llm/i,
];

// Interfaces
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

interface RecordToSave {
  workflow_id: string;
  workflow_name: string;
  workflow_tags: string[];
  execution_id: string;
  start_time: string;
  end_time: string;
  node_name: string;
  model: string;
  Model?: string;
  endpoint?: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  node_type: string;
  node_id: string;
  created_at: string;
  timestamp?: string;
  tags?: string[];
  metadata?: any;
  is_estimated?: boolean;
  request_id?: string;
}

/**
 * GET - Endpoint para verificação de saúde e para iniciar sincronização via GET
 */
export async function GET(request: NextRequest) {
  // Verificar token de autorização
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  if (!token || token !== CRON_SECRET) {
    return NextResponse.json({ 
      success: false, 
      message: "Não autorizado" 
    }, { status: 401 });
  }
  
  // Se autorizado, iniciar sincronização
  try {
    // Coletando parâmetros da URL
    const lookbackDays = parseInt(searchParams.get('dias') || '7', 10);
    const debug = searchParams.get('debug') === 'true';
    const source = searchParams.get('source') || 'cron';
    const modoAvancado = searchParams.get('modo') === 'avancado';
    
    const result = await syncN8NData({
      lookbackDays,
      debug,
      source,
      modoAvancado
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao executar sincronização:", error);
    
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao executar sincronização: ${error.message}`,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST - Endpoint para iniciar sincronização via POST
 */
export async function POST(request: NextRequest) {
  // Verificar token de autorização
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const authHeader = request.headers.get('Authorization');
  
  // Verificar token nos headers ou na URL
  const isAuthorized = 
    (token && token === CRON_SECRET) || 
    (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === CRON_SECRET);
  
  if (!isAuthorized) {
    return NextResponse.json({ 
      success: false, 
      message: "Não autorizado" 
    }, { status: 401 });
  }
  
  // Se autorizado, iniciar sincronização
  try {
    // Parsear corpo da requisição
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Se não conseguir parsear JSON, usar objeto vazio
      body = {};
    }
    
    // Extrair parâmetros
    const {
      forceSync = true,
      debug = false,
      source = 'api',
      lookbackDays = 7,
      batchSize = 10,
      modoAvancado = false
    } = body as any;
    
    const result = await syncN8NData({
      lookbackDays,
      debug,
      source,
      forceSync,
      batchSize,
      modoAvancado
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao executar sincronização:", error);
    
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao executar sincronização: ${error.message}`,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Função principal para sincronizar dados do N8N com o Supabase
 */
async function syncN8NData(options: {
  lookbackDays?: number;
  debug?: boolean;
  source?: string;
  forceSync?: boolean;
  batchSize?: number;
  modoAvancado?: boolean;
}) {
  const {
    lookbackDays = 7,
    debug = false,
    source = 'cron',
    forceSync = true,
    batchSize = 10,
    modoAvancado = false
  } = options;
  
  // Verificar configurações
  if (!N8N_API_URL || !N8N_API_KEY) {
    throw new Error("Configurações da API do N8N não encontradas");
  }
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Configurações do Supabase não encontradas");
  }
  
  // Inicializar cliente Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Verificar estrutura da tabela
  try {
    console.log("Verificando estrutura da tabela...");
    const { data: tableInfo, error: tableError } = await supabase.rpc('table_info', { table_name: 'openai_usage' });
    
    if (tableError) {
      console.error("Erro ao verificar tabela:", JSON.stringify(tableError));
    } else if (tableInfo) {
      console.log("Estrutura da tabela:", JSON.stringify(tableInfo));
    }
  } catch (tableErr: any) {
    console.error("Erro ao verificar estrutura da tabela:", tableErr.message);
  }
  
  // Verificar contagem de registros
  try {
    const { data, error, count } = await supabase
      .from('openai_usage')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error("Erro ao contar registros:", JSON.stringify(error));
    } else {
      console.log(`Contagem de registros na tabela: ${count}`);
    }
  } catch (countErr: any) {
    console.error("Erro ao contar registros:", countErr.message);
  }
  
  // Calcular data limite
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - lookbackDays);
  
  console.log("Sincronização CRON iniciada");
  console.log(`Iniciando sincronização direta N8N -> Supabase${modoAvancado ? ' (MODO AVANÇADO)' : ''}`);
  
  // Estatísticas para retorno
  const stats = {
    workflowsProcessados: 0,
    nodesOpenAI: 0,
    execucoesProcessadas: 0,
    recordsExtracted: 0,
    recordsSaved: 0,
    errors: 0
  };
  
  const startTime = new Date();
  console.log(`Sincronização iniciada em: ${startTime.toISOString()}`);
  
  try {
    // 1. Buscar workflows com tag 'agent'
    console.log("Buscando workflows...");
    
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
    
    if (debug) {
      // Log detalhado dos workflows encontrados
      agentWorkflows.forEach((wf: any) => {
        console.log(`  - Workflow: ${wf.name} (ID: ${wf.id})`);
        console.log(`    Tags: ${JSON.stringify(wf.tags)}`);
        console.log(`    Ativo: ${wf.active}`);
      });
    }
    
    if (agentWorkflows.length === 0) {
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      
      return {
        success: true,
        message: `Sincronização automática concluída em ${duration.toFixed(3)}s (nenhum workflow encontrado)`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${duration.toFixed(3)}s`,
        stats
      };
    }
    
    // 2. Processar cada workflow
    const allRecords: any[] = [];
    
    for (const workflowSummary of agentWorkflows) {
      try {
        console.log(`Processando workflow: ${workflowSummary.name} (${workflowSummary.id})`);
        stats.workflowsProcessados++;
        
        // Buscar definição completa do workflow
        const workflowResponse = await fetch(`${N8N_API_URL}/workflows/${workflowSummary.id}`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        if (!workflowResponse.ok) {
          console.error(`Erro ao buscar definição do workflow: ${workflowResponse.status}`);
          stats.errors++;
          continue;
        }
        
        const workflow = await workflowResponse.json();
        
        // Extrair tags como array de strings
        const workflowTags = (workflow.tags || []).map((tag: any) => {
          if (typeof tag === 'string') return tag;
          if (tag && typeof tag === 'object') return tag.name || tag.text || '';
          return '';
        }).filter((t: string) => t.length > 0);
        
        // Encontrar nós OpenAI no workflow
        const openaiNodes = findOpenAINodes(workflow);
        stats.nodesOpenAI += openaiNodes.length;
        
        if (openaiNodes.length === 0) {
          if (debug) console.log(`Nenhum nó OpenAI encontrado no workflow ${workflow.name}`);
          continue;
        } else {
          console.log(`Encontrados ${openaiNodes.length} nós OpenAI no workflow ${workflow.name}`);
          if (debug) {
            openaiNodes.forEach(node => {
              console.log(`  - Nó: ${node.name} (ID: ${node.id}, Tipo: ${node.type})`);
            });
          }
        }
        
        // 3. Buscar execuções do workflow
        console.log(`Buscando execuções desde: ${dateLimit.toISOString()}`);
        
        const executionsUrl = new URL(`${N8N_API_URL}/executions`);
        executionsUrl.searchParams.append('workflowId', workflow.id);
        executionsUrl.searchParams.append('limit', '100');
        // A API do N8N normalmente não suporta filtragem por data diretamente
        
        const executionsResponse = await fetch(executionsUrl.toString(), {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        if (!executionsResponse.ok) {
          console.error(`Erro ao buscar execuções: ${executionsResponse.status}`);
          stats.errors++;
          continue;
        }
        
        const executionsData = await executionsResponse.json();
        const allExecutions = executionsData.data || [];
        
        // Filtrar execuções por data
        const recentExecutions = allExecutions.filter((execution: any) => {
          const executionDate = execution.startedAt || execution.stoppedAt || execution.createdAt;
          return executionDate && new Date(executionDate) >= dateLimit;
        });
        
        console.log(`Encontradas ${recentExecutions.length} execuções para o workflow ${workflow.name}`);
        
        // 4. Processar cada execução
        const recordsToSave: RecordToSave[] = [];
        
        for (const execution of recentExecutions) {
          try {
            stats.execucoesProcessadas++;
            
            // Processar a execução
            const executionRecords = await processExecution(
              workflow.id,
              workflow.name,
              workflowTags,
              openaiNodes,
              execution.id,
              modoAvancado,
              debug
            );
            
            // Adicionar registros extraídos
            if (executionRecords.length > 0) {
              // Converter para o formato esperado pelo Supabase
              const formattedRecords = executionRecords.map(record => ({
                workflow_id: record.workflow_id,
                workflow_name: record.workflow_name,
                node_name: record.node_name,
                timestamp: record.start_time,
                model: record.model,
                Model: record.model,
                endpoint: record.model.includes('embedding') ? 'embeddings' : 'chat',
                prompt_tokens: record.prompt_tokens,
                completion_tokens: record.completion_tokens,
                total_tokens: record.total_tokens,
                estimated_cost: record.estimated_cost,
                tags: record.workflow_tags,
                metadata: {
                  source: `n8n_sync_${source}`,
                  node_type: record.node_type,
                  node_id: record.node_id,
                  execution_id: record.execution_id,
                  start_time: record.start_time,
                  end_time: record.end_time,
                  is_estimated: record.is_estimated || false
                },
                request_id: record.request_id
              }));
              
              recordsToSave.push(...formattedRecords);
              if (debug) {
                console.log(`  Extraídos ${executionRecords.length} registros de uso da OpenAI da execução ${execution.id}`);
              }
            }
          } catch (error: any) {
            console.error(`Erro ao processar execução ${execution.id}:`, error.message);
            stats.errors++;
          }
        }
        
        if (debug && recordsToSave.length > 0) {
          console.log(`Extraídos ${recordsToSave.length} registros OpenAI do workflow ${workflow.name}`);
        }
        
        stats.recordsExtracted += recordsToSave.length;
        
        // Adicionar os registros extraídos à lista global
        allRecords.push(...recordsToSave);
        
      } catch (error: any) {
        console.error(`Erro ao processar workflow ${workflowSummary.id}:`, error.message);
        stats.errors++;
      }
    }
    
    // 6. Salvar registros no Supabase
    if (allRecords.length > 0) {
      console.log(`Inserindo ${allRecords.length} registros no Supabase...`);
      
      // Teste com um registro simples primeiro
      try {
        console.log("Tentando inserir um registro de teste para verificar permissões...");
        console.log("Detalhes de conexão:", {
          url: SUPABASE_URL,
          keyLength: SUPABASE_SERVICE_KEY?.length || 0
        });
        
        // Criar um ID único para este teste
        const uniqueTestId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        const testRecord = {
          workflow_id: "test-workflow",
          workflow_name: "Test Workflow",
          node_name: "Test Node",
          timestamp: new Date().toISOString(),
          model: "gpt-3.5-turbo",
          Model: "gpt-3.5-turbo",
          endpoint: "chat",
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          estimated_cost: 0.0001,
          tags: ["test", "agent"],
          metadata: {
            source: "test",
            node_type: "test-node",
            node_id: "test-node-id",
            execution_id: "test-execution"
          },
          request_id: uniqueTestId
        };
        
        console.log("Registro de teste a ser inserido:", JSON.stringify(testRecord));
        
        // Tentar inserção direta via API REST
        try {
          console.log("Tentando inserção direta via API REST...");
          
          const apiUrl = `${SUPABASE_URL}/rest/v1/openai_usage`;
          const headers = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal'
          };
          
          console.log("URL da API:", apiUrl);
          console.log("Headers:", Object.keys(headers).join(', '));
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(testRecord)
          });
          
          if (response.ok) {
            console.log("Inserção direta via API REST bem-sucedida!");
            console.log("Status:", response.status);
            console.log("Status Text:", response.statusText);
          } else {
            console.error("Erro na inserção direta via API REST:");
            console.error("Status:", response.status);
            console.error("Status Text:", response.statusText);
            const errorText = await response.text();
            console.error("Resposta de erro:", errorText);
          }
        } catch (directApiError: any) {
          console.error("Exceção na inserção direta via API REST:", directApiError.message);
        }
        
        // Tentar inserção via cliente Supabase
        console.log("Tentando inserção via cliente Supabase...");
        const { data: testData, error: testError } = await supabase
          .from('openai_usage')
          .insert([testRecord]);
        
        if (testError) {
          console.error("ERRO NO TESTE: Não foi possível inserir registro de teste:", JSON.stringify(testError));
          console.error("Detalhes do erro:", testError.message);
          console.error("Código do erro:", testError.code);
          console.error("Detalhes:", testError.details);
        } else {
          console.log("Registro de teste inserido com sucesso!");
          console.log("Resposta:", JSON.stringify(testData));
        }
        
        // Verificar se o registro foi inserido
        console.log("Verificando se o registro foi inserido...");
        const { data: checkData, error: checkError } = await supabase
          .from('openai_usage')
          .select('*')
          .eq('request_id', uniqueTestId)
          .limit(1);
        
        if (checkError) {
          console.error("Erro ao verificar inserção:", JSON.stringify(checkError));
        } else if (checkData && checkData.length > 0) {
          console.log("Registro encontrado na verificação:", JSON.stringify(checkData[0]));
        } else {
          console.error("Registro NÃO encontrado na verificação!");
        }
      } catch (testErr: any) {
        console.error("Exceção ao inserir registro de teste:", testErr.message);
        console.error("Stack trace:", testErr.stack);
      }
      
      // Dividir em lotes
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < allRecords.length; i += batchSize) {
        batches.push(allRecords.slice(i, i + batchSize));
      }
      
      // Inserir cada lote
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          console.log(`Tentando inserir lote ${i+1}/${batches.length} com ${batch.length} registros...`);
          
          const { data, error } = await supabase
            .from('openai_usage')
            .upsert(batch, { 
              onConflict: 'request_id',
              ignoreDuplicates: false
            });
          
          if (error) {
            console.error(`Erro detalhado ao inserir lote ${i+1}:`, JSON.stringify(error));
            throw new Error(`Erro ao inserir registros: ${error.message}`);
          }
          
          console.log(`Lote ${i+1} inserido com sucesso! Adicionados ${batch.length} registros.`);
          stats.recordsSaved += batch.length;
        } catch (insertError: any) {
          console.error(`Erro ao inserir lote ${i+1}:`, insertError.message);
          console.error(`Detalhes do erro:`, insertError);
          console.error(`Primeiro registro do lote:`, JSON.stringify(batch[0]));
          stats.errors++;
        }
      }
      
      // 7. Atualizar agregações
      try {
        // Atualizar resumo diário
        const { error: dailySummaryError } = await supabase.rpc('update_openai_daily_summary');
        
        if (dailySummaryError) {
          console.warn(`Aviso: Não foi possível atualizar resumo diário: ${dailySummaryError.message}`);
        }
        
        // Atualizar execuções recentes
        const { error: recentExecutionsError } = await supabase.rpc('update_recent_agent_executions');
        
        if (recentExecutionsError) {
          console.warn(`Aviso: Não foi possível atualizar execuções recentes: ${recentExecutionsError.message}`);
        }
      } catch (aggregationError: any) {
        console.warn('Aviso: Erro ao atualizar agregações:', aggregationError.message);
      }
    } else {
      console.log("Nenhum registro para inserir");
    }
    
    // Calcular duração
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`Sincronização concluída em ${duration.toFixed(3)}s: ${stats.recordsSaved} registros salvos`);
    
    return {
      success: true,
      message: `Sincronização automática concluída com sucesso em ${duration.toFixed(3)}s`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration.toFixed(3)}s`,
      stats,
      diagnostics: {
        supabaseUrl: SUPABASE_URL,
        supabaseKeyValid: typeof SUPABASE_SERVICE_KEY === 'string' && SUPABASE_SERVICE_KEY.length > 0,
        n8nApiValid: typeof N8N_API_URL === 'string' && N8N_API_URL.length > 0,
        recordsSample: allRecords.length > 0 ? [allRecords[0]] : [],
        recordsCount: allRecords.length
      }
    };
    
  } catch (error: any) {
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.error(`Sincronização falhou após ${duration.toFixed(3)}s:`, error);
    
    return {
      success: false,
      message: `Erro ao sincronizar: ${error.message}`,
      error: error.message,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration.toFixed(3)}s`,
      stats
    };
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

// Função para encontrar nós OpenAI em um workflow
function findOpenAINodes(workflow: any): OpenAINode[] {
  const openaiNodes: OpenAINode[] = [];
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return openaiNodes;
  }
  
  console.log(`Analisando ${workflow.nodes.length} nós no workflow ${workflow.name}...`);
  
  for (const node of workflow.nodes) {
    try {
      // Verificar por tipo
      const matchesByType = OPENAI_NODE_TYPES.some(type => 
        node.type === type || 
        (node.type && node.type.toLowerCase().includes('openai'))
      );
      
      // Verificar por nome
      const matchesByName = OPENAI_NODE_NAME_PATTERNS.some(pattern => 
        (node.name && pattern.test(node.name))
      );
      
      // Verificar por parâmetros - se tiver model que começa com gpt, é OpenAI
      const hasOpenAIModel = node.parameters?.model && 
        typeof node.parameters.model === 'string' && 
        (node.parameters.model.startsWith('gpt-') || 
         node.parameters.model.includes('davinci') ||
         node.parameters.model.includes('embedding'));
      
      // Se qualquer uma das verificações passar, considerar como nó OpenAI
      if (matchesByType || matchesByName || hasOpenAIModel) {
        console.log(`  Nó OpenAI encontrado: "${node.name}" (tipo: ${node.type})`);
        
        if (hasOpenAIModel) {
          console.log(`    Modelo detectado: ${node.parameters.model}`);
        }
        
        openaiNodes.push({
          id: node.id,
          name: node.name || 'Desconhecido',
          type: node.type || 'unknown',
          position: node.position || [0, 0],
          parameters: node.parameters || {}
        });
      }
    } catch (error) {
      console.error(`  Erro ao analisar nó:`, error);
    }
  }
  
  return openaiNodes;
}

// Processar uma execução e extrair dados dos nós OpenAI
async function processExecution(
  workflowId: string, 
  workflowName: string,
  workflowTags: string[], 
  openaiNodes: OpenAINode[],
  executionId: string,
  modoAvancado: boolean = false,
  debug: boolean = false
): Promise<RecordToSave[]> {
  try {
    if (debug) {
      console.log(`Processando execução ${executionId} do workflow "${workflowName}"...`);
    }
    
    // Obter detalhes da execução
    const executionUrl = `${N8N_API_URL}/executions/${executionId}`;
    const executionResponse = await fetch(executionUrl, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    if (!executionResponse.ok) {
      console.warn(`  Erro ao obter detalhes da execução ${executionId}: HTTP ${executionResponse.status}`);
      return [];
    }
    
    const executionData = await executionResponse.json();
    
    // Modificação: Log mais detalhado para diagnóstico
    if (debug) {
      console.log(`  Estrutura da resposta da execução: ${Object.keys(executionData).join(', ')}`);
    }
    
    // Tratar diferentes estruturas de resposta (compatibilidade com versões do N8N)
    let execution;
    if (executionData.data) {
      execution = executionData.data;
    } else if (executionData.execution) {
      execution = executionData.execution;
    } else {
      execution = executionData;
    }
    
    if (!execution) {
      console.warn(`  Execução ${executionId} não contém estrutura de dados reconhecível`);
      return [];
    }
    
    const records: RecordToSave[] = [];
    
    // Log detalhado para diagnóstico
    if (debug) {
      console.log(`  Execução ${executionId} iniciada em ${execution.startedAt}, terminada em ${execution.stoppedAt}`);
      console.log(`  Status: ${execution.status}, modo: ${execution.mode}`);
      
      // Verificar estrutura de dados
      if (execution.data) {
        console.log(`  Estrutura de dados disponível: ${Object.keys(execution.data).join(', ')}`);
        
        if (execution.data.resultData) {
          console.log(`  Estrutura de resultData: ${Object.keys(execution.data.resultData).join(', ')}`);
          
          if (execution.data.resultData.runData) {
            const runDataNodeIds = Object.keys(execution.data.resultData.runData);
            console.log(`  Nós presentes no runData: ${runDataNodeIds.length} (${runDataNodeIds.slice(0, 3).join(', ')}${runDataNodeIds.length > 3 ? '...' : ''})`);
          } else {
            console.log(`  runData não está presente!`);
          }
        } else {
          console.log(`  resultData não está presente!`);
        }
      } else {
        console.log(`  Nenhum dado na execução!`);
      }
    }
    
    // MELHORIA: Verificar todos os possíveis caminhos para dados da execução
    const runData = execution.data?.resultData?.runData || 
                  execution.resultData?.runData || 
                  execution.data?.data?.resultData?.runData ||
                  execution.runData;
    
    if (!runData && debug) {
      console.log(`  Não foi possível encontrar runData na execução ${executionId}`);
    }
    
    // MELHORIA: Extrair dados diretamente dos nós mesmo se não formos encontrar nós OpenAI específicos
    if (runData) {
      try {
        // Processar cada nó presente na execução
        for (const nodeName in runData) {
          if (!runData[nodeName] || !Array.isArray(runData[nodeName])) continue;
          
          const nodeExecutions = runData[nodeName];
          
          // Para cada execução do nó
          for (const nodeExecution of nodeExecutions) {
            if (!nodeExecution.data?.json) continue;
            
            const json = nodeExecution.data.json;
            
            // MELHORIA: Verificar dados da OpenAI em qualquer nó que tenha informações relevantes
            if (json.model || json.Model || 
                (json.usage && (json.usage.total_tokens || json.usage.prompt_tokens)) ||
                (json.tokenUsage && (json.tokenUsage.totalTokens || json.tokenUsage.promptTokens))) {
              
              // Modelo - tentar diferentes localizações
              const model = json.model || json.Model || 'unknown';
              
              // Tokens - tentar diferentes formatos
              const usage = json.usage || json.tokenUsage || {};
              const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
              const completionTokens = usage.completion_tokens || usage.completionTokens || 0;
              const totalTokens = usage.total_tokens || usage.totalTokens || (promptTokens + completionTokens) || 0;
              
              // Calcular custo
              const cost = calculateOpenAICost(model, promptTokens, completionTokens);
              
              if (debug) {
                console.log(`  Encontrado uso da OpenAI em ${nodeName}: modelo=${model}, tokens=${totalTokens}`);
              }
              
              // Gerar ID de request único
              const requestId = `${workflowId}_${nodeName}_${executionId}_${Date.now().toString(36).substring(2, 7)}`;
              
              records.push({
                workflow_id: workflowId,
                workflow_name: workflowName,
                workflow_tags: workflowTags,
                execution_id: executionId,
                start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
                end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
                node_name: nodeName,
                model: model,
                tokens_prompt: promptTokens,
                tokens_completion: completionTokens, 
                tokens_total: totalTokens,
                estimated_cost: cost,
                tags: workflowTags,
                metadata: {
                  source: `n8n_sync_${source}`,
                  node_type: 'detected_automatically',
                  node_id: nodeName,
                  execution_id: executionId,
                  start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
                  end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
                  is_estimated: false
                },
                request_id: requestId
              });
            }
            
            // MELHORIA: Verificar também campos aninhados que possam conter dados da OpenAI
            ['request', 'response', 'data', 'result'].forEach(field => {
              if (json[field] && typeof json[field] === 'object') {
                const nestedJson = json[field];
                
                if (nestedJson.model || 
                    (nestedJson.usage && (nestedJson.usage.total_tokens || nestedJson.usage.prompt_tokens)) ||
                    (nestedJson.tokenUsage && (nestedJson.tokenUsage.totalTokens || nestedJson.tokenUsage.promptTokens))) {
                  
                  // Modelo - tentar diferentes localizações
                  const model = nestedJson.model || nestedJson.Model || 'unknown';
                  
                  // Tokens - tentar diferentes formatos
                  const usage = nestedJson.usage || nestedJson.tokenUsage || {};
                  const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
                  const completionTokens = usage.completion_tokens || usage.completionTokens || 0;
                  const totalTokens = usage.total_tokens || usage.totalTokens || (promptTokens + completionTokens) || 0;
                  
                  // Calcular custo
                  const cost = calculateOpenAICost(model, promptTokens, completionTokens);
                  
                  if (debug) {
                    console.log(`  Encontrado uso da OpenAI em ${nodeName}.${field}: modelo=${model}, tokens=${totalTokens}`);
                  }
                  
                  // Gerar ID de request único
                  const requestId = `${workflowId}_${nodeName}_${field}_${executionId}_${Date.now().toString(36).substring(2, 7)}`;
                  
                  records.push({
                    workflow_id: workflowId,
                    workflow_name: workflowName,
                    workflow_tags: workflowTags,
                    execution_id: executionId,
                    start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
                    end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
                    node_name: `${nodeName} (${field})`,
                    model: model,
                    tokens_prompt: promptTokens,
                    tokens_completion: completionTokens,
                    tokens_total: totalTokens,
                    estimated_cost: cost,
                    tags: workflowTags,
                    metadata: {
                      source: `n8n_sync_${source}`,
                      node_type: 'detected_automatically',
                      node_id: nodeName,
                      execution_id: executionId,
                      start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
                      end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
                      is_estimated: false
                    },
                    request_id: requestId
                  });
                }
              }
            });
          }
        }
      } catch (extractError) {
        console.error(`  Erro ao extrair dados da execução ${executionId}:`, extractError);
      }
    }
    
    // MELHORIA: Se não encontramos registros, tentar os modos legados para compatibilidade
    if (records.length === 0 && !modoAvancado) {
      try {
        const openAIExecution = await processExecutionLegacy(execution, openaiNodes, {id: workflowId, name: workflowName});
        
        for (const usage of openAIExecution) {
          records.push({
            workflow_id: workflowId,
            workflow_name: workflowName,
            workflow_tags: workflowTags,
            execution_id: executionId,
            start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
            end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
            node_name: usage.nodeName,
            model: usage.model || 'desconhecido',
            tokens_prompt: usage.promptTokens || 0,
            tokens_completion: usage.completionTokens || 0,
            tokens_total: usage.totalTokens || 0,
            estimated_cost: usage.cost || 0,
            tags: workflowTags,
            metadata: {
              source: `n8n_sync_${source}`,
              node_type: 'desconhecido',
              node_id: usage.nodeId || 'desconhecido',
              execution_id: executionId,
              start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
              end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
              is_estimated: false
            },
            request_id: `${workflowId}_${usage.nodeId}_${executionId}_${Math.random().toString(36).substring(2, 7)}`
          });
        }
      } catch (error) {
        console.warn(`  Erro no processamento legado: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // MELHORIA: Se ainda não encontramos registros e temos nós OpenAI, estimar uso
    if (records.length === 0 && openaiNodes.length > 0) {
      try {
        for (const node of openaiNodes) {
          const estimatedUsage = estimateOpenAIUsageLegacy(
            node,
            new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
            executionId,
            {id: workflowId, name: workflowName}
          );
          
          if (estimatedUsage) {
            records.push({
              workflow_id: workflowId,
              workflow_name: workflowName,
              workflow_tags: workflowTags,
              execution_id: executionId,
              start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
              end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
              node_name: estimatedUsage.nodeName,
              model: estimatedUsage.model || 'desconhecido',
              tokens_prompt: estimatedUsage.promptTokens || 0,
              tokens_completion: estimatedUsage.completionTokens || 0,
              tokens_total: estimatedUsage.totalTokens || 0,
              estimated_cost: estimatedUsage.cost || 0,
              tags: workflowTags,
              metadata: {
                source: `n8n_sync_${source}`,
                node_type: 'estimado',
                node_id: estimatedUsage.nodeId || 'desconhecido',
                execution_id: executionId,
                start_time: new Date(execution.startedAt || execution.createdAt || Date.now()).toISOString(),
                end_time: new Date(execution.stoppedAt || execution.finishedAt || Date.now()).toISOString(),
                is_estimated: true
              },
              request_id: `${workflowId}_${node.id}_${executionId}_estimated_${Math.random().toString(36).substring(2, 7)}`
            });
          }
        }
      } catch (estimateError) {
        console.warn(`  Erro ao estimar uso: ${estimateError instanceof Error ? estimateError.message : String(estimateError)}`);
      }
    }
    
    if (debug) {
      if (records.length > 0) {
        console.log(`  Extraídos ${records.length} registros da execução ${executionId}`);
      } else {
        console.log(`  Nenhum registro extraído da execução ${executionId}`);
      }
    }
    
    return records;
  } catch (error) {
    console.error(`Erro ao processar execução ${executionId}:`, error);
    return [];
  }
}

// Função de compatibilidade com a versão antiga de processamento
async function processExecutionLegacy(
  execution: any, 
  openaiNodes: OpenAINode[], 
  workflow: any
): Promise<OpenAIExecution[]> {
  const results: OpenAIExecution[] = [];
  
  try {
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
          console.warn(`  Aviso: Não foi possível obter detalhes da execução ${execution.id}: ${executionResponse.status}`);
          return results;
        }
        
        execution = await executionResponse.json();
      } catch (error) {
        console.warn(`  Aviso: Erro ao buscar detalhes da execução ${execution.id}:`, error);
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
              try {
                const openAIData = extractOpenAIData(nodeExecution.data.json, openaiNode, timestamp, execution.id);
                
                if (openAIData) {
                  openAIData.workflowId = workflow.id;
                  openAIData.workflowName = workflow.name;
                  results.push(openAIData);
                }
              } catch (extractError) {
                console.error(`    Erro ao extrair dados de nó ${openaiNode.name}:`, extractError);
              }
            }
          }
        }
      }
    }
    
    // Se após todas as verificações não tivermos nenhum resultado,
    // criar registros baseados nos parâmetros dos nós
    if (results.length === 0) {
      for (const openaiNode of openaiNodes) {
        try {
          const estimatedData = estimateOpenAIUsageLegacy(openaiNode, timestamp, execution.id, workflow);
          if (estimatedData) {
            results.push(estimatedData);
          }
        } catch (estimateError) {
          console.error(`    Erro ao estimar uso para nó ${openaiNode.name}:`, estimateError);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error(`  Erro ao processar execução ${execution.id}:`, error);
    return [];  // Retornar array vazio em vez de propagar erro
  }
}

// Função para estimar uso da OpenAI com base nos parâmetros do nó - versão antiga
function estimateOpenAIUsageLegacy(
  node: OpenAINode, 
  timestamp: string, 
  executionId: string, 
  workflow: any
): OpenAIExecution | null {
  try {
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
      try {
        promptEstimate = node.parameters.messages.reduce((acc: number, msg: any) => {
          try {
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
            return acc + (content.length / 4); // Estimativa grosseira: 4 caracteres ~= 1 token
          } catch (error) {
            console.warn(`      Aviso: Erro ao estimar tokens para mensagem:`, error);
            return acc;
          }
        }, 0);
      } catch (error) {
        console.warn(`    Aviso: Erro ao processar mensagens para estimativa:`, error);
        promptEstimate = 10; // Valor padrão
      }
    } else if (node.parameters?.prompt) {
      try {
        const promptContent = typeof node.parameters.prompt === 'string' ? 
          node.parameters.prompt : JSON.stringify(node.parameters.prompt || '');
        promptEstimate = promptContent.length / 4;
      } catch (error) {
        console.warn(`    Aviso: Erro ao processar prompt para estimativa:`, error);
        promptEstimate = 10; // Valor padrão
      }
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
  } catch (error) {
    console.error(`    Erro ao estimar uso para nó ${node.name}:`, error);
    return null;
  }
}

// Função para extrair dados de uso da OpenAI dos dados de execução
function extractOpenAIUsageFromRunData(
  workflowId: string,
  workflowName: string,
  workflowTags: string[],
  openaiNodes: OpenAINode[],
  execution: any,
  debug: boolean = false
): RecordToSave[] {
  const records: RecordToSave[] = [];
  const runData = execution.data.resultData.runData;
  
  // Mapear os IDs dos nós OpenAI para facilitar a busca
  const openaiNodeMap = new Map(openaiNodes.map(node => [node.id, node]));
  
  if (debug) {
    console.log(`  Analisando runData com ${Object.keys(runData).length} nós`);
    console.log(`  Nós OpenAI disponíveis: ${openaiNodes.map(n => n.name).join(', ')}`);
    console.log(`  IDs dos nós OpenAI: ${openaiNodes.map(n => n.id).join(', ')}`);
  }
  
  // Processar cada nó no runData
  for (const nodeId in runData) {
    // Verificar se é um nó OpenAI pelo ID
    const openaiNode = openaiNodeMap.get(nodeId);
    
    // Se não encontrou pelo ID, tentar encontrar pelo nome
    let matchedNode = openaiNode;
    if (!matchedNode) {
      // Verificar se algum nó OpenAI tem o mesmo nome que a chave no runData
      for (const node of openaiNodes) {
        if (node.name === nodeId) {
          matchedNode = node;
          if (debug) console.log(`    Nó "${nodeId}" encontrado por nome em vez de ID`);
          break;
        }
      }
    }
    
    if (!matchedNode) {
      // Verificar se este nó, mesmo não sendo OpenAI, contém dados de uso da OpenAI
      // Isso pode acontecer em nós que processam resultados de nós OpenAI
      if (debug) console.log(`    Verificando se nó "${nodeId}" contém dados de uso da OpenAI`);
      
      try {
        const nodeData = runData[nodeId];
        if (!nodeData || !Array.isArray(nodeData) || nodeData.length === 0) continue;
        
        for (let i = 0; i < nodeData.length; i++) {
          const nodeExecution = nodeData[i];
          if (!nodeExecution.data) continue;
          
          // Verificar se há dados de uso da OpenAI
          let foundOpenAIData = false;
          let model = '';
          let usageData = null;
          
          // Verificar no data.json
          if (nodeExecution.data.json) {
            const json = nodeExecution.data.json;
            
            // Verificar se é uma resposta da OpenAI
            if (json.model && (
                json.model.includes('gpt') || 
                json.model.includes('davinci') || 
                json.model.includes('embedding')
            )) {
              foundOpenAIData = true;
              model = json.model;
              
              if (json.usage) {
                usageData = json.usage;
              } else if (json.tokenUsage) {
                usageData = json.tokenUsage;
              }
              
              if (debug) console.log(`    Encontrados dados da OpenAI em nó não-OpenAI "${nodeId}"`);
            }
            
            // Verificar em campos aninhados
            if (!foundOpenAIData) {
              for (const field of ['data', 'response', 'result', 'output', 'content']) {
                if (json[field] && typeof json[field] === 'object') {
                  if (json[field].model && (
                      json[field].model.includes('gpt') || 
                      json[field].model.includes('davinci') || 
                      json[field].model.includes('embedding')
                  )) {
                    foundOpenAIData = true;
                    model = json[field].model;
                    
                    if (json[field].usage) {
                      usageData = json[field].usage;
                    } else if (json[field].tokenUsage) {
                      usageData = json[field].tokenUsage;
                    }
                    
                    if (debug) console.log(`    Encontrados dados da OpenAI em campo "${field}" do nó "${nodeId}"`);
                    break;
                  }
                }
              }
            }
            
            // Se encontrou dados da OpenAI, criar registro
            if (foundOpenAIData && usageData) {
              // Criar ID de request único
              const requestId = `${workflowId}_${nodeId}_${execution.id}_${i}_${Math.random().toString(36).substring(2, 7)}`;
              
              // Criar registro com os dados encontrados
              records.push({
                workflow_id: workflowId,
                workflow_name: workflowName,
                workflow_tags: workflowTags,
                execution_id: execution.id,
                start_time: new Date(execution.startedAt).toISOString(),
                end_time: new Date(execution.stoppedAt).toISOString(),
                node_name: nodeId,
                model: model,
                tokens_prompt: usageData.prompt_tokens || 0,
                tokens_completion: usageData.completion_tokens || 0,
                tokens_total: usageData.total_tokens || 0,
                estimated_cost: calculateOpenAICost(model, usageData.prompt_tokens || 0, usageData.completion_tokens || 0),
                tags: workflowTags,
                metadata: {
                  source: `n8n_direct_extract_${source}`,
                  extracted_at: new Date().toISOString(),
                  is_estimate: false,
                  execution_id: execution.id,
                  node_id: nodeId,
                  node_name: nodeId,
                  node_type: 'detected-openai'
                },
                request_id: requestId
              });
              
              if (debug) console.log(`    Extraído registro de uso para nó "${nodeId}" (modelo: ${model})`);
            }
          }
        }
      } catch (error) {
        if (debug) console.log(`    Erro ao verificar nó "${nodeId}": ${error instanceof Error ? error.message : String(error)}`);
      }
      
      continue;
    }
    
    if (debug) console.log(`    Analisando dados de execução do nó "${matchedNode.name}" (${nodeId})`);
    
    // Processar dados de execução do nó
    try {
      const nodeData = runData[nodeId];
      if (!nodeData || !Array.isArray(nodeData) || nodeData.length === 0) {
        if (debug) console.log(`    Nenhum dado encontrado para o nó "${matchedNode.name}"`);
        continue;
      }
      
      // Para cada execução do nó
      for (let i = 0; i < nodeData.length; i++) {
        const nodeExecution = nodeData[i];
        
        // Verificar se temos dados úteis
        if (!nodeExecution.data) {
          if (debug) console.log(`    Execução ${i+1} do nó "${matchedNode.name}" não contém dados`);
          continue;
        }
        
        // Verificar data.json para resultado do nó
        let usageData: any = null;
        let responseData: any = null;
        
        // Primeiro tentar encontrar no data.json (resultado do nó)
        if (nodeExecution.data.json) {
          responseData = nodeExecution.data.json;
          
          // Extrair usage do padrão de resposta da OpenAI
          if (responseData.usage) {
            usageData = responseData.usage;
            if (debug) console.log(`    Encontrado usage direto na resposta`);
          }
          
          // Tenta encontrar em outros formatos comuns
          if (!usageData) {
            if (responseData.openai_usage) usageData = responseData.openai_usage;
            else if (responseData.openaiUsage) usageData = responseData.openaiUsage;
            else if (responseData.token_usage) usageData = responseData.token_usage;
            else if (responseData.tokenUsage) usageData = responseData.tokenUsage;
          }
          
          // Verificar em campos aninhados
          if (!usageData) {
            for (const field of ['data', 'response', 'result', 'output', 'content']) {
              if (responseData[field] && typeof responseData[field] === 'object') {
                if (responseData[field].usage) {
                  usageData = responseData[field].usage;
                  if (debug) console.log(`    Encontrado usage no campo "${field}"`);
                  break;
                } else if (responseData[field].tokenUsage) {
                  usageData = responseData[field].tokenUsage;
                  if (debug) console.log(`    Encontrado tokenUsage no campo "${field}"`);
                  break;
                }
              }
            }
          }
          
          // Verificar se há tokens individuais
          if (!usageData && (
              responseData.prompt_tokens !== undefined || 
              responseData.completion_tokens !== undefined || 
              responseData.total_tokens !== undefined
          )) {
            usageData = {
              prompt_tokens: responseData.prompt_tokens || 0,
              completion_tokens: responseData.completion_tokens || 0,
              total_tokens: responseData.total_tokens || 0
            };
            if (debug) console.log(`    Encontrados tokens individuais na resposta`);
          }
        }
        
        // Se não encontrou na resposta, tentar extrair do data.binary
        if (!usageData && nodeExecution.data.binary) {
          try {
            for (const binaryKey in nodeExecution.data.binary) {
              const binaryData = nodeExecution.data.binary[binaryKey];
              if (binaryData && binaryData.data) {
                // Tentar fazer parse do data que pode estar em base64
                const decodedData = Buffer.from(binaryData.data, 'base64').toString('utf-8');
                try {
                  const jsonData = JSON.parse(decodedData);
                  if (jsonData.usage) {
                    usageData = jsonData.usage;
                    if (debug) console.log(`    Encontrado usage em dados binários`);
                    break;
                  } else if (jsonData.tokenUsage) {
                    usageData = jsonData.tokenUsage;
                    if (debug) console.log(`    Encontrado tokenUsage em dados binários`);
                    break;
                  }
                } catch (jsonError) {
                  // Ignorar erro de parse JSON
                }
              }
            }
          } catch (err) {
            if (debug) console.log(`    Erro ao processar dados binários: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        
        // Se encontrou dados de uso
        if (usageData) {
          // Extrair informações do modelo
          let model = 'desconhecido';
          if (responseData && responseData.model) {
            model = responseData.model;
          } else if (matchedNode.parameters && matchedNode.parameters.model) {
            model = matchedNode.parameters.model;
          }
          
          // Criar ID de request único
          const requestId = `${workflowId}_${matchedNode.id}_${execution.id}_${i}_${Math.random().toString(36).substring(2, 7)}`;
          
          // Criar registro com os dados encontrados
          records.push({
            workflow_id: workflowId,
            workflow_name: workflowName,
            workflow_tags: workflowTags,
            execution_id: execution.id,
            start_time: new Date(execution.startedAt).toISOString(),
            end_time: new Date(execution.stoppedAt).toISOString(),
            node_name: matchedNode.name,
            model: model,
            tokens_prompt: usageData.prompt_tokens || 0,
            tokens_completion: usageData.completion_tokens || 0,
            tokens_total: usageData.total_tokens || 0,
            estimated_cost: calculateOpenAICost(model, usageData.prompt_tokens || 0, usageData.completion_tokens || 0),
            tags: workflowTags,
            metadata: {
              source: `n8n_direct_extract_${source}`,
              extracted_at: new Date().toISOString(),
              is_estimate: false,
              execution_id: execution.id,
              node_id: matchedNode.id,
              node_name: matchedNode.name,
              node_type: matchedNode.type
            },
            request_id: requestId
          });
          
          if (debug) console.log(`    Extraído registro de uso para nó "${matchedNode.name}" (modelo: ${model})`);
        } else {
          if (debug) console.log(`    Não foi encontrado dados de uso no nó "${matchedNode.name}"`);
        }
      }
    } catch (error) {
      console.warn(`    Erro ao processar dados de execução do nó "${matchedNode.name}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return records;
}

// Função para estimar o uso da OpenAI com base nos parâmetros do nó
function estimateOpenAIUsage(
  workflowId: string,
  workflowName: string,
  workflowTags: string[],
  node: OpenAINode,
  execution: any,
  debug: boolean = false
): RecordToSave | null {
  try {
    if (debug) console.log(`    Estimando uso para nó "${node.name}" (${node.id})`);
    
    // Extrair informações do modelo
    let model = 'desconhecido';
    let inputTokens = 0;
    let outputTokens = 0;
    
    // Tentar obter o modelo dos parâmetros
    if (node.parameters && node.parameters.model) {
      model = node.parameters.model;
    }
    
    // Estimar tokens com base nos parâmetros
    try {
      // Processar mensagens (para nós de chat)
      if (node.parameters && node.parameters.messages) {
        try {
          const messages = node.parameters.messages;
          if (Array.isArray(messages)) {
            for (const msg of messages) {
              if (msg.content) {
                // Estimar tokens baseado no comprimento do texto
                inputTokens += Math.ceil(msg.content.length / 4);
              }
            }
          } else if (typeof messages === 'string') {
            inputTokens += Math.ceil(messages.length / 4);
          }
        } catch (messageError) {
          if (debug) console.log(`      Erro ao processar mensagens: ${messageError instanceof Error ? messageError.message : String(messageError)}`);
        }
      }
      
      // Processar prompt (para nós de completions)
      if (node.parameters && node.parameters.prompt) {
        try {
          if (typeof node.parameters.prompt === 'string') {
            inputTokens += Math.ceil(node.parameters.prompt.length / 4);
          }
        } catch (promptError) {
          if (debug) console.log(`      Erro ao processar prompt: ${promptError instanceof Error ? promptError.message : String(promptError)}`);
        }
      }
      
      // Para nós de embedding
      if (node.parameters && node.parameters.text) {
        try {
          if (typeof node.parameters.text === 'string') {
            inputTokens += Math.ceil(node.parameters.text.length / 4);
          }
        } catch (textError) {
          if (debug) console.log(`      Erro ao processar texto: ${textError instanceof Error ? textError.message : String(textError)}`);
        }
      }
      
      // Estimar tokens de resposta com base no tipo de nó e modelo
      if (model.includes('gpt-4')) {
        outputTokens = Math.ceil(inputTokens * 0.5); // GPT-4 geralmente tem respostas mais curtas
      } else if (model.includes('gpt-3.5')) {
        outputTokens = Math.ceil(inputTokens * 0.7); // GPT-3.5 pode ser mais verboso
      } else if (model.includes('embedding')) {
        outputTokens = 0; // Embeddings não têm tokens de saída
      } else {
        outputTokens = Math.ceil(inputTokens * 0.6); // Estimativa padrão
      }
    } catch (tokenError) {
      console.warn(`      Erro ao estimar tokens: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`);
      // Usar valores padrão para não interromper a execução
      inputTokens = 100;
      outputTokens = 50;
    }
    
    // Se não conseguiu estimar nenhum token, retornar null
    if (inputTokens === 0 && outputTokens === 0) {
      if (debug) console.log(`      Não foi possível estimar tokens para o nó "${node.name}"`);
      return null;
    }
    
    const totalTokens = inputTokens + outputTokens;
    const cost = calculateOpenAICost(model, inputTokens, outputTokens);
    
    // Criar ID de request único
    const requestId = `${workflowId}_${node.id}_${execution.id}_est_${Math.random().toString(36).substring(2, 7)}`;
    
    if (debug) {
      console.log(`      Estimativa para nó "${node.name}" (${model}):`);
      console.log(`        - Tokens de prompt: ${inputTokens}`);
      console.log(`        - Tokens de conclusão: ${outputTokens}`);
      console.log(`        - Total de tokens: ${totalTokens}`);
      console.log(`        - Custo estimado: $${cost.toFixed(6)}`);
    }
    
    return {
      workflow_id: workflowId,
      workflow_name: workflowName,
      workflow_tags: workflowTags,
      execution_id: execution.id,
      start_time: new Date(execution.startedAt).toISOString(),
      end_time: new Date(execution.stoppedAt).toISOString(),
      node_name: node.name,
      model: model,
      tokens_prompt: inputTokens,
      tokens_completion: outputTokens,
      tokens_total: totalTokens,
      estimated_cost: cost,
      tags: workflowTags,
      metadata: {
        source: `n8n_sync_${source}`,
        extracted_at: new Date().toISOString(),
        is_estimate: false,
        execution_id: execution.id,
        node_id: node.id,
        node_name: node.name,
        node_type: node.type
      },
      request_id: requestId
    };
  } catch (error) {
    console.warn(`    Erro ao estimar uso para nó "${node.name}": ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Extrair dados OpenAI dos resultados
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
    workflowId: executionId,
    workflowName: executionId,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    cost,
    parameters: node.parameters,
    rawData: json
  };
}

// Calcular custo OpenAI
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

// Formatar registro para o Supabase
function formatRecordForSupabase(
  execution: OpenAIExecution, 
  workflow: any,
  source: string
): any {
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
      source: `n8n_direct_extract_${source}`,
      extracted_at: new Date().toISOString(),
      is_estimate: execution.rawData ? false : true,
      execution_id: execution.id,
      node_id: execution.nodeId,
      node_name: execution.nodeName,
      node_type: execution.parameters?.nodeType || 'unknown'
    }
  };
} 