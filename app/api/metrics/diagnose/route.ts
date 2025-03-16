import { NextRequest, NextResponse } from 'next/server';

// Configurações da API do N8N
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || '';
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || '';

// Função para normalizar números de telefone
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Função para extrair IDs remotos com logging detalhado
function extractRemotejid(nodeData: any): string | null {
  if (!nodeData) return null;
  
  try {
    // Verificar campos diretos
    if (nodeData.remotejid) {
      return nodeData.remotejid;
    }
    
    if (nodeData.phone) {
      return nodeData.phone;
    }
    
    if (nodeData.telefone) {
      return nodeData.telefone;
    }
    
    if (nodeData.whatsapp) {
      return nodeData.whatsapp;
    }
    
    // Verificar campos aninhados
    if (nodeData.message?.key?.remoteJid) {
      return nodeData.message.key.remoteJid;
    }
    
    // Procurar em qualquer campo pelo formato WhatsApp (5511...)
    const jsonStr = JSON.stringify(nodeData);
    const brPhoneRegex = /(55\d{10,13})/;
    const phoneMatch = jsonStr.match(brPhoneRegex);
    
    if (phoneMatch && phoneMatch[1]) {
      return phoneMatch[1];
    }
    
    // Procurar formato de WhatsApp jid
    const jidRegex = /(\d+@s\.whatsapp\.net)/;
    const jidMatch = jsonStr.match(jidRegex);
    
    if (jidMatch && jidMatch[1]) {
      return jidMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao extrair remotejid:', error);
    return null;
  }
}

// Função para buscar workflows do N8N
async function getMainAgentWorkflows() {
  try {
    console.log('Buscando workflows com tag "agent"...');
    
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${N8N_API_URL}/workflows`, { headers });
    
    if (!response.ok) {
      console.error(`Erro ao buscar workflows: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const responseData = await response.json();
    
    // Extrair a array de workflows da estrutura { data: [...], nextCursor: ... }
    const data = responseData.data || [];
    
    if (!Array.isArray(data)) {
      console.error('Resposta inválida da API do N8N ao buscar workflows');
      return [];
    }
    
    // Lista de todos os workflows para diagnóstico
    console.log('Total de workflows encontrados:', data.length);
    
    // Mostrar detalhes de cada workflow para diagnóstico
    data.forEach((workflow: any) => {
      console.log(`- Workflow: ${workflow.name} (${workflow.id})`);
      console.log(`  Tags: ${JSON.stringify(workflow.tags || [])}`);
    });
    
    // Procurar workflows com tag "agent" (mais flexível)
    const agentWorkflows = data.filter((workflow: any) => {
      if (!workflow.tags) return false;
      
      const tags = Array.isArray(workflow.tags) 
        ? workflow.tags 
        : (typeof workflow.tags === 'string' ? [workflow.tags] : []);
      
      return tags.some((tag: string) => 
        typeof tag === 'string' && tag.toLowerCase().includes('agent'));
    });
    
    console.log(`Encontrados ${agentWorkflows.length} workflows com tag contendo "agent"`);
    
    // Se não encontrou nenhum workflow com tag "agent", usar todos os workflows
    if (agentWorkflows.length === 0) {
      console.log('Nenhum workflow com tag "agent" encontrado. Usando todos os workflows disponíveis.');
      return data.slice(0, 5).map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        tags: workflow.tags
      }));
    }
    
    return agentWorkflows.map((workflow: any) => ({
      id: workflow.id,
      name: workflow.name,
      tags: workflow.tags
    }));
  } catch (error) {
    console.error('Erro ao buscar workflows:', error);
    return [];
  }
}

// Função para buscar execuções de um workflow
async function getWorkflowExecutions(workflowId: string) {
  try {
    console.log(`Buscando execuções para o workflow ${workflowId}...`);
    
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    };
    
    // Tentar vários formatos de URL para obter execuções
    const urls = [
      `${N8N_API_URL}/workflows/${workflowId}/executions`,
      `${N8N_API_URL}/executions?filters=${encodeURIComponent(JSON.stringify({ workflowId }))}`,
      `${N8N_API_URL}/executions?workflowId=${workflowId}`,
    ];
    
    let executions = [];
    let successUrl = '';
    
    for (const url of urls) {
      try {
        console.log(`Tentando URL: ${url}`);
        const response = await fetch(url, { headers });
        
        if (response.ok) {
          const responseData = await response.json();
          
          // Lidar com diferentes estruturas de resposta
          const data = responseData.data || responseData.executions || responseData;
          
          if (Array.isArray(data) && data.length > 0) {
            executions = data;
            successUrl = url;
            console.log(`Sucesso com URL: ${url}`);
            break;
          }
        } else {
          console.log(`Falha com URL: ${url} - Status: ${response.status}`);
        }
      } catch (error) {
        console.log(`Erro com URL: ${url}`, error);
      }
    }
    
    console.log(`Encontradas ${executions.length} execuções para workflow ${workflowId} usando ${successUrl}`);
    
    // Retornar um amostra das execuções para diagnóstico
    return executions.slice(0, 5);
  } catch (error) {
    console.error('Erro ao buscar execuções:', error);
    return [];
  }
}

// Função para analisar uma execução e tentar encontrar leads
function analyzeExecution(execution: any) {
  try {
    console.log(`Analisando execução ${execution.id || 'sem ID'}...`);
    
    const results = {
      executionId: execution.id,
      startedAt: execution.startedAt,
      status: execution.status,
      highLevelKeys: Object.keys(execution),
      hasData: Boolean(execution.data),
      hasResultData: Boolean(execution.data?.resultData),
      hasRunData: Boolean(execution.data?.resultData?.runData),
      nodes: execution.data?.resultData?.runData ? Object.keys(execution.data.resultData.runData) : [],
      potentialLeads: [] as Array<{node: string, remotejid: string}>
    };
    
    // Se tiver runData, analisar cada nó
    if (execution.data?.resultData?.runData) {
      for (const nodeId in execution.data.resultData.runData) {
        const nodeResults = execution.data.resultData.runData[nodeId];
        
        if (Array.isArray(nodeResults)) {
          for (const result of nodeResults) {
            if (result.data) {
              const items = Array.isArray(result.data) ? result.data : [result.data];
              
              for (const item of items) {
                const remotejid = extractRemotejid(item);
                if (remotejid) {
                  results.potentialLeads.push({
                    node: nodeId,
                    remotejid: normalizePhoneNumber(remotejid)
                  });
                }
              }
            }
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erro ao analisar execução:', error);
    return { error: 'Erro ao analisar execução', message: error.message };
  }
}

// Função para testar diferentes endpoints da API N8N
async function checkN8NEndpoints() {
  const endpoints = [
    { url: '/workflows', name: 'Workflows' },
    { url: '/executions', name: 'Execuções' },
    { url: '/users', name: 'Usuários' },
    { url: '/me', name: 'Meu Usuário' },
    { url: '/', name: 'API Root' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testando endpoint ${endpoint.name}: ${N8N_API_URL}${endpoint.url}`);
      
      const headers = {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(`${N8N_API_URL}${endpoint.url}`, { 
        headers,
        method: 'GET'
      });
      
      const result = {
        endpoint: endpoint.name,
        url: `${N8N_API_URL}${endpoint.url}`,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      // Tentar obter corpo da resposta se possível
      try {
        if (response.ok) {
          const data = await response.json();
          
          if (Array.isArray(data)) {
            result.isArray = true;
            result.count = data.length;
            result.sample = data.slice(0, 2);
          } else if (typeof data === 'object') {
            result.isObject = true;
            result.keys = Object.keys(data);
          }
        }
      } catch (e) {
        result.parseError = e.message;
      }
      
      results.push(result);
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        url: `${N8N_API_URL}${endpoint.url}`,
        error: error.message
      });
    }
  }
  
  return results;
}

// Função para buscar informações sobre a API N8N
async function getN8NInfo() {
  try {
    console.log('Buscando informações da API N8N...');
    
    const apiInfo = {
      url: N8N_API_URL,
      hasApiKey: !!N8N_API_KEY,
      apiKeyLength: N8N_API_KEY ? N8N_API_KEY.length : 0,
      endpointsCheck: await checkN8NEndpoints()
    };
    
    return apiInfo;
  } catch (error) {
    console.error('Erro ao buscar informações da API N8N:', error);
    return {
      error: 'Erro ao buscar informações da API N8N',
      message: error.message
    };
  }
}

// Função para obter informações completas sobre workflows, execuções e potenciais leads
async function diagnoseN8N() {
  try {
    // 0. Verificar a API do N8N
    const apiInfo = await getN8NInfo();
    
    // 1. Buscar workflows relevantes
    const workflows = await getMainAgentWorkflows();
    console.log('Workflows encontrados:', workflows);
    
    // 2. Para cada workflow, buscar algumas execuções e analisá-las
    const workflowResults = [];
    
    for (const workflow of workflows) {
      const executions = await getWorkflowExecutions(workflow.id);
      const analyzedExecutions = executions.map(analyzeExecution);
      
      workflowResults.push({
        ...workflow,
        executionsFound: executions.length,
        executionsAnalyzed: analyzedExecutions.length,
        executions: analyzedExecutions,
      });
    }
    
    return {
      success: true,
      apiInfo,
      workflowsFound: workflows.length,
      workflows: workflowResults
    };
  } catch (error) {
    console.error('Erro ao analisar N8N:', error);
    return {
      success: false,
      error: 'Erro ao analisar N8N',
      message: error.message
    };
  }
}

// Endpoint principal
export async function GET(request: NextRequest) {
  try {
    console.log('Iniciando diagnóstico do N8N...');
    const results = await diagnoseN8N();
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Erro no endpoint de diagnóstico:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao executar diagnóstico', message: error.message },
      { status: 500 }
    );
  }
} 