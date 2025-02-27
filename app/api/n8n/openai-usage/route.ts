import { NextResponse } from "next/server";
import { OpenAIUsageSummary } from "@/lib/openai-tracker";
import { n8nService } from "@/lib/n8n-service";
import { createClient } from '@supabase/supabase-js';

// URL base da API do N8N
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
// Token de API do N8N
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";

// Url e chave do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  // Outros campos do workflow
}

interface N8NExecution {
  id: string;
  finished: boolean;
  data: {
    resultData: {
      runData: Record<string, any[]>;
    };
  };
  startedAt: string;
}

// Variável global para cache
let cachedData: OpenAIUsageSummary | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos

// Cria um objeto vazio no formato esperado pela interface
function createEmptyUsageSummary(errorMessage?: string): any {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  
  return {
    error: errorMessage || null,
    totalCost: 0,
    totalTokens: 0,
    currentMonthTotal: 0,
    previousMonthTotal: 0,
    subscription: {
      usageLimit: 120,
      remainingCredits: 120
    },
    currentMonth: {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      percentChange: 0
    },
    dailyAverage: {
      amount: 0,
      percentOfLimit: 0
    },
    dailyUsage: [
      { date: yesterday, amount: 0 },
      { date: today, amount: 0 }
    ],
    modelUsage: [],
    usageByModel: {},
    costByAgent: {},
    usageByDay: {
      [yesterday]: { cost: 0, tokens: 0 },
      [today]: { cost: 0, tokens: 0 }
    }
  };
}

// Obtém os dados de uso da OpenAI
export async function GET() {
  console.log("🔍 Iniciando busca de dados de uso da OpenAI");
  console.log("N8N API URL:", N8N_API_URL || "NÃO CONFIGURADO");
  console.log("N8N API KEY definida:", !!N8N_API_KEY);
  
  try {
    // Verifica se o N8N API URL está configurado
    if (!N8N_API_URL) {
      console.log("❌ N8N_API_URL não está configurado");
      return NextResponse.json(
        createEmptyUsageSummary("URL da API N8N não configurada")
      );
    }
    
    // Criar client para Supabase se configurado
    let supabase = null;
    if (SUPABASE_URL && SUPABASE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log("Cliente Supabase inicializado");
    } else {
      console.log("Supabase não configurado, dados de uso por agente não estarão disponíveis");
    }
    
    // Buscar todos os workflows diretamente do N8N
    console.log("📋 Buscando lista de workflows diretamente do N8N...");
    const workflowsUrl = `${N8N_API_URL}/workflows`;
    
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    try {
      const workflowsResponse = await fetch(workflowsUrl, { headers });
      
      if (!workflowsResponse.ok) {
        const errorText = await workflowsResponse.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${workflowsResponse.status}, body: ${errorText}`);
      }
      
      const workflowsData = await workflowsResponse.json();
      
      if (!workflowsData || !workflowsData.data) {
        console.error("Formato de dados inválido:", workflowsData);
        throw new Error("Formato de dados inválido recebido da API do N8N");
      }
      
      const workflows = workflowsData.data;
      console.log(`✅ Encontrados ${workflows.length} workflows`);
    
      // Filtrar workflows com as tags necessárias
      const filteredWorkflows = workflows.filter(workflow => {
        const hasAgentTag = workflow.tags?.some((tag: any) => {
          // Verificar se a tag é uma string ou um objeto
          if (typeof tag === 'string') {
            return tag.toLowerCase() === 'agent' || tag.toLowerCase() === 'openai';
          } else if (tag && typeof tag === 'object' && tag.name) {
            // Se for um objeto, usar a propriedade name
            return tag.name.toLowerCase() === 'agent' || tag.name.toLowerCase() === 'openai';
          }
          return false; // Se não for string nem objeto com name, ignorar
        });
        
        return hasAgentTag;
      });
      
      console.log(`📑 Filtrados ${filteredWorkflows.length} workflows com tags 'agent' ou 'openai'`);
      
      if (filteredWorkflows.length === 0) {
        console.log("⚠️ Nenhum workflow com as tags necessárias foi encontrado");
        return NextResponse.json(
          createEmptyUsageSummary("Nenhum workflow com as tags 'agent' ou 'openai' encontrado")
        );
      }
      
      // Função para obter execuções de workflow
      async function getWorkflowExecutions(workflowId: string) {
        const executionsUrl = `${N8N_API_URL}/executions?workflowId=${workflowId}&limit=20&includeData=true`;
        const response = await fetch(executionsUrl, { headers });
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar execuções: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data || [];
      }
      
      // Função para obter workflow por ID
      async function getWorkflow(workflowId: string) {
        const workflowUrl = `${N8N_API_URL}/workflows/${workflowId}`;
        const response = await fetch(workflowUrl, { headers });
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar workflow: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          id: data.id,
          name: data.name,
          active: data.active,
          tags: Array.isArray(data.tags) 
            ? data.tags.map((tag: any) => {
                if (typeof tag === 'string') return tag;
                if (tag && typeof tag === 'object' && tag.name) return tag.name;
                return '';
              }).filter(Boolean)
            : []
        };
      }
      
      // Obter dados de uso para cada workflow
      console.log("🔄 Processando dados de uso para cada workflow...");
      const workflowDataPromises = filteredWorkflows.map(async (workflow: any) => {
        console.log(`📊 Obtendo uso para workflow: ${workflow.name} (${workflow.id})`);
        
        try {
          // Obter execuções
          const executions = await getWorkflowExecutions(workflow.id);
          console.log(`Encontradas ${executions.length} execuções para workflow ${workflow.id}`);
          
          // Extrair custos da OpenAI
          const openAICosts = await n8nService.extractOpenAICosts(executions);
          
          // Procura por uma tag que começa com "type:"
          const workflowInfo = await getWorkflow(workflow.id);
          const typeTag = workflowInfo.tags?.find((tag: any) => {
            if (typeof tag === 'string') {
              return tag.toLowerCase().startsWith('type:');
            } else if (tag && typeof tag === 'object' && tag.name) {
              return tag.name.toLowerCase().startsWith('type:');
            }
            return false;
          });
          
          // Extrair o valor do tipo da tag
          let type = 'unknown';
          if (typeTag) {
            if (typeof typeTag === 'string') {
              type = typeTag.split(':')[1]?.trim() || 'unknown';
            } else if (typeTag && typeof typeTag === 'object' && typeTag.name) {
              type = typeTag.name.split(':')[1]?.trim() || 'unknown';
            }
          }
          
          // Processa os dados de custo para agrupar por modelo
          const modelUsage: Record<string, { cost: number; tokens: number; calls: number }> = {};
          
          // Agrupa os custos por modelo
          openAICosts.forEach(cost => {
            if (!modelUsage[cost.model]) {
              modelUsage[cost.model] = {
                cost: 0,
                tokens: 0,
                calls: 0
              };
            }
            
            modelUsage[cost.model].cost += cost.cost;
            modelUsage[cost.model].tokens += cost.tokens;
            modelUsage[cost.model].calls += 1;
          });
          
          // Calcula totais
          const totalCost = openAICosts.reduce((acc, cost) => acc + cost.cost, 0);
          const totalTokens = openAICosts.reduce((acc, cost) => acc + cost.tokens, 0);
          
          // Formata os custos para exibição
          Object.keys(modelUsage).forEach(model => {
            modelUsage[model].cost = parseFloat(modelUsage[model].cost.toFixed(6));
          });
    
          return {
            workflowId: workflow.id,
            name: workflow.name,
            type,
            executionCount: executions.length,
            // Adiciona informações de custo da OpenAI
            openAI: {
              totalCost: parseFloat(totalCost.toFixed(6)),
              totalTokens,
              modelUsage,
              // Retorna os dados detalhados de custo para análise temporal
              details: openAICosts.map(cost => ({
                ...cost,
                cost: parseFloat(cost.cost.toFixed(6))
              }))
            }
          };
        } catch (error) {
          console.error(`Erro ao processar workflow ${workflow.id}:`, error);
          return {
            workflowId: workflow.id,
            name: workflow.name,
            type: 'unknown',
            executionCount: 0,
            openAI: {
              totalCost: 0,
              totalTokens: 0,
              modelUsage: {},
              details: []
            }
          };
        }
      });
      
      const workflowData = await Promise.all(workflowDataPromises);
      console.log(`✅ Dados obtidos para ${workflowData.length} workflows`);
      
      // Calcular totais
      let totalCost = 0;
      let totalTokens = 0;
      
      // Preparar o resumo no formato esperado pelo frontend
      const usageSummary = createEmptyUsageSummary();
      
      // Organizar uso por dia para o gráfico (simulando distribuição pelos últimos 30 dias)
      const dailyData = createDailyDistribution(30);
      
      workflowData.forEach(workflow => {
        if (workflow.openAI) {
          const workflowCost = workflow.openAI.totalCost || 0;
          const workflowTokens = workflow.openAI.totalTokens || 0;
          
          totalCost += workflowCost;
          totalTokens += workflowTokens;
          
          // Adicionar aos custos por agente
          usageSummary.costByAgent[workflow.name] = {
            cost: workflowCost,
            tokens: workflowTokens
          };
          
          // Processar uso por modelo
          if (workflow.openAI.modelUsage) {
            Object.entries(workflow.openAI.modelUsage).forEach(([model, usage]: [string, any]) => {
              // Adicionar ao uso por modelo
              if (!usageSummary.usageByModel[model]) {
                usageSummary.usageByModel[model] = {
                  cost: 0,
                  tokens: 0,
                  calls: 0
                };
              }
              
              usageSummary.usageByModel[model].cost += usage.cost;
              usageSummary.usageByModel[model].tokens += usage.tokens;
              usageSummary.usageByModel[model].calls += usage.calls;
              
              // Adicionar à lista de uso por modelo para a interface
              const existingModelIndex = usageSummary.modelUsage.findIndex(m => m.model === model);
              if (existingModelIndex >= 0) {
                usageSummary.modelUsage[existingModelIndex].cost += usage.cost;
                usageSummary.modelUsage[existingModelIndex].tokens += usage.tokens;
                usageSummary.modelUsage[existingModelIndex].requests += usage.calls;
              } else {
                usageSummary.modelUsage.push({
                  model,
                  cost: usage.cost,
                  tokens: usage.tokens,
                  requests: usage.calls
                });
              }
            });
          }
          
          // Distribuir custos ao longo dos dias (para dados de exemplo realistas)
          if (workflow.openAI.details && workflow.openAI.details.length > 0) {
            // Se temos dados detalhados com timestamps, usamos para distribuição real
            workflow.openAI.details.forEach((detail: any) => {
              const date = detail.timestamp.split('T')[0];
              if (dailyData[date]) {
                dailyData[date] += detail.cost;
              }
            });
          } else {
            // Distribuição simulada se não temos dados temporais detalhados
            distributeAmountAcrossDays(dailyData, workflowCost);
          }
        }
      });
      
      // Atualizar os totais no resumo
      usageSummary.totalCost = parseFloat(totalCost.toFixed(6));
      usageSummary.totalTokens = totalTokens;
      usageSummary.currentMonthTotal = parseFloat(totalCost.toFixed(6));
      
      // Calcular a média diária
      const daysInMonth = 30;
      usageSummary.dailyAverage.amount = parseFloat((totalCost / daysInMonth).toFixed(6));
      usageSummary.dailyAverage.percentOfLimit = parseFloat(((usageSummary.dailyAverage.amount * daysInMonth / usageSummary.subscription.usageLimit) * 100).toFixed(2));
      
      // Calcular créditos restantes
      usageSummary.subscription.remainingCredits = Math.max(0, usageSummary.subscription.usageLimit - usageSummary.currentMonthTotal);
      
      // Converter o mapa de dias para o formato esperado pela interface
      usageSummary.dailyUsage = Object.entries(dailyData)
        .map(([date, amount]) => ({
          date,
          amount: parseFloat(amount.toFixed(6))
        }))
    .sort((a, b) => a.date.localeCompare(b.date));
      
      // Arredondar valores para exibição
      Object.keys(usageSummary.usageByModel).forEach(model => {
        usageSummary.usageByModel[model].cost = parseFloat(usageSummary.usageByModel[model].cost.toFixed(6));
      });
      
      Object.keys(usageSummary.costByAgent).forEach(agent => {
        usageSummary.costByAgent[agent].cost = parseFloat(usageSummary.costByAgent[agent].cost.toFixed(6));
      });
      
      console.log(`💰 Total: $${totalCost.toFixed(6)}, ${totalTokens} tokens em ${workflowData.length} workflows`);
      
      // Após processar todos os dados, buscar dados adicionais do Supabase se disponível
      if (supabase) {
        try {
          console.log("Buscando dados adicionais do Supabase...");
          
          // Buscar dados de uso por agente no último mês
          const { data: agentUsageData, error: agentError } = await supabase
            .from('openai_usage')
            .select('workflow_id, workflow_name, model, total_tokens, estimated_cost')
            .gte('timestamp', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());
            
          if (!agentError && agentUsageData && agentUsageData.length > 0) {
            // Processar dados por agente
            const costByAgent: Record<string, { cost: number, tokens: number }> = {};
            const usageByModel: Record<string, { cost: number, tokens: number, calls: number }> = {};
            
            agentUsageData.forEach((record: any) => {
              const agentName = record.workflow_name || record.workflow_id;
              const model = record.model || "desconhecido";
              const tokens = Number(record.total_tokens) || 0;
              const cost = Number(record.estimated_cost) || 0;
              
              // Agregar por agente
              if (!costByAgent[agentName]) {
                costByAgent[agentName] = {
                  cost: 0,
                  tokens: 0
                };
              }
              
              costByAgent[agentName].cost += cost;
              costByAgent[agentName].tokens += tokens;
              
              // Agregar por modelo
              if (!usageByModel[model]) {
                usageByModel[model] = {
                  cost: 0,
                  tokens: 0,
                  calls: 0
                };
              }
              
              usageByModel[model].cost += cost;
              usageByModel[model].tokens += tokens;
              usageByModel[model].calls += 1;
            });
            
            // Adicionar dados ao summary
            usageSummary.costByAgent = costByAgent;
            
            // Atualizar dados por modelo se estiverem vazios
            if (!usageSummary.usageByModel || Object.keys(usageSummary.usageByModel).length === 0) {
              usageSummary.usageByModel = usageByModel;
            }
            
            console.log(`Dados de uso por agente carregados: ${Object.keys(costByAgent).length} agentes`);
          } else {
            console.log("Nenhum dado de uso encontrado no Supabase ou erro:", agentError);
          }
        } catch (supabaseError) {
          console.error("Erro ao buscar dados do Supabase:", supabaseError);
        }
      }
      
      return NextResponse.json(usageSummary);
    } catch (error) {
      console.error("❌ Erro ao buscar dados de uso da OpenAI:", error);
      
      // Retorna um erro, mas mantém a estrutura de dados para evitar quebrar o frontend
      return NextResponse.json(
        createEmptyUsageSummary(error instanceof Error ? error.message : "Erro desconhecido")
      );
    }
  } catch (error) {
    console.error("❌ Erro ao buscar dados de uso da OpenAI:", error);
    
    // Retorna um erro, mas mantém a estrutura de dados para evitar quebrar o frontend
    return NextResponse.json(
      createEmptyUsageSummary(error instanceof Error ? error.message : "Erro desconhecido")
    );
  }
}

// Cria um objeto para distribuição diária nos últimos N dias
function createDailyDistribution(days: number = 30): Record<string, number> {
  const distribution: Record<string, number> = {};
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    distribution[date.toISOString().slice(0, 10)] = 0;
  }
  
  return distribution;
}

// Distribui um valor entre os dias disponíveis (simulação de dados)
function distributeAmountAcrossDays(dailyData: Record<string, number>, amount: number): void {
  const days = Object.keys(dailyData);
  if (days.length === 0) return;
  
  // Distribuição com maior peso para dias mais recentes
  let totalWeight = 0;
  const weights: Record<string, number> = {};
  
  days.sort().forEach((day, index) => {
    // Peso crescente para dias mais recentes
    const weight = Math.pow(1.2, index);
    weights[day] = weight;
    totalWeight += weight;
  });
  
  // Distribuir valor com base nos pesos
  days.forEach(day => {
    const dayAmount = (weights[day] / totalWeight) * amount;
    dailyData[day] += dayAmount;
  });
} 