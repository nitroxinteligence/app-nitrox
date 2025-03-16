import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Environment variables and configuration
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// Constants for configuration
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_TTL = 300000; // 5 minutes in milliseconds

// Initialize Supabase client with error handling
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Interfaces
interface ProcessedLead {
  remotejid: string;
  status: 'captured' | 'qualified' | 'unqualified';
  timestamp: string;
  workflowId: string;
  workflowName: string;
  nodeId?: string;
  executionId?: string;
  source?: string;
  campaign?: string;
  tags: string[];
  details?: any;
}

interface LeadMetrics {
  date: string;
  total_leads: number;
  qualified_leads: number;
  unqualified_leads: number;
  conversion_rate: number;
  workflow_id: string;
  workflow_name: string;
  agent_name?: string;
  hour: number;
  weekday: number;
  month: number;
  year: number;
  lead_details: any;
  tags: string[];
  source?: string;
  campaign?: string;
}

// Cache management
const metricsCache = new Map<string, { data: any; timestamp: number }>();
const workflowExecutionsCache = new Map<string, any[]>();

// Utility Functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^0-9]/g, '').replace(/^(55|0|)(\d{2})(\d{8,9})$/, '$2$3');
};

const getDateParts = (date: Date) => ({
  hour: date.getHours(),
  weekday: date.getDay(),
  month: date.getMonth() + 1,
  year: date.getFullYear()
});

// Enhanced error handling with retry mechanism
async function retryableRequest<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY * attempt);
    }
  }
  throw new Error('All retry attempts failed');
}

// Função para buscar workflows do N8N
async function getMainAgentWorkflows() {
  try {
    console.log('\n=== Iniciando busca por workflows com tag "main agent" ===');
    const cacheKey = 'main_agent_workflows';
    const now = Date.now();
    const cachedData = metricsCache.get(cacheKey);
    
    // Verificar cache
    if (cachedData && now - cachedData.timestamp < 5 * 60 * 1000) { // Cache de 5 minutos
      console.log('Usando workflows em cache');
      return cachedData.data;
    }
    
    console.log('Buscando workflows na API do N8N');
    console.log(`URL da API: ${N8N_API_URL}`);
    console.log(`API Key presente: ${Boolean(N8N_API_KEY)}`);
    
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    };
    
    // Buscar todos os workflows
    console.log('Buscando todos os workflows...');
    let response = await fetch(`${N8N_API_URL}/workflows`, { headers });
    
    if (!response.ok) {
      console.error(`Erro ao buscar workflows: ${response.status} ${response.statusText}`);
      throw new Error(`Falha na requisição: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Extrair a array de workflows da estrutura { data: [...], nextCursor: ... }
    const workflows = (responseData.data || responseData) as any[];
    
    if (!Array.isArray(workflows)) {
      console.error('Resposta inválida da API do N8N ao buscar workflows');
      throw new Error('Formato de resposta inválido da API do N8N');
    }
    
    console.log(`Encontrados ${workflows.length} workflows no total`);
    
    // Procurar workflows com tag "main agent"
    // Primeiro, vamos logar todas as tags para debugging
    workflows.forEach((workflow, index) => {
      if (workflow.tags) {
        const tagInfo = Array.isArray(workflow.tags) 
          ? workflow.tags.map((t: any) => typeof t === 'string' ? t : (t.name || JSON.stringify(t)))
          : [workflow.tags];
        console.log(`Workflow ${index+1}: ${workflow.name} - Tags: ${tagInfo.join(', ')}`);
      }
    });
    
    // Procurar o workflow com tag "main agent" - mais flexível para capturar variações
    let mainAgentWorkflows = workflows.filter((workflow: any) => {
      if (!workflow.tags) return false;
      
      const tags = Array.isArray(workflow.tags) 
        ? workflow.tags 
        : (typeof workflow.tags === 'string' ? [workflow.tags] : []);
      
      return tags.some((tag: any) => {
        if (typeof tag === 'string') {
          return (
            tag.toLowerCase() === 'main agent' || 
            tag.toLowerCase().includes('main agent') ||
            (tag.toLowerCase().includes('main') && tag.toLowerCase().includes('agent'))
          );
        } else if (tag && typeof tag === 'object' && tag.name) {
          // Verificar se é objeto com propriedade name
          const tagName = tag.name.toLowerCase();
          return (
            tagName === 'main agent' ||
            tagName.includes('main agent') ||
            (tagName.includes('main') && tagName.includes('agent'))
          );
        }
        return false;
      });
    });
    
    // Fallback: Se não encontrar "main agent", procura por apenas "agent"
    if (mainAgentWorkflows.length === 0) {
      console.log('Nenhum workflow com tag "main agent" encontrado. Buscando workflows com tag "agent"...');
      
      mainAgentWorkflows = workflows.filter((workflow: any) => {
        if (!workflow.tags) return false;
        
        const tags = Array.isArray(workflow.tags) 
          ? workflow.tags 
          : (typeof workflow.tags === 'string' ? [workflow.tags] : []);
        
        return tags.some((tag: any) => {
          if (typeof tag === 'string') {
            return tag.toLowerCase().includes('agent');
          } else if (tag && typeof tag === 'object' && tag.name) {
            return tag.name.toLowerCase().includes('agent');
          }
          return false;
        });
      });
    }
    
    console.log(`Encontrados ${mainAgentWorkflows.length} workflows com tag "main agent" ou "agent":`);
    mainAgentWorkflows.forEach((w: any, i: number) => {
      console.log(`${i+1}. ${w.name} (ID: ${w.id})`);
    });
    
    // Armazenar em cache
    metricsCache.set(cacheKey, { data: mainAgentWorkflows, timestamp: now });
    
    return mainAgentWorkflows;
  } catch (error) {
    console.error('Erro ao buscar workflows:', error);
    // Não interrompe o processo, retorna array vazio
    return [];
  }
}

// Enhanced execution fetching with pagination and detailed logging
async function getWorkflowExecutions(workflowId: string, days = 30) {
  console.log(`\n=== Buscando execuções para o workflow ${workflowId} ===`);
  console.log(`Procurando execuções dos últimos ${days} dias`);
  
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - days);
  console.log('Data limite:', limitDate.toISOString());
  
  let allExecutions: any[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let page = 1;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  // Verifica se temos um cache para este workflow
  const cacheKey = `executions_${workflowId}_${limitDate.toISOString().split('T')[0]}`;
  const cachedExecutions = workflowExecutionsCache.get(cacheKey);
  
  if (cachedExecutions) {
    console.log(`\nUsando cache de execuções para workflow ${workflowId}`);
    console.log(`Total de execuções em cache: ${cachedExecutions.length}`);
    
    // Diagnóstico: Exibir estrutura da primeira execução
    if (cachedExecutions.length > 0) {
      console.log('\n=== DIAGNÓSTICO: EXEMPLO DE EXECUÇÃO ===');
      try {
        const sampleExecution = cachedExecutions[0];
        // Mostrar chaves de alto nível
        console.log('Chaves de alto nível:', Object.keys(sampleExecution).join(', '));
        
        // Verificar se há nós de execução em data.resultData.runData
        if (sampleExecution.data?.resultData?.runData) {
          const nodeIds = Object.keys(sampleExecution.data.resultData.runData);
          console.log(`Nós encontrados (${nodeIds.length}):`, nodeIds.join(', '));
          
          // Verificar o primeiro nó
          if (nodeIds.length > 0) {
            const firstNodeId = nodeIds[0];
            const nodeItems = sampleExecution.data.resultData.runData[firstNodeId];
            
            if (Array.isArray(nodeItems) && nodeItems.length > 0) {
              console.log(`Exemplo do primeiro item do nó ${firstNodeId}:`, 
                JSON.stringify(nodeItems[0], null, 2).substring(0, 500) + '...');
            }
          }
        } else {
          console.log('Não foi encontrada a estrutura data.resultData.runData');
          // Tentar encontrar dados em outros caminhos
          console.log('Estrutura alternativa:', JSON.stringify(sampleExecution, null, 2).substring(0, 1000) + '...');
        }
      } catch (error) {
        console.error('Erro ao analisar a execução:', error);
      }
      console.log('=== FIM DO DIAGNÓSTICO ===\n');
    }
    
    return processExecutions(cachedExecutions, limitDate);
  }

  try {
    // Loop para paginação com cursor
    while (hasMore && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      console.log(`\nBuscando página ${page} de execuções${cursor ? ` (cursor: ${cursor})` : ''}`);
      
      try {
        // Tentar buscar execuções usando a API do N8N
        const executions = await fetchExecutionsWithRetry(workflowId, cursor);
        
        if (executions.items && executions.items.length > 0) {
          console.log(`Recebidas ${executions.items.length} execuções`);
          allExecutions = [...allExecutions, ...executions.items];
          cursor = executions.nextCursor;
          hasMore = !!cursor;
          page++;
          consecutiveErrors = 0;
        } else {
          console.log('Nenhuma execução recebida nesta página');
          hasMore = false;
        }
      } catch (error) {
        console.error(`Erro ao buscar página ${page} de execuções:`, error);
        consecutiveErrors++;
      }
      
      // Limitar o número total de execuções para evitar sobrecarga
      if (allExecutions.length >= 100) {
        console.log(`Limite de 100 execuções atingido. Interrompendo paginação.`);
        hasMore = false;
      }
    }
    
    console.log(`\nTotal de ${allExecutions.length} execuções obtidas em ${page} páginas`);
    
    // Verificar se as execuções têm dados
    const hasData = allExecutions.some(exec => exec.data?.resultData?.runData);
    
    if (!hasData && allExecutions.length > 0) {
      console.log('\n⚠️ As execuções não contêm dados completos. Tentando método alternativo...');
      const enhancedExecutions = await fetchExecutionsAlternative(workflowId, limitDate);
      
      if (enhancedExecutions.length > 0) {
        // Substituir as execuções com as novas que têm dados completos
        allExecutions = enhancedExecutions;
        console.log(`\nObtidas ${allExecutions.length} execuções com dados completos via método alternativo`);
      }
    }
    
    // Armazenar em cache para futuras solicitações
    workflowExecutionsCache.set(cacheKey, allExecutions);
    console.log(`\nArmazenando ${allExecutions.length} execuções em cache para workflow ${workflowId}`);
    
    return processExecutions(allExecutions, limitDate);
  } catch (error) {
    console.error('Erro ao buscar execuções:', error);
    
    // Tentar método alternativo
    console.log('\nTentando método alternativo para buscar execuções...');
    try {
      const executions = await fetchExecutionsAlternative(workflowId, limitDate);
      return processExecutions(executions, limitDate);
    } catch (alternativeError) {
      console.error('Erro ao buscar execuções (método alternativo):', alternativeError);
      return [];
    }
  }
}

// Function to fetch execution details with specific IDs - useful when summary executions don't have full data
async function fetchFullExecutionDetails(executionIds: string[]): Promise<any[]> {
  console.log(`\nBuscando detalhes completos para ${executionIds.length} execuções...`);
  
  if (!executionIds.length) return [];
  
  // Limitamos a 10 execuções para não sobrecarregar
  const ids = executionIds.slice(0, 10);
  const headers = {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  };
  
  const results = [];
  
  for (const id of ids) {
    try {
      console.log(`Buscando detalhes da execução ${id}...`);
      const response = await fetch(`${N8N_API_URL}/executions/${id}`, { headers });
      
      if (response.ok) {
        const execution = await response.json();
        console.log(`Detalhes obtidos para execução ${id}`);
        results.push(execution);
      } else {
        console.log(`Falha ao obter detalhes da execução ${id}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Erro ao buscar detalhes da execução ${id}:`, error);
    }
    
    // Pequeno delay para não sobrecarregar a API
    await sleep(500);
  }
  
  console.log(`Obtidos detalhes completos de ${results.length}/${ids.length} execuções`);
  return results;
}

// Função auxiliar para processar e filtrar execuções
function processExecutions(executions: any[], limitDate: Date): any[] {
  return executions.filter(execution => {
    // Log detalhado para debug
    console.log(`\nAnalisando execução ${execution.id || 'sem-id'}:`, {
      id: execution.id,
      status: execution.status,
      finished: execution.finished,
      hasData: !!execution.data,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      mode: execution.mode
    });

    // Verificar se tem data
    if (!execution.startedAt && !execution.finishedAt) {
      console.log(`Ignorando execução: sem data de início/fim`);
      return false;
    }

    const executionDate = new Date(execution.startedAt || execution.finishedAt);
    if (isNaN(executionDate.getTime())) {
      console.log(`Ignorando execução: data inválida`);
      return false;
    }

    // Verificar se está dentro do período
    const isWithinPeriod = executionDate > limitDate;
    if (!isWithinPeriod) {
      console.log(`Ignorando execução: fora do período (${executionDate.toISOString()})`);
      return false;
    }

    // Aceitar qualquer status para análise posterior
    console.log(`Execução válida encontrada`);
    return true;
  });
}

// Rota alternativa para buscar execuções quando a API específica falha
async function fetchExecutionsAlternative(workflowId: string, limitDate: Date): Promise<any[]> {
  console.log(`\n=== Tentando método alternativo para buscar execuções do workflow ${workflowId} ===`);
  console.log('Data limite:', limitDate.toISOString());
  
  const headers = {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  };
  
  // Tentar diferentes URLs possíveis
  const possibleUrls = [
    {
      url: `${N8N_API_URL}/executions`,
      body: JSON.stringify({ workflowId }),
      description: 'API v1 com filtro por workflowId no corpo'
    },
    {
      url: `${N8N_API_URL}/workflows/${workflowId}/executions`,
      body: null,
      description: 'Endpoint específico para execuções de um workflow'
    },
    {
      url: `${N8N_API_URL}/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId }))}`,
      body: null,
      description: 'API v1 com filtro por query parameter'
    }
  ];
  
  let allExecutions: any[] = [];
  
  for (const urlData of possibleUrls) {
    try {
      console.log(`Tentando URL: ${urlData.url} (${urlData.description})`);
      
      const response = await fetch(urlData.url, { 
        method: urlData.body ? 'POST' : 'GET',
        headers,
        body: urlData.body
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Resposta recebida da URL: ${urlData.url}`);
        
        // Processar diferentes formatos de resposta
        let executions: any[] = [];
        
        if (Array.isArray(data)) {
          console.log('Resposta é um array direto de execuções');
          executions = data;
        } else if (data.data && Array.isArray(data.data)) {
          console.log('Resposta contém array em data');
          executions = data.data;
        } else if (data.executions && Array.isArray(data.executions)) {
          console.log('Resposta contém array em executions');
          executions = data.executions;
        }
        
        console.log(`URL ${urlData.url} retornou ${executions.length} execuções`);
        
        // Filtrar execuções pela data limite
        const validExecutions = executions.filter((exec: any) => {
          const startedAt = exec.startedAt ? new Date(exec.startedAt) : null;
          return startedAt && startedAt >= limitDate;
        });
        
        console.log(`${validExecutions.length}/${executions.length} execuções após a data limite`);
        
        if (validExecutions.length > 0) {
          // Se as execuções não têm dados, tentar buscar detalhes completos
          const needsDetails = !validExecutions.some(exec => exec.data?.resultData?.runData);
          
          if (needsDetails) {
            console.log('Execuções não têm dados completos. Buscando detalhes...');
            const executionIds = validExecutions.map(exec => exec.id);
            const detailedExecutions = await fetchFullExecutionDetails(executionIds);
            
            if (detailedExecutions.length > 0) {
              allExecutions = [...allExecutions, ...detailedExecutions];
              console.log(`Adicionadas ${detailedExecutions.length} execuções detalhadas`);
              break; // Se conseguimos detalhes, não precisamos tentar mais URLs
            }
          } else {
            allExecutions = [...allExecutions, ...validExecutions];
            console.log(`Adicionadas ${validExecutions.length} execuções`);
            break; // Se temos execuções completas, não precisamos tentar mais URLs
          }
        }
      } else {
        console.log(`Falha com URL ${urlData.url}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Erro com URL ${urlData.url}:`, error);
    }
  }
  
  console.log(`\nMétodo alternativo encontrou ${allExecutions.length} execuções para workflow ${workflowId}`);
  return allExecutions;
}

// Enhanced remotejid extraction with comprehensive pattern matching
function extractRemotejid(nodeData: any): string | null {
  console.log('\n=== Tentando extrair remotejid ===');
  
  if (!nodeData) {
    console.log('nodeData é nulo ou indefinido');
    return null;
  }
  
  try {
    // Exibir a estrutura completa do nodeData para depuração
    console.log('Estrutura do nodeData:', JSON.stringify(nodeData).substring(0, 300) + '...');
    
    // 1. Verificar campo direto
    if (nodeData.remotejid) {
      console.log('✅ remotejid encontrado diretamente:', nodeData.remotejid);
      return nodeData.remotejid;
    }
    
    // 2. Verficar dentro de body
    if (nodeData.body?.remotejid) {
      console.log('✅ remotejid encontrado em body:', nodeData.body.remotejid);
      return nodeData.body.remotejid;
    }
    
    // 3. Verificar campo de telefone
    if (nodeData.phone) {
      console.log('✅ telefone encontrado:', nodeData.phone);
      return nodeData.phone;
    }
    
    if (nodeData.telefone) {
      console.log('✅ telefone encontrado:', nodeData.telefone);
      return nodeData.telefone;
    }
    
    if (nodeData.whatsapp) {
      console.log('✅ whatsapp encontrado:', nodeData.whatsapp);
      return nodeData.whatsapp;
    }
    
    // 4. Verificar campos aninhados
    if (nodeData.json?.remotejid) {
      console.log('✅ remotejid encontrado em json:', nodeData.json.remotejid);
      return nodeData.json.remotejid;
    }
    
    if (nodeData.data?.remotejid) {
      console.log('✅ remotejid encontrado em data:', nodeData.data.remotejid);
      return nodeData.data.remotejid;
    }
    
    if (nodeData.message?.key?.remoteJid) {
      console.log('✅ remotejid encontrado em message.key:', nodeData.message.key.remoteJid);
      return nodeData.message.key.remoteJid;
    }
    
    // 5. Verificar campos aninhados de telefone
    if (nodeData.json?.phone) {
      console.log('✅ telefone encontrado em json:', nodeData.json.phone);
      return nodeData.json.phone;
    }
    
    if (nodeData.data?.phone) {
      console.log('✅ telefone encontrado em data:', nodeData.data.phone);
      return nodeData.data.phone;
    }
    
    if (nodeData.json?.telefone) {
      console.log('✅ telefone encontrado em json:', nodeData.json.telefone);
      return nodeData.json.telefone;
    }
    
    if (nodeData.data?.telefone) {
      console.log('✅ telefone encontrado em data:', nodeData.data.telefone);
      return nodeData.data.telefone;
    }
    
    // 6. Procurar em qualquer campo pelo formato WhatsApp (5511...)
    const jsonStr = JSON.stringify(nodeData);
    const brPhoneRegex = /(55\d{10,13})/;
    const phoneMatch = jsonStr.match(brPhoneRegex);
    
    if (phoneMatch && phoneMatch[1]) {
      console.log('✅ telefone encontrado via regex:', phoneMatch[1]);
      return phoneMatch[1];
    }
    
    // 7. Procurar formato de WhatsApp jid
    const jidRegex = /(\d+@s\.whatsapp\.net)/;
    const jidMatch = jsonStr.match(jidRegex);
    
    if (jidMatch && jidMatch[1]) {
      console.log('✅ remotejid encontrado via regex:', jidMatch[1]);
      return jidMatch[1];
    }
    
    // 8. Procurar números puros em campos populares
    for (const key of ['numero', 'number', 'contact', 'contato', 'client', 'cliente', 'from', 'to', 'destination', 'destino', 'sender', 'recipient']) {
      const value = nodeData[key];
      if (value && typeof value === 'string' && /^\d{10,}$/.test(value)) {
        console.log(`✅ número encontrado em ${key}:`, value);
        return value;
      }
      
      // Verificar em json
      if (nodeData.json && nodeData.json[key] && typeof nodeData.json[key] === 'string' && /^\d{10,}$/.test(nodeData.json[key])) {
        console.log(`✅ número encontrado em json.${key}:`, nodeData.json[key]);
        return nodeData.json[key];
      }
      
      // Verificar em data
      if (nodeData.data && nodeData.data[key] && typeof nodeData.data[key] === 'string' && /^\d{10,}$/.test(nodeData.data[key])) {
        console.log(`✅ número encontrado em data.${key}:`, nodeData.data[key]);
        return nodeData.data[key];
      }
    }
    
    console.log('❌ Nenhum número ou remotejid encontrado');
    return null;
  } catch (error) {
    console.error('Erro ao extrair remotejid:', error);
    return null;
  }
}

// Enhanced lead extraction with comprehensive data capture
function extractLeadsFromExecution(
  execution: any,
  workflowId: string,
  workflowName: string
): ProcessedLead[] {
  const leads: ProcessedLead[] = [];
  
  console.log(`\n=== Extraindo leads da execução ${execution.id || 'sem-id'} ===`);
  
  try {
    // Análise estrutural completa da execução para debug
    const executionKeys = Object.keys(execution || {});
    console.log(`Estrutura de alto nível da execução: ${executionKeys.join(', ')}`);
    
    // Verificar se há dados na execução e sua estrutura
    if (!execution) {
      console.log('❌ Execução vazia ou nula');
      return leads;
    }
    
    // Tentar múltiplos caminhos de dados possíveis (estratégia de matriz de acesso)
    const dataPaths = [
      { path: 'data.resultData.runData', description: 'Caminho padrão' },
      { path: 'data', description: 'Dados diretamente no objeto data' },
      { path: 'finished.data', description: 'Dados em finished.data' },
      { path: 'results', description: 'Dados em results' },
      { path: 'payload.data', description: 'Dados em payload.data' },
      { path: 'executionData.resultData.runData', description: 'Caminho alternativo' },
      { path: 'executionData.data', description: 'Dados em executionData.data' },
      { path: 'output', description: 'Dados na saída' }
    ];
    
    // Função auxiliar para acessar um caminho aninhado em um objeto
    const getNestedValue = (obj: any, path: string): any => {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };
    
    // Verificar cada caminho possível e logar o conteúdo para debug
    for (const { path, description } of dataPaths) {
      const data = getNestedValue(execution, path);
      if (data) {
        console.log(`✅ Dados encontrados em '${path}' (${description})`);
        
        // Análise estrutural dos dados
        if (typeof data === 'object') {
          const dataKeys = Object.keys(data);
          console.log(`Estrutura dos dados em '${path}': ${dataKeys.join(', ')}`);
          
          // Se for um objeto, tentar processar como node data
          if (dataKeys.length > 0) {
            // Caso 1: Já é uma estrutura de nodes (mais comum)
            if (dataKeys.some(key => key.includes('node'))) {
              console.log(`Processando estrutura de nodes em '${path}'`);
              return processNodeData(data, workflowId, workflowName);
            }
            
            // Caso 2: É uma lista de itens/leads diretos
            if (Array.isArray(data)) {
              console.log(`Processando array com ${data.length} itens em '${path}'`);
              return processArrayData(data, workflowId, workflowName);
            }
            
            // Caso 3: Estrutura desconhecida - fazer busca profunda
            console.log(`Estrutura desconhecida em '${path}' - realizando busca profunda`);
            const extractedLeads = deepSearchForLeads(data, workflowId, workflowName);
            if (extractedLeads.length > 0) {
              console.log(`Encontrados ${extractedLeads.length} leads por busca profunda`);
              return extractedLeads;
            }
          }
        } else if (typeof data === 'string') {
          // Tentar analisar como JSON
          try {
            const parsedData = JSON.parse(data);
            console.log(`Dados em '${path}' são string JSON - analisando conteúdo`);
            const extractedLeads = deepSearchForLeads(parsedData, workflowId, workflowName);
            if (extractedLeads.length > 0) {
              console.log(`Encontrados ${extractedLeads.length} leads de string JSON`);
              return extractedLeads;
            }
          } catch (e) {
            // Não é JSON válido
            console.log(`Dados em '${path}' não são JSON válido`);
          }
        }
      } else {
        console.log(`❌ Nenhum dado encontrado em '${path}'`);
      }
    }
    
    // Busca desespero - procurar em qualquer propriedade da execução
    console.log('🔍 Realizando busca completa em todas as propriedades da execução');
    const extractedLeads = deepSearchForLeads(execution, workflowId, workflowName);
    if (extractedLeads.length > 0) {
      console.log(`Encontrados ${extractedLeads.length} leads por busca completa`);
      return extractedLeads;
    }
    
    console.log('❌ Falha na extração de leads: nenhum dado relevante encontrado');
    return leads;
  } catch (error) {
    console.error('❌ Erro ao extrair leads da execução:', error);
    return leads;
  }
}

// Função para processar estrutura padrão de nodes
function processNodeData(nodeData: any, workflowId: string, workflowName: string): ProcessedLead[] {
  const leads: ProcessedLead[] = [];
  
  try {
    // Iterar por todos os nodes
    for (const nodeId in nodeData) {
      console.log(`Processando node: ${nodeId}`);
      
      const nodeResults = nodeData[nodeId];
      if (!Array.isArray(nodeResults)) {
        console.log(`Dados do node ${nodeId} não são um array`);
        continue;
      }
      
      // Determinar automaticamente se o node está relacionado a qualificação/desqualificação
      let nodeType: 'captured' | 'qualified' | 'unqualified' = 'captured';
      const nodeName = nodeId.toLowerCase();
      
      if (nodeName.includes('qualifi') || 
          nodeName.includes('agen') || 
          nodeName.includes('marcar') || 
          nodeName.includes('sucesso') || 
          nodeName.includes('aprov')) {
        nodeType = 'qualified';
        console.log(`Node ${nodeId} identificado como de qualificação`);
      } else if (nodeName.includes('des') || 
                nodeName.includes('canc') || 
                nodeName.includes('falha') || 
                nodeName.includes('un') || 
                nodeName.includes('erro')) {
        nodeType = 'unqualified';
        console.log(`Node ${nodeId} identificado como de desqualificação`);
      } else {
        console.log(`Node ${nodeId} identificado como de captura genérica`);
      }
      
      // Processar cada resultado do node
      for (const result of nodeResults) {
        if (!result.data) {
          console.log(`Resultado do node ${nodeId} não tem dados`);
          continue;
        }
        
        // Processar os itens do result
        const items = Array.isArray(result.data) ? result.data : [result.data];
        console.log(`Processando ${items.length} itens do node ${nodeId}`);
        
        for (const item of items) {
          // Extrair remotejid
          const remotejid = extractRemotejid(item);
          if (!remotejid) {
            console.log(`Nenhum ID remoto encontrado no item do node ${nodeId}`);
            continue;
          }
          
          console.log(`📱 Lead encontrado com ID: ${remotejid}`);
          
          // Extrair metadados extras
          const source = extractSourceFromItem(item);
          const campaign = extractCampaignFromItem(item);
          const tags = extractTagsFromItem(item);
          
          // Extrair ou inferir o status do lead
          let status = nodeType;
          
          // Sobrescrever com status explícito no item se disponível
          if (item.status && typeof item.status === 'string') {
            const itemStatus = item.status.toLowerCase();
            if (itemStatus.includes('qual') || itemStatus.includes('aprov')) {
              status = 'qualified';
            } else if (itemStatus.includes('desqual') || itemStatus.includes('canc')) {
              status = 'unqualified';
            }
          }
          
          // Criar o lead processado
          const lead: ProcessedLead = {
            remotejid: normalizePhoneNumber(remotejid),
            status,
            timestamp: new Date().toISOString(),
            workflowId,
            workflowName,
            nodeId,
            executionId: item.executionId || 'unknown',
            source: source || undefined,
            campaign: campaign || undefined,
            tags,
            details: item
          };
          
          leads.push(lead);
          console.log(`✅ Lead processado com status: ${status}`);
        }
      }
    }
    
    console.log(`Total de ${leads.length} leads extraídos dos nodes`);
    return leads;
  } catch (error) {
    console.error('Erro ao processar dados dos nodes:', error);
    return leads;
  }
}

// Função para processar array de dados diretos
function processArrayData(dataArray: any[], workflowId: string, workflowName: string): ProcessedLead[] {
  const leads: ProcessedLead[] = [];
  
  try {
    console.log(`Processando array com ${dataArray.length} itens`);
    
    for (const item of dataArray) {
      // Extrair remotejid
      const remotejid = extractRemotejid(item);
      if (!remotejid) {
        console.log('Item sem ID remoto - ignorando');
        continue;
      }
      
      console.log(`📱 Lead encontrado com ID: ${remotejid}`);
      
      // Inferir status do lead a partir dos dados
      let status: 'captured' | 'qualified' | 'unqualified' = 'captured';
      
      // Tentar determinar o status por campos ou conteúdo
      const itemStr = JSON.stringify(item).toLowerCase();
      if (itemStr.includes('qualifi') || 
          itemStr.includes('agendad') || 
          itemStr.includes('marcad') || 
          itemStr.includes('aprovad')) {
        status = 'qualified';
      } else if (itemStr.includes('desqual') || 
                itemStr.includes('cancel') || 
                itemStr.includes('falha') || 
                itemStr.includes('rejeit')) {
        status = 'unqualified';
      }
      
      // Extrair metadados extras
      const source = extractSourceFromItem(item);
      const campaign = extractCampaignFromItem(item);
      const tags = extractTagsFromItem(item);
      
      // Criar o lead processado
      const lead: ProcessedLead = {
        remotejid: normalizePhoneNumber(remotejid),
        status,
        timestamp: new Date().toISOString(),
        workflowId,
        workflowName,
        nodeId: 'direct_data',
        executionId: 'unknown',
        source: source || undefined,
        campaign: campaign || undefined,
        tags,
        details: item
      };
      
      leads.push(lead);
      console.log(`✅ Lead processado com status: ${status}`);
    }
    
    console.log(`Total de ${leads.length} leads extraídos do array`);
    return leads;
  } catch (error) {
    console.error('Erro ao processar array de dados:', error);
    return leads;
  }
}

// Função para extrair source de um item
function extractSourceFromItem(item: any): string | undefined {
  if (!item) return undefined;
  
  // Campos diretos
  if (item.source) return item.source;
  if (item.origem) return item.origem;
  if (item.channel) return item.channel;
  if (item.canal) return item.canal;
  
  // Campos aninhados
  if (item.json?.source) return item.json.source;
  if (item.json?.origem) return item.json.origem;
  if (item.data?.source) return item.data.source;
  if (item.metadata?.source) return item.metadata.source;
  
  // Inferir de outros campos
  if (item.whatsapp) return 'whatsapp';
  if (item.messenger) return 'messenger';
  if (item.instagram) return 'instagram';
  if (item.facebook) return 'facebook';
  
  // Inferir do conteúdo
  const itemStr = JSON.stringify(item).toLowerCase();
  if (itemStr.includes('whatsapp')) return 'whatsapp';
  if (itemStr.includes('messenger')) return 'messenger';
  if (itemStr.includes('instagram')) return 'instagram';
  if (itemStr.includes('facebook')) return 'facebook';
  if (itemStr.includes('website')) return 'website';
  
  return undefined;
}

// Função para extrair campaign de um item
function extractCampaignFromItem(item: any): string | undefined {
  if (!item) return undefined;
  
  // Campos diretos
  if (item.campaign) return item.campaign;
  if (item.campanha) return item.campanha;
  if (item.campaign_name) return item.campaign_name;
  if (item.nome_campanha) return item.nome_campanha;
  
  // Campos aninhados
  if (item.json?.campaign) return item.json.campaign;
  if (item.json?.campanha) return item.json.campanha;
  if (item.data?.campaign) return item.data.campaign;
  if (item.metadata?.campaign) return item.metadata.campaign;
  
  return undefined;
}

// Função para extrair tags de um item
function extractTagsFromItem(item: any): string[] {
  if (!item) return [];
  
  // Campos diretos
  if (Array.isArray(item.tags)) return item.tags;
  
  // String de tags
  if (typeof item.tags === 'string') {
    return item.tags.split(',').map((tag: string) => tag.trim());
  }
  
  // Campos aninhados
  if (Array.isArray(item.json?.tags)) return item.json.tags;
  if (Array.isArray(item.data?.tags)) return item.data.tags;
  if (Array.isArray(item.metadata?.tags)) return item.metadata.tags;
  
  // Tags como string em campos aninhados
  if (typeof item.json?.tags === 'string') {
    return item.json.tags.split(',').map((tag: string) => tag.trim());
  }
  
  // Gerar tags com base em outros campos
  const tags: string[] = [];
  
  // Adicionar source como tag se existir
  const source = extractSourceFromItem(item);
  if (source) tags.push(source);
  
  return tags;
}

// Função para busca profunda por dados de leads
function deepSearchForLeads(data: any, workflowId: string, workflowName: string): ProcessedLead[] {
  const leads: ProcessedLead[] = [];
  const processedObjects = new WeakSet();
  
  // Função recursiva para buscar em todos os objetos
  function searchInObject(obj: any, path: string = '') {
    // Evitar loops infinitos e objetos já processados
    if (!obj || typeof obj !== 'object' || processedObjects.has(obj)) {
      return;
    }
    
    processedObjects.add(obj);
    
    // Verificar se o objeto atual pode ser um lead
    const remotejid = extractRemotejid(obj);
    if (remotejid) {
      console.log(`📱 Lead potencial encontrado em caminho: ${path}`);
      
      // Inferir o status do lead
      let status: 'captured' | 'qualified' | 'unqualified' = 'captured';
      
      // Criar o lead
      const lead: ProcessedLead = {
        remotejid: normalizePhoneNumber(remotejid),
        status,
        timestamp: new Date().toISOString(),
        workflowId,
        workflowName,
        nodeId: path || 'deep_search',
        executionId: 'unknown',
        source: extractSourceFromItem(obj),
        campaign: extractCampaignFromItem(obj),
        tags: extractTagsFromItem(obj),
        details: obj
      };
      
      leads.push(lead);
      console.log(`✅ Lead extraído por busca profunda: ${remotejid}`);
    }
    
    // Continuar a busca recursivamente
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        searchInObject(item, `${path}[${index}]`);
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        searchInObject(value, path ? `${path}.${key}` : key);
      });
    }
  }
  
  searchInObject(data);
  console.log(`Busca profunda encontrou ${leads.length} leads`);
  return leads;
}

// Enhanced metrics calculation with comprehensive data
async function calculateMetrics(leads: ProcessedLead[]): Promise<LeadMetrics[]> {
  console.log(`\n=== Calculando métricas para ${leads.length} leads processados ===`);
  
  // Agrupar leads por data, workflow e tags
  const groupedLeads = new Map<string, {
    date: string;
    workflowId: string;
    workflowName: string;
    total: number;
    qualified: number;
    unqualified: number;
    tags: Set<string>;
    sources: Set<string>;
    campaigns: Set<string>;
    details: any[];
  }>();
  
  // Processar cada lead
  for (const lead of leads) {
    // Extrair data (apenas a parte da data, sem hora)
    const date = lead.timestamp.split('T')[0];
    const key = `${date}:${lead.workflowId}`;
    
    // Inicializar grupo se não existir
    if (!groupedLeads.has(key)) {
      groupedLeads.set(key, {
        date,
        workflowId: lead.workflowId,
        workflowName: lead.workflowName,
        total: 0,
        qualified: 0,
        unqualified: 0,
        tags: new Set<string>(),
        sources: new Set<string>(),
        campaigns: new Set<string>(),
        details: []
      });
    }
    
    // Obter grupo atual
    const group = groupedLeads.get(key)!;
    
    // Incrementar contadores
    group.total++;
    
    if (lead.status === 'qualified') {
      group.qualified++;
    } else if (lead.status === 'unqualified') {
      group.unqualified++;
    }
    
    // Adicionar tags, source e campaign
    if (lead.tags && Array.isArray(lead.tags)) {
      lead.tags.forEach(tag => group.tags.add(tag));
    }
    
    if (lead.source) {
      group.sources.add(lead.source);
    }
    
    if (lead.campaign) {
      group.campaigns.add(lead.campaign);
    }
    
    // Adicionar detalhes do lead para análise posterior
    if (lead.details) {
      group.details.push({
      remotejid: lead.remotejid,
      status: lead.status,
      timestamp: lead.timestamp,
        nodeId: lead.nodeId,
        executionId: lead.executionId,
        ...lead.details
      });
    }
  }
  
  // Converter grupos em métricas
  const metrics: LeadMetrics[] = [];
  
  for (const [key, group] of groupedLeads.entries()) {
    // Calcular taxa de conversão
    const conversionRate = group.total > 0 
      ? parseFloat(((group.qualified / group.total) * 100).toFixed(2)) 
      : 0;
    
    // Extrair partes da data
    const dateParts = getDateParts(new Date(group.date));
    
    // Criar objeto de métricas
    const metric: LeadMetrics = {
      date: group.date,
      total_leads: group.total,
      qualified_leads: group.qualified,
      unqualified_leads: group.unqualified,
      conversion_rate: conversionRate,
      workflow_id: group.workflowId,
      workflow_name: group.workflowName,
      hour: dateParts.hour,
      weekday: dateParts.weekday,
      month: dateParts.month,
      year: dateParts.year,
      lead_details: group.details,
      tags: Array.from(group.tags),
      source: Array.from(group.sources).join(', '),
      campaign: Array.from(group.campaigns).join(', ')
    };
    
    metrics.push(metric);
  }
  
  console.log(`Geradas ${metrics.length} métricas agrupadas por data e workflow`);
  
  return metrics;
}

// Função aprimorada para salvar métricas no Supabase
async function saveMetricsToSupabase(metrics: LeadMetrics[]) {
  console.log(`\n=== Salvando ${metrics.length} métricas no Supabase ===`);
  
  if (metrics.length === 0) {
    console.log('Nenhuma métrica para salvar');
    return { success: true, saved: 0, errors: 0 };
  }
  
  let saved = 0;
  let errors = 0;
  
  // Processar em lotes para evitar sobrecarga
  const BATCH_SIZE = 10;
  const batches = [];
  
  for (let i = 0; i < metrics.length; i += BATCH_SIZE) {
    batches.push(metrics.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Processando ${batches.length} lotes de métricas`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processando lote ${i+1}/${batches.length} (${batch.length} métricas)`);
    
    try {
      // Preparar dados para upsert
      const upsertData = batch.map(metric => ({
        date: metric.date,
        workflow_id: metric.workflow_id,
        workflow_name: metric.workflow_name,
        total_leads: metric.total_leads,
        qualified_leads: metric.qualified_leads,
        unqualified_leads: metric.unqualified_leads,
        // conversion_rate é calculado automaticamente no banco de dados
        hour: metric.hour,
        weekday: metric.weekday,
        month: metric.month,
        year: metric.year,
        lead_details: metric.lead_details || [],
        tags: metric.tags || [],
        source: metric.source || null,
        campaign: metric.campaign || null,
        agent_name: metric.agent_name || null
      }));
      
      // Realizar upsert com tratamento de conflitos
      const { data, error } = await supabase
        .from('lead_metrics')
        .upsert(upsertData, {
          onConflict: 'date,workflow_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Erro ao salvar lote ${i+1}:`, error);
        errors += batch.length;
      } else {
        console.log(`Lote ${i+1} salvo com sucesso`);
        saved += batch.length;
        
        // Log detalhado para debugging
        batch.forEach((metric, idx) => {
          console.log(`  - Métrica ${idx+1}: Data=${metric.date}, Workflow=${metric.workflow_name}, Total=${metric.total_leads}, Qualificados=${metric.qualified_leads}`);
        });
      }
    } catch (err) {
      console.error(`Erro não tratado ao salvar lote ${i+1}:`, err);
      errors += batch.length;
    }
    
    // Pequena pausa entre lotes para não sobrecarregar o Supabase
    if (i < batches.length - 1) {
      await sleep(500);
    }
  }
  
  console.log(`\n=== Salvamento concluído: ${saved} métricas salvas, ${errors} erros ===`);
  
  return { success: true, saved, errors };
}

// Função para gerar dados de demonstração para fins de teste
function generateDemoMetrics(): LeadMetrics[] {
  console.log('\n=== Gerando métricas de demonstração ===');
  const now = new Date();
  const metrics: LeadMetrics[] = [];
  
  // Gerar dados para os últimos 30 dias
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Valores aleatórios mas realistas
    const total_leads = Math.floor(Math.random() * 50) + 10; // 10-60 leads
    const qualified_leads = Math.floor(Math.random() * (total_leads * 0.8)); // Até 80% qualificados
    const unqualified_leads = total_leads - qualified_leads;
    const conversion_rate = qualified_leads / total_leads;
    
    // Variação por dia da semana
    const weekday = date.getDay();
    let multiplier = 1.0;
    if (weekday === 0 || weekday === 6) { // Fim de semana
      multiplier = 0.6; // Menos leads no fim de semana
    } else if (weekday === 1 || weekday === 4) { // Segunda e quinta
      multiplier = 1.3; // Mais leads nesses dias
    }
    
    // Gerar exemplos de telefones para detalhes
    const lead_details = Array.from({ length: Math.min(5, total_leads) }, (_, idx) => ({
      phone: `5511${Math.floor(Math.random() * 100000000) + 900000000}`,
      status: idx < qualified_leads ? 'qualified' : 'unqualified',
      timestamp: date.toISOString()
    }));
    
    // Tags simuladas
    const possibleTags = ['whatsapp', 'website', 'facebook', 'instagram', 'google'];
    const numTags = Math.floor(Math.random() * 3) + 1;
    const tags = Array.from({ length: numTags }, () => 
      possibleTags[Math.floor(Math.random() * possibleTags.length)]
    );
    
    // Fonte simulada
    const sources = ['whatsapp', 'website', 'facebook', 'referral'];
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    // Adicionar métrica do dia
    metrics.push({
      date: dateStr,
      total_leads: Math.floor(total_leads * multiplier),
      qualified_leads: Math.floor(qualified_leads * multiplier),
      unqualified_leads: Math.floor(unqualified_leads * multiplier),
      conversion_rate,
      workflow_id: 'demo-workflow-1',
      workflow_name: 'WhatsApp Agent Demo',
      agent_name: 'Maria (Demo)',
      hour: date.getHours(),
      weekday,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      lead_details,
      tags,
      source,
      campaign: 'Demo Campaign'
    });
  }
  
  console.log(`Geradas ${metrics.length} métricas de demonstração`);
  return metrics;
}

// Função para buscar execuções de um workflow com repetição automática
async function fetchExecutionsWithRetry(workflowId: string, cursor?: string): Promise<{ items: any[], nextCursor?: string }> {
  const headers = {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  };
  
  // Construir URL para a API do N8N
  const url = new URL(`${N8N_API_URL}/workflows/${workflowId}/executions`);
  if (cursor) {
    url.searchParams.append('cursor', cursor);
  }
  
  try {
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar execuções: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      items: data.data || [],
      nextCursor: data.nextCursor
    };
  } catch (error: any) {
    console.error('Erro ao buscar execuções:', error.message);
    throw error;
  }
}

// Função principal para extrair as métricas com logging detalhado
async function fetchMetricsWithLogging() {
  try {
    console.log('\n=== Iniciando processamento de métricas de leads ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // Obter parâmetros da URL
    const days = 30; // Valor padrão
    const forceRefresh = false; // Valor padrão
    
    console.log(`Parâmetros: days=${days}, forceRefresh=${forceRefresh}`);
    
    // Verificar cache
    const cacheKey = `lead_metrics_${days}`;
    const now = Date.now();
    const cachedData = metricsCache.get(cacheKey);
    
    if (cachedData && now - cachedData.timestamp < CACHE_TTL && !forceRefresh) {
      console.log('Retornando dados em cache');
      return {
        success: true,
        message: 'Métricas de leads obtidas do cache',
        metrics: cachedData.data,
        cached: true,
        timestamp: new Date(cachedData.timestamp).toISOString()
      };
    }
    
    // Buscar workflows com tag "main agent"
    const workflows = await getMainAgentWorkflows();
    
    if (workflows.length === 0) {
      console.log('Nenhum workflow com tag "main agent" encontrado');
      return {
        success: false,
        message: 'Nenhum workflow com tag "main agent" encontrado',
        metrics: null
      };
    }
    
    console.log(`Processando ${workflows.length} workflows`);
    
    // Processar cada workflow
    let allLeads: ProcessedLead[] = [];
    
    for (const workflow of workflows) {
      console.log(`\nProcessando workflow: ${workflow.name} (${workflow.id})`);
      
      // Buscar execuções do workflow
      const executions = await getWorkflowExecutions(workflow.id, days);
      
      if (executions.length === 0) {
        console.log('Nenhuma execução encontrada para este workflow');
        continue;
      }
      
      console.log(`Encontradas ${executions.length} execuções`);
      
      // Extrair leads das execuções
      const workflowLeads = executions.flatMap(execution => 
        extractLeadsFromExecution(execution, workflow.id, workflow.name)
      );
      
      console.log(`Extraídos ${workflowLeads.length} leads deste workflow`);
      
      // Adicionar à lista geral
      allLeads = [...allLeads, ...workflowLeads];
    }
    
    console.log(`\nTotal de leads extraídos: ${allLeads.length}`);
    
    // Calcular métricas
    const metrics = await calculateMetrics(allLeads);
    
    // Salvar no Supabase
    const saveResult = await saveMetricsToSupabase(metrics);
    
    // Armazenar em cache
    const latestMetrics = await getLatestMetrics();
    metricsCache.set(cacheKey, { data: latestMetrics, timestamp: now });
    
    console.log('\n=== Processamento de métricas concluído ===');
      
      return {
        success: true,
      message: `Métricas de leads atualizadas com sucesso: ${saveResult.saved} salvas, ${saveResult.errors} erros`,
      metrics: latestMetrics,
      cached: false,
      timestamp: new Date().toISOString(),
      stats: {
        workflows_processed: workflows.length,
        leads_extracted: allLeads.length,
        metrics_calculated: metrics.length,
        metrics_saved: saveResult.saved,
        errors: saveResult.errors
      }
    };
  } catch (error) {
    console.error('Erro ao processar métricas de leads:', error);
    throw error;
  }
}

// Função auxiliar para obter as métricas mais recentes do Supabase
async function getLatestMetrics() {
  try {
    const { data, error } = await supabase
      .from('lead_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);
    
    if (error) {
      console.error('Erro ao buscar métricas recentes:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar métricas recentes:', error);
    return [];
  }
}

// API Routes
export async function GET(request: NextRequest) {
  try {
    console.log('\n=== Iniciando processamento de métricas de leads via GET ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // Obter parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const forceRefresh = searchParams.get('force') === 'true';
    
    console.log(`Parâmetros: days=${days}, forceRefresh=${forceRefresh}`);
    
    // Verificar cache
    const cacheKey = `lead_metrics_${days}`;
    const now = Date.now();
    const cachedData = metricsCache.get(cacheKey);
    
    if (cachedData && now - cachedData.timestamp < CACHE_TTL && !forceRefresh) {
      console.log('Retornando dados em cache');
      return NextResponse.json({
        success: true,
        message: 'Métricas de leads obtidas do cache',
        metrics: cachedData.data,
        cached: true,
        timestamp: new Date(cachedData.timestamp).toISOString()
      });
    }
    
    // Buscar workflows com tag "main agent"
    const workflows = await getMainAgentWorkflows();
    
    if (workflows.length === 0) {
      console.log('Nenhum workflow com tag "main agent" encontrado');
      return NextResponse.json({
        success: false,
        message: 'Nenhum workflow com tag "main agent" encontrado',
        metrics: null
      }, { status: 404 });
    }
    
    console.log(`Processando ${workflows.length} workflows`);
    
    // Processar cada workflow
    let allLeads: ProcessedLead[] = [];
    
    for (const workflow of workflows) {
      console.log(`\nProcessando workflow: ${workflow.name} (${workflow.id})`);
      
      // Buscar execuções do workflow
      const executions = await getWorkflowExecutions(workflow.id, days);
      
      if (executions.length === 0) {
        console.log('Nenhuma execução encontrada para este workflow');
        continue;
      }
      
      console.log(`Encontradas ${executions.length} execuções`);
      
      // Extrair leads das execuções
      const workflowLeads = executions.flatMap(execution => 
        extractLeadsFromExecution(execution, workflow.id, workflow.name)
      );
      
      console.log(`Extraídos ${workflowLeads.length} leads deste workflow`);
      
      // Adicionar à lista geral
      allLeads = [...allLeads, ...workflowLeads];
    }
    
    console.log(`\nTotal de leads extraídos: ${allLeads.length}`);
    
    // Calcular métricas
    const metrics = await calculateMetrics(allLeads);
    
    // Salvar no Supabase
    const saveResult = await saveMetricsToSupabase(metrics);
    
    // Armazenar em cache
    const latestMetrics = await getLatestMetrics();
    metricsCache.set(cacheKey, { data: latestMetrics, timestamp: now });
    
    console.log('\n=== Processamento de métricas concluído ===');
    
    return NextResponse.json({
      success: true,
      message: `Métricas de leads atualizadas com sucesso: ${saveResult.saved} salvas, ${saveResult.errors} erros`,
      metrics: latestMetrics,
      cached: false,
      timestamp: new Date().toISOString(),
      stats: {
        workflows_processed: workflows.length,
        leads_extracted: allLeads.length,
        metrics_calculated: metrics.length,
        metrics_saved: saveResult.saved,
        errors: saveResult.errors
      }
    });
  } catch (error) {
    console.error('Erro ao processar métricas de leads:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar métricas de leads',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se o corpo da requisição contém dados de métricas
    const body = await request.json();
    
    if (body.metrics && Array.isArray(body.metrics)) {
      console.log('\n=== Recebendo métricas via POST ===');
      console.log(`Recebidas ${body.metrics.length} métricas`);
      
      // Validar e processar métricas
      const validMetrics = body.metrics.filter((metric: any) => 
        metric.date && 
        typeof metric.total_leads === 'number' && 
        typeof metric.qualified_leads === 'number' && 
        typeof metric.unqualified_leads === 'number' &&
        metric.workflow_id
      );
      
      console.log(`${validMetrics.length} métricas válidas para processamento`);
      
      if (validMetrics.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Nenhuma métrica válida encontrada no corpo da requisição'
        }, { status: 400 });
      }
      
      // Salvar métricas no Supabase
      const saveResult = await saveMetricsToSupabase(validMetrics);
      
      // Limpar cache
      metricsCache.clear();
      
    return NextResponse.json({
      success: true,
        message: `Métricas de leads recebidas e salvas com sucesso: ${saveResult.saved} salvas, ${saveResult.errors} erros`,
        stats: {
          metrics_received: body.metrics.length,
          metrics_valid: validMetrics.length,
          metrics_saved: saveResult.saved,
          errors: saveResult.errors
        }
      });
    } else {
      // Executar o mesmo processo do GET
      return GET(request);
    }
  } catch (error) {
    console.error('Erro ao processar métricas de leads via POST:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar métricas de leads',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 