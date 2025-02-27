import { NextResponse } from "next/server";

// URL para a Edge Function no Supabase
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";

export async function GET(request: Request) {
  try {
    // Verificamos se as credenciais da API estão configuradas
    if (!N8N_API_URL || !N8N_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "Configurações da API do N8N não encontradas",
        message: "Verifique as variáveis de ambiente NEXT_PUBLIC_N8N_API_URL e NEXT_PUBLIC_N8N_API_KEY"
      }, { status: 500 });
    }

    console.log("Iniciando teste de extração de dados do N8N...");
    
    // Buscar todos os workflows
    const workflowsResponse = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!workflowsResponse.ok) {
      return NextResponse.json({
        success: false, 
        error: `Erro ao buscar workflows: ${workflowsResponse.status}`,
        message: "Verifique a URL e a chave da API do N8N"
      }, { status: 500 });
    }
    
    const workflowsData = await workflowsResponse.json();
    const allWorkflows = workflowsData.data || [];
    
    // Filtrar workflows com tag 'agent'
    const agentWorkflows = allWorkflows.filter((wf: any) => {
      // Verificar diferentes formatos de tags
      if (!wf.tags || !Array.isArray(wf.tags) || wf.tags.length === 0) {
        return false;
      }
      
      return wf.tags.some((tag: any) => {
        if (typeof tag === 'string') {
          return tag.toLowerCase() === 'agent';
        } else if (tag && typeof tag === 'object' && tag.name) {
          return tag.name.toLowerCase() === 'agent';
        } else if (tag && typeof tag === 'object' && tag.id && tag.text) {
          return tag.text.toLowerCase() === 'agent';
        }
        return false;
      });
    });
    
    // Extrair informações básicas dos workflows
    const workflowInfo = agentWorkflows.map((wf: any) => ({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      tags: wf.tags
    }));
    
    // Buscar execuções recentes apenas para o primeiro workflow (para teste)
    let executionSample = null;
    let openAIUsageSample = null;
    
    if (agentWorkflows.length > 0) {
      const testWorkflow = agentWorkflows[0];
      
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      // Buscar uma execução recente
      const executionsUrl = new URL(`${N8N_API_URL}/executions`);
      executionsUrl.searchParams.append('workflowId', testWorkflow.id);
      executionsUrl.searchParams.append('limit', '1');
      
      const executionsResponse = await fetch(executionsUrl.toString(), {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (executionsResponse.ok) {
        const executionsData = await executionsResponse.json();
        const executions = executionsData.data || [];
        
        if (executions.length > 0) {
          // Simplificar a execução para a resposta
          const execution = executions[0];
          executionSample = {
            id: execution.id,
            finished: execution.finished,
            startedAt: execution.startedAt,
            stoppedAt: execution.stoppedAt,
            mode: execution.mode,
            status: execution.status
          };
          
          // Tentar extrair dados de uso da OpenAI
          try {
            openAIUsageSample = extractOpenAIInfoFromExecution(execution);
          } catch (error) {
            console.error("Erro ao extrair dados de OpenAI:", error);
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Teste de extração concluído com sucesso",
      n8nApiUrl: N8N_API_URL.replace(/([^:]\/)\/+/g, "$1"), // Normaliza URL para exibição
      totalWorkflows: allWorkflows.length,
      agentWorkflows: workflowInfo,
      testSample: {
        executionSample,
        openAIUsageSample
      },
      nextSteps: [
        "Verifique se os workflows com tag 'agent' foram detectados corretamente",
        "Confirme se há dados de execução disponíveis",
        "Verifique se os dados de uso da OpenAI foram extraídos corretamente",
        "Acesse /api/cron/sync-n8n?token=sync-n8n-cron-secret para realizar uma sincronização completa"
      ]
    });
  } catch (error: any) {
    console.error("Erro no teste de sincronização:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Função para extrair informações de uso da OpenAI de uma execução
function extractOpenAIInfoFromExecution(execution: any): any[] {
  const results: any[] = [];
  
  // Verificar se temos dados de resultado
  if (!execution.data?.resultData?.runData) {
    return results;
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
      
      // Verificar campos conhecidos da OpenAI
      const fields = ['model', 'usage', 'object', 'id', 'completion_tokens', 'prompt_tokens'];
      const isOpenAI = fields.some(field => json[field] !== undefined);
      
      if (isOpenAI || json.object === 'chat.completion') {
        results.push({
          nodeName,
          nodeId: nodeName,
          model: json.model,
          usage: json.usage,
          timestamp: execution.startedAt || execution.stoppedAt || execution.createdAt,
          id: json.id
        });
      }
      
      // Verificar em campos aninhados (request, response, data)
      ['request', 'response', 'data'].forEach(field => {
        if (json[field] && typeof json[field] === 'object') {
          const nestedObject = json[field];
          
          // Verificar se o objeto aninhado parece ser uma resposta da OpenAI
          const isNestedOpenAI = fields.some(f => nestedObject[f] !== undefined);
          
          if (isNestedOpenAI || nestedObject.object === 'chat.completion') {
            results.push({
              nodeName,
              nodeId: nodeName,
              model: nestedObject.model,
              usage: nestedObject.usage,
              timestamp: execution.startedAt || execution.stoppedAt || execution.createdAt,
              id: nestedObject.id,
              source: field // Indicar em qual campo aninhado foi encontrado
            });
          }
        }
      });
    }
  }
  
  return results;
} 