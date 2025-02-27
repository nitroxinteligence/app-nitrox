import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { OpenAIUsageSummary } from '@/lib/openai-tracker'

export interface OpenAIUsageHookResult {
  usageData: OpenAIUsageSummary | null
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  syncWithSupabase: () => Promise<void>
  exportData: () => Promise<void>
}

interface OpenAITokenUsage {
  workflowId: string
  workflowName: string
  model: string
  totalTokens: number
  totalCost: number
  totalCalls: number
  date: string
}

// Interfaces adicionais para tipar os dados do Supabase
interface OpenAIUsageDailyItem {
  date: string
  model: string
  total_tokens: number
  estimated_cost: string | number
  request_count: number
}

interface OpenAIUsageSummaryItem {
  model: string
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  estimated_cost: string | number
  request_count: number
}

interface OpenAIWorkflowUsageItem {
  workflow_id: string
  workflow_name: string
  Model: string
  total_tokens: number
  estimated_cost: string | number
}

interface DailyUsageItem {
  date: string
  amount: number
  totalTokens: number
}

interface ModelUsageItem {
  model: string
  cost: number
  tokens: number
  requests: number
}

// Interface para estatísticas por workflow
interface WorkflowStat {
  name: string;
  executions: number;
  tokens: number;
  cost: number;
  calls: number;
  lastExecuted?: string;
  model: string;
  costPer1K: number;
}

interface OpenAIUsageSummary {
  currentMonthCost: number;
  previousMonthCost: number;
  percentChange: number;
  modelUsage: ModelUsageItem[];
  dailyUsage: DailyUsageItem[];
  costByAgent: Record<string, { cost: number, tokens: number }>;
  subscription: {
    usageLimit: number;
    remainingCredits: number;
  };
  dailyAverage: {
    amount: number;
    percentOfLimit: number;
  };
  workflowStats: Record<string, WorkflowStat>;
  dailySummary: {
    total_calls: number;
    total_requests: number;
    total_cost: number;
    total_tokens: number;
    update_date: Date | string;
  };
}

// Dados padrão para quando não há informações do Supabase
const DEFAULT_USAGE_DATA: OpenAIUsageSummary = {
  currentMonthCost: 0,
  previousMonthCost: 0,
  percentChange: 0,
  modelUsage: [],
  dailyUsage: [],
  costByAgent: {},
  subscription: {
    usageLimit: 100,
    remainingCredits: 100
  },
  dailyAverage: {
    amount: 0,
    percentOfLimit: 0
  },
  workflowStats: {},
  dailySummary: {
    total_calls: 0,
    total_requests: 0,
    total_cost: 0,
    total_tokens: 0,
    update_date: new Date()
  }
};

/**
 * Hook para buscar dados de uso da OpenAI diretamente das tabelas Supabase
 */
export default function useOpenAIUsage(): OpenAIUsageHookResult {
  const [usageData, setUsageData] = useState<OpenAIUsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null)
  const requestInProgress = useRef(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Inicializar o cliente Supabase
  useEffect(() => {
    try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Configuração do Supabase não encontrada nas variáveis de ambiente');
        setError('Configuração do Supabase não encontrada');
        return;
      }
      
      const client = createClient(supabaseUrl, supabaseKey)
      setSupabaseClient(client)
      console.log('Cliente Supabase inicializado com sucesso');
    } catch (err) {
      console.error('Erro ao inicializar cliente Supabase:', err);
      setError('Falha ao inicializar conexão com Supabase');
    }
  }, [])

  /**
   * Função especializada para buscar dados detalhados de workflows
   */
  const fetchWorkflowData = useCallback(async (thirtyDaysAgo: Date) => {
    if (!supabaseClient) {
      console.warn('fetchWorkflowData: Cliente Supabase não disponível');
      return { workflowStats: {}, costByAgent: {} };
    }
    
    console.log('Buscando dados detalhados de workflows do Supabase');
    
    try {
      // Primeiro, tentar buscar da nova tabela workflow_daily_summary
      let workflowStats: Record<string, WorkflowStat> = {};
      let costByAgent: Record<string, { cost: number, tokens: number }> = {};
      
      try {
        const { data: summaryData, error: summaryError } = await supabaseClient
          .from('workflow_daily_summary')
          .select('*')
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false });
        
        if (!summaryError && summaryData && summaryData.length > 0) {
          console.log(`Encontrados ${summaryData.length} registros na tabela workflow_daily_summary`);
          
          // Agrupar por workflow_id para ter o total dos últimos 30 dias
          const workflowGroups: Record<string, any[]> = {};
          
          summaryData.forEach(item => {
            const workflowId = item.workflow_id || 'unknown';
            if (!workflowGroups[workflowId]) {
              workflowGroups[workflowId] = [];
            }
            workflowGroups[workflowId].push(item);
          });
          
          // Processar cada workflow com os dados resumidos
          Object.entries(workflowGroups).forEach(([workflowId, records]) => {
            if (!records || records.length === 0) return;
            
            const workflowName = records[0].workflow_name || `Workflow ${workflowId}`;
            const lastRecord = records[0]; // O primeiro registro é o mais recente
            
            // Somar valores de todos os dias para este workflow
            const totalTokens = records.reduce((sum, record) => sum + (record.total_tokens || 0), 0);
            const totalCost = records.reduce((sum, record) => sum + parseFloat(record.total_cost || 0), 0);
            const totalCalls = records.reduce((sum, record) => sum + (record.total_calls || 0), 0);
            const totalExecutions = records.reduce((sum, record) => sum + (record.total_requests || 0), 0);
            
            // Extrair modelo dominante se existir na lista de modelos usados
            let dominantModel = 'unknown';
            if (lastRecord.models_used) {
              const models = lastRecord.models_used.split(',').map(m => m.trim());
              if (models.length > 0) {
                // Usar o primeiro modelo como dominante (geralmente o mais usado)
                dominantModel = models[0];
              }
            }
            
            // Adicionar às estatísticas
            workflowStats[workflowId] = {
              name: workflowName,
              executions: totalExecutions,
              tokens: totalTokens,
              cost: totalCost,
              calls: totalCalls,
              lastExecuted: lastRecord.updated_at,
              model: dominantModel,
              costPer1K: totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0
            };
            
            // Adicionar ao resumo por agente
            costByAgent[workflowName] = {
              cost: totalCost,
              tokens: totalTokens
            };
          });
          
          console.log(`Processados ${Object.keys(workflowStats).length} workflows da tabela resumo`);
          
          // Se encontramos dados na tabela de resumo, podemos retornar agora
          if (Object.keys(workflowStats).length > 0) {
            return { workflowStats, costByAgent };
          }
        }
      } catch (err) {
        console.warn('Erro ao tentar buscar da tabela workflow_daily_summary:', err);
        console.log('Continuando com o método padrão de busca...');
      }
      
      // Fallback: buscar dados diretamente da tabela openai_usage se a tabela de resumo não existir ou estiver vazia
      const { data: workflowData, error: workflowError } = await supabaseClient
        .from('openai_usage')
        .select('workflow_id, workflow_name, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, timestamp, request_id, tags')
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false });
      
      if (workflowError) {
        console.error('Erro ao buscar dados por workflow:', workflowError);
        return { workflowStats: {}, costByAgent: {} };
      }
      
      if (!workflowData || workflowData.length === 0) {
        console.log('Nenhum dado de workflow encontrado');
        return { workflowStats: {}, costByAgent: {} };
      }
      
      console.log(`Processando ${workflowData.length} registros de workflow da tabela principal`);
      
      // Filtrar apenas workflows com tags específicas (agent ou nodes específicos)
      const validWorkflows = workflowData.filter(item => {
        if (!item.tags) return false;
        
        // Verificar se o item tem a tag 'agent' ou qualquer um dos nodes específicos
        const tags = Array.isArray(item.tags) 
          ? item.tags 
          : (typeof item.tags === 'object' ? Object.values(item.tags) : []);
        
        return tags.some(tag => 
          tag === 'agent' || 
          tag === 'AI Agent' || 
          tag === 'OpenAI Chat Model' || 
          tag === 'OpenAI'
        );
      });
      
      console.log(`Encontrados ${validWorkflows.length} registros com tags válidas (agent, AI Agent, OpenAI Chat Model, OpenAI)`);
      
      // Mapear workflows por ID para garantir dados individuais
      const requestsByWorkflow: Record<string, Set<string>> = {};
      
      // Agrupar registros por workflow_id para calcular estatísticas individuais
      const workflowGroups: Record<string, any[]> = {};
      
      // Primeiro, agrupamos todos os registros por workflow_id
      validWorkflows.forEach(item => {
        const workflowId = item.workflow_id || 'unknown';
        if (!workflowGroups[workflowId]) {
          workflowGroups[workflowId] = [];
        }
        workflowGroups[workflowId].push(item);
      });
      
      console.log(`Agrupados ${Object.keys(workflowGroups).length} workflows distintos`);
      
      // Para cada workflow, processamos seus dados individualmente
      Object.entries(workflowGroups).forEach(([workflowId, records]) => {
        if (!records || records.length === 0) return;
        
        const workflowName = records[0].workflow_name || `Workflow ${workflowId}`;
        
        // Inicializar estatísticas para este workflow
        workflowStats[workflowId] = {
          name: workflowName,
          executions: 0,
          tokens: 0,
          cost: 0,
          calls: 0,
          model: '', // Será definido abaixo
          costPer1K: 0 // Será calculado depois
        };
        
        requestsByWorkflow[workflowId] = new Set();
        
        // Determinar o modelo mais usado para este workflow e contar o uso de cada node
        const modelCounts: Record<string, number> = {};
        const nodeCounts: Record<string, { 
          calls: number,
          tokens: number,
          cost: number
        }> = {};
        
        records.forEach(item => {
          const model = item.model || 'unknown';
          modelCounts[model] = (modelCounts[model] || 0) + 1;
          
          // Contar uso por tipo de node (AI Agent, OpenAI Chat Model, OpenAI)
          if (item.tags) {
            const tags = Array.isArray(item.tags) 
              ? item.tags 
              : (typeof item.tags === 'object' ? Object.values(item.tags) : []);
            
            tags.forEach(tag => {
              if (tag === 'AI Agent' || tag === 'OpenAI Chat Model' || tag === 'OpenAI') {
                if (!nodeCounts[tag]) {
                  nodeCounts[tag] = { calls: 0, tokens: 0, cost: 0 };
                }
                
                nodeCounts[tag].calls += 1;
                nodeCounts[tag].tokens += (item.total_tokens || 0);
                nodeCounts[tag].cost += (parseFloat(item.estimated_cost) || 0);
              }
            });
          }
        });
        
        // Encontrar o modelo mais comum
        let dominantModel = 'unknown';
        let maxCount = 0;
        Object.entries(modelCounts).forEach(([model, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantModel = model;
          }
        });
        
        workflowStats[workflowId].model = dominantModel;
        
        // Processar cada registro deste workflow
        records.forEach(item => {
          const requestId = item.request_id || '';
          const cost = parseFloat(item.estimated_cost) || 0;
          const tokens = item.total_tokens || 0;
          const timestamp = item.timestamp;
          
          // Adicionar request_id para contar execuções únicas
          if (requestId) {
            requestsByWorkflow[workflowId].add(requestId);
          }
          
          // Acumular estatísticas
          workflowStats[workflowId].tokens += tokens;
          workflowStats[workflowId].cost += cost;
          workflowStats[workflowId].calls += 1;
          
          // Verificar e atualizar última execução
          if (!workflowStats[workflowId].lastExecuted || 
              new Date(timestamp) > new Date(workflowStats[workflowId].lastExecuted)) {
            workflowStats[workflowId].lastExecuted = timestamp;
          }
        });
        
        // Definir número de execuções baseado em requests únicos
        workflowStats[workflowId].executions = requestsByWorkflow[workflowId].size;
        
        // Calcular custo por 1K tokens para este workflow específico
        if (workflowStats[workflowId].tokens > 0) {
          workflowStats[workflowId].costPer1K = (workflowStats[workflowId].cost / workflowStats[workflowId].tokens) * 1000;
        }
        
        // Adicionar dados ao resumo por agente
        costByAgent[workflowName] = {
          cost: workflowStats[workflowId].cost,
          tokens: workflowStats[workflowId].tokens
        };
        
        // Log de uso por node para este workflow
        console.log(`Workflow ${workflowName}: Detalhes de uso por node:`);
        Object.entries(nodeCounts).forEach(([nodeType, stats]) => {
          console.log(`  - ${nodeType}: ${stats.calls} chamadas, ${stats.tokens} tokens, $${stats.cost.toFixed(6)} custo`);
        });
        
        console.log(`Workflow ${workflowId} (${workflowName}): Modelo principal: ${workflowStats[workflowId].model}, Tokens: ${workflowStats[workflowId].tokens}, Custo: $${workflowStats[workflowId].cost.toFixed(4)}, Custo/1K: $${workflowStats[workflowId].costPer1K.toFixed(6)}`);
      });
      
      console.log(`Dados processados: ${Object.keys(workflowStats).length} workflows processados individualmente`);
      
      return {
        workflowStats,
        costByAgent
      };
    } catch (error) {
      console.error('Erro ao processar dados de workflow:', error);
      return { workflowStats: {}, costByAgent: {} };
    }
  }, [supabaseClient]);

  /**
   * Função simplificada para buscar dados diretamente das tabelas do Supabase
   */
  const fetchData = useCallback(async () => {
    if (!supabaseClient) {
      console.warn('fetchData: Cliente Supabase não disponível');
      // Retornar dados padrão em vez de null para evitar erros quando cliente não está disponível
      return { ...DEFAULT_USAGE_DATA };
    }
    
    try {
      console.log('Buscando dados de uso diretamente das tabelas do Supabase');
      
      // 1. Buscar resumo diário (valor principal a ser exibido)
      let dailySummary = null;
      try {
        const { data: dailySummaryData, error: dailySummaryError } = await supabaseClient
          .from('openai_daily_summary')
          .select('*')
          .eq('date', new Date().toISOString().split('T')[0])
          .single();
        
        if (dailySummaryError && dailySummaryError.code !== 'PGRST116') {
          console.error('Erro ao buscar resumo diário:', dailySummaryError);
        }
        
        // Se há resumo diário, usar os dados
        if (dailySummaryData) {
          dailySummary = {
            total_calls: dailySummaryData.total_calls || 0,
            total_requests: dailySummaryData.total_requests || 0,
            total_cost: parseFloat(dailySummaryData.total_cost) || 0,
            total_tokens: dailySummaryData.total_tokens || 0,
            update_date: dailySummaryData.updated_at || new Date()
          };
        }
      } catch (err) {
        console.error('Erro ao buscar resumo diário da tabela:', err);
      }
      
      // Se não há resumo diário, chamar a função RPC para gerar um
      if (!dailySummary) {
        try {
          console.log('Resumo diário não encontrado, chamando função RPC');
          const { data: rpcData, error: rpcError } = await supabaseClient
            .rpc('get_daily_openai_usage_summary');
          
          if (rpcError) {
            console.error('Erro ao chamar função de resumo diário:', rpcError);
          } else if (rpcData && rpcData.length > 0) {
            dailySummary = {
              total_calls: rpcData[0].total_calls || 0,
              total_requests: rpcData[0].total_requests || 0,
              total_cost: parseFloat(rpcData[0].total_cost) || 0,
              total_tokens: rpcData[0].total_tokens || 0,
              update_date: rpcData[0].update_date || new Date()
            };
          }
        } catch (err) {
          console.error('Erro ao chamar RPC para resumo diário:', err);
        }
      }
      
      // Usar resumo padrão se ainda não tiver dados
      if (!dailySummary) {
        console.warn('Usando resumo diário padrão por falta de dados');
        dailySummary = {
          total_calls: 0,
          total_requests: 0,
          total_cost: 0,
          total_tokens: 0,
          update_date: new Date()
        };
      }
      
      console.log('Dados do resumo diário:', dailySummary);
      
      // 2. Definir período de consulta (30 dias atrás)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // 3. Buscar dados diários
      let dailyData = [];
      try {
        const { data, error } = await supabaseClient
          .from('openai_daily_summary')
          .select('*')
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true });
        
        if (error) {
          console.error('Erro ao buscar dados diários:', error);
        } else if (data) {
          dailyData = data;
        }
      } catch (err) {
        console.error('Erro na consulta de dados diários:', err);
      }
      
      // 4. Buscar uso por modelo
      let modelData = [];
      try {
        const { data, error } = await supabaseClient
          .from('openai_usage')
          .select('model, total_tokens, estimated_cost')
          .gte('timestamp', thirtyDaysAgo.toISOString())
          .order('timestamp', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar dados por modelo:', error);
        } else if (data) {
          modelData = data;
        }
      } catch (err) {
        console.error('Erro na consulta de uso por modelo:', err);
      }
      
      // 5. Buscar dados de workflow em separado usando a função especializada
      let workflowData = { workflowStats: {}, costByAgent: {} };
      try {
        workflowData = await fetchWorkflowData(thirtyDaysAgo);
      } catch (err) {
        console.error('Erro ao buscar dados de workflow:', err);
      }
      
      // 6. Processar dados diários
      const dailyUsage: DailyUsageItem[] = [];
      
      if (dailyData && dailyData.length > 0) {
        dailyData.forEach(day => {
          dailyUsage.push({
            date: day.date,
            amount: parseFloat(day.total_cost) || 0,
            totalTokens: day.total_tokens || 0
          });
        });
      }
      
      // 7. Preencher dias sem dados
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        if (!dailyUsage.some(day => day.date === dateStr)) {
          dailyUsage.push({
            date: dateStr,
            amount: 0,
            totalTokens: 0
          });
        }
      }
      
      // 8. Ordenar por data
      dailyUsage.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // 9. Processar dados por modelo
      const modelUsageMap = new Map<string, ModelUsageItem>();
      
      if (modelData && modelData.length > 0) {
        modelData.forEach(item => {
          const model = item.model;
          if (!model) return; // Ignorar registros sem modelo
          
          const cost = parseFloat(item.estimated_cost) || 0;
          const tokens = item.total_tokens || 0;
          
          if (!modelUsageMap.has(model)) {
            modelUsageMap.set(model, {
              model,
              cost: 0,
              tokens: 0,
              requests: 0
            });
          }
          
          const existingData = modelUsageMap.get(model)!;
          existingData.cost += cost;
          existingData.tokens += tokens;
          existingData.requests += 1;
        });
      }
      
      const modelUsage = Array.from(modelUsageMap.values());
      
      // 10. Calcular totais do mês atual
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      const currentMonthCost = dailyUsage
        .filter(day => day.date.startsWith(currentMonth))
        .reduce((sum, day) => sum + day.amount, 0);
      
      // 11. Calcular totais do mês anterior
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const previousMonth = lastMonth.toISOString().substring(0, 7); // YYYY-MM
      const previousMonthCost = dailyUsage
        .filter(day => day.date.startsWith(previousMonth))
        .reduce((sum, day) => sum + day.amount, 0);
      
      // 12. Calcular variação percentual
      const percentChange = previousMonthCost > 0 
        ? ((currentMonthCost - previousMonthCost) / previousMonthCost) * 100 
        : 0;
      
      // 13. Definir limite de uso (pode ser configurado em ambiente real)
      const usageLimit = 100; // USD
      
      // 14. Calcular média diária
      const daysInCurrentMonth = new Date().getDate();
      const dailyAverage = currentMonthCost / daysInCurrentMonth;
      
      // 15. Montar objeto de resultado
      const result: OpenAIUsageSummary = {
        currentMonthCost,
        previousMonthCost,
        percentChange,
        modelUsage,
        dailyUsage,
        costByAgent: workflowData.costByAgent,
        subscription: {
          usageLimit,
          remainingCredits: Math.max(0, usageLimit - currentMonthCost)
        },
        dailyAverage: {
          amount: dailyAverage,
          percentOfLimit: (dailyAverage / (usageLimit / 30)) * 100
        },
        workflowStats: workflowData.workflowStats,
        dailySummary: dailySummary
      };
      
      console.log('Dados processados com sucesso:', {
        dailySummary: result.dailySummary,
        models: result.modelUsage.length,
        days: result.dailyUsage.length,
        workflows: Object.keys(result.workflowStats).length
      });
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar dados do Supabase:', error);
      // Retornar dados padrão para evitar quebrar a UI
      return { ...DEFAULT_USAGE_DATA };
    }
  }, [supabaseClient, fetchWorkflowData]);

  /**
   * Função para buscar dados de uso da OpenAI
   */
  const fetchUsageData = useCallback(async (silent: boolean = false) => {
    // Impedir múltiplas chamadas simultâneas
    if (requestInProgress.current || isLoading) {
      console.log('Requisição já em andamento, ignorando nova chamada');
      return;
    }
    
    setIsLoading(true);
    requestInProgress.current = true;

    try {
      // Buscar dados diretamente do Supabase
      const data = await fetchData();
      
      // Sempre definir os dados, mesmo que sejam os padrões
        setUsageData(data);
      setError(null);
      
    } catch (err) {
      console.error('Erro ao buscar dados de uso:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Definir dados padrão para evitar quebrar a UI
      setUsageData({ ...DEFAULT_USAGE_DATA });
      
      if (!silent) {
        toast.error('Erro ao buscar dados de uso', {
          description: err instanceof Error ? err.message : 'Não foi possível carregar os dados de uso da OpenAI'
        });
      }
    } finally {
      setIsLoading(false);
      requestInProgress.current = false;
    }
  }, [fetchData]);

  /**
   * Função para sincronizar dados com o N8N
   */
  const syncWithSupabase = async () => {
    setIsLoading(true)
    setSyncError(null)
    
    try {
      console.log('Iniciando sincronização manual de dados com o Supabase...')
      
      // Atualizar o resumo diário primeiro (opcional, pois a Edge Function também faz isso)
      await fetch('/api/openai/update-daily-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      // Chamar nossa API de sincronização automática
      const response = await fetch('/api/cron/sync-n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer sync-n8n-cron-secret`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Erro na sincronização: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Resposta da sincronização:', data)
      
      // Atualizar os dados após a sincronização
      await fetchUsageData()
      
      // Exibir mensagem de sucesso com dados extraídos
      const extractedCount = data.stats?.recordsExtracted || 0
      const savedCount = data.stats?.recordsSaved || 0
      
      toast.success(
        `Sincronização concluída: ${savedCount} registros salvos`, 
        { description: `Foram extraídos ${extractedCount} registros de uso da OpenAI. Duração: ${data.duration || '?'}` }
      )
      
      return data
    } catch (error) {
      console.error('Erro ao sincronizar dados com Supabase:', error)
      setSyncError(error instanceof Error ? error.message : 'Erro desconhecido')
      
      toast.error('Falha na sincronização', {
        description: error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar dados'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Função para exportar dados para CSV
   */
  const exportData = async () => {
    if (!usageData) {
      toast.error('Não há dados para exportar');
      return;
    }
    
    try {
      // Preparar dados para exportação
      const dailyUsageCSV = [
        'Data,Custo,Tokens',
        ...usageData.dailyUsage.map(day => 
          `${day.date},${day.amount.toFixed(6)},${day.totalTokens}`
        )
      ].join('\n');
      
      const modelUsageCSV = [
        'Modelo,Custo,Tokens,Requisições',
        ...usageData.modelUsage.map(model => 
          `${model.model},${model.cost.toFixed(6)},${model.tokens},${model.requests}`
        )
      ].join('\n');
      
      const workflowUsageCSV = [
        'Workflow,Nome,Execuções,Chamadas,Tokens,Custo',
        ...Object.entries(usageData.workflowStats).map(([id, data]) => 
          `${id},${data.name},${data.executions},${data.calls},${data.tokens},${data.cost.toFixed(6)}`
        )
      ].join('\n');
      
      // Chamar API para gerar arquivo
      const response = await fetch('/api/n8n/export-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dailyUsageCSV,
          modelUsageCSV,
          workflowUsageCSV,
          agentUsageCSV: [
            'Agente,Custo,Tokens',
            ...Object.entries(usageData.costByAgent).map(([agent, data]) => 
              `${agent},${data.cost.toFixed(6)},${data.tokens}`
            )
          ].join('\n')
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao gerar arquivo para download');
      }
      
      const blob = await response.blob();
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openai-usage-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      
      toast.success('Dados exportados com sucesso');
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      toast.error('Erro ao exportar dados', {
        description: err instanceof Error ? err.message : 'Não foi possível exportar os dados'
      });
    }
  };

  // Efeito para buscar dados quando o componente é montado
  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  return {
    usageData,
    isLoading,
    error,
    refreshData: fetchUsageData,
    syncWithSupabase,
    exportData
  };
} 