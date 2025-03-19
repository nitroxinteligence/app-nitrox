import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { processCompletionsData } from '@/lib/openai-completions-service'

// Preços por modelo (em USD por 1000 tokens)
const MODEL_PRICING = {
  // GPT-4o
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  
  // GPT-4
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-4-vision': { input: 0.01, output: 0.03 },
  
  // GPT-3.5
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002 },
  
  // Fallback para outros modelos
  'default': { input: 0.01, output: 0.03 }
};

export interface OpenAIUsageHookResult {
  usageData: OpenAIUsageSummary | null
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  syncCompletionsData: () => Promise<void>
  syncCostData: () => Promise<void>
  syncTodayData: () => Promise<void>
  exportData: () => Promise<void>
}

// Interface para dados de completions
interface CompletionsUsageData {
  byDate: any[];
  byModel: any[];
  total: {
    input_tokens: number;
    output_tokens: number;
    input_cached_tokens: number;
    input_audio_tokens: number;
    output_audio_tokens: number;
    requests: number;
    efficiency: number;
  };
  dailyStats?: {
    input_tokens: number;
    output_tokens: number;
    input_cached_tokens: number;
    output_audio_tokens: number;
    requests: number;
    efficiency: number;
    totalCost?: number;
  };
  costEstimates?: {
    daily: number;
    last24h: number;
    last7days: number;
    last30days: number;
    byModel: { [key: string]: number };
  };
  actualCosts?: {
    byDate: {
      date: string;
      amount_value: number;
      amount_currency: string;
    }[];
    total: number;
    last7days: number;
    last30days: number;
  };
}

// Interface para resultados por modelo
interface ModelResult {
  name: string;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  requests: number;
  efficiency: number;
}

// Interface para resultados por data
interface DateResult {
  date: string;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  requests: number;
}

// Interface para custos por data
interface CostResult {
  date: string;
  amount_value: number;
  amount_currency: string;
}

// Definir o tipo OpenAIUsageSummary com propriedades opcionais para resolver erros de tipagem
  interface OpenAIUsageSummary {
  subscription?: { usageLimit: number; remainingCredits: number; } | null;
  currentMonth?: { startDate: string; endDate: string; percentChange: number; } | null;
  currentMonthTotal?: number;
  previousMonth?: { startDate: string; endDate: string; percentChange: number; } | null;
  previousMonthTotal?: number;
  months?: any[];
    completionsUsage?: CompletionsUsageData;
}

// Chave para armazenar os dados no localStorage
const STORAGE_KEY = 'siaflow_completions_data';
const STORAGE_TIMESTAMP_KEY = 'siaflow_completions_last_updated';

// Tempo máximo que consideramos os dados em cache válidos (10 minutos em milissegundos)
const CACHE_MAX_AGE = 10 * 60 * 1000;

/**
 * Hook para buscar dados de uso da OpenAI
 */
export default function useOpenAIUsage(apiKey?: string): OpenAIUsageHookResult {
  const [usageData, setUsageData] = useState<OpenAIUsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [costSyncInProgress, setCostSyncInProgress] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const initialDataLoaded = useRef(false)

  // Inicializar o cliente Supabase
  useEffect(() => {
    // Remover a inicialização do Supabase

    // Tentar carregar dados do localStorage na inicialização
    if (!initialDataLoaded.current) {
      try {
        const storedDataStr = localStorage.getItem(STORAGE_KEY);
        const storedTimestampStr = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
        
        if (storedDataStr && storedTimestampStr) {
          const storedData = JSON.parse(storedDataStr);
          const storedTimestamp = parseInt(storedTimestampStr);
          const now = Date.now();
          
          // Verificar se os dados em cache ainda são válidos (menos de 10 minutos)
          if (now - storedTimestamp < CACHE_MAX_AGE) {
            console.log('📋 Carregando dados em cache do localStorage...');
            setUsageData(storedData);
          } else {
            console.log('🕒 Dados em cache expirados, será necessário buscar dados novos');
          }
        }
      } catch (e) {
        console.warn('⚠️ Erro ao carregar dados do localStorage:', e);
        // Não fazemos nada, apenas continuamos com o fluxo normal
      }
      
      initialDataLoaded.current = true;
    }
  }, [])

  // Função para criar uma estrutura de dados vazia para completions
  const createEmptyCompletionsData = () => {
    console.log('🔍 Criando estrutura de dados vazia para completions...');
    
    return {
      byDate: [],
      byModel: [],
      total: {
                input_tokens: 0,
                output_tokens: 0,
                input_cached_tokens: 0,
        input_audio_tokens: 0,
        output_audio_tokens: 0,
        requests: 0,
        efficiency: 0
      }
    };
  };

  // Função auxiliar para calcular a eficiência
  const calculateEfficiency = (input: number, output: number): number => {
    if (!input || input === 0) return 0;
    return Math.round((output / input) * 100);
  };

  // Função para obter estatísticas apenas do dia atual - modificada para não usar Supabase
  const getCurrentDayCompletionsData = async () => {
    try {
      console.log('🔍 Criando estrutura vazia para dados do dia atual...');
      
      // Retornar estrutura vazia
        return {
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        output_audio_tokens: 0,
        requests: 0,
        efficiency: 0
      };
    } catch (error) {
      console.error('❌ Erro ao inicializar dados do dia atual:', error);
      return null;
    }
  };

  // Adicione a função para calcular custo de tokens baseado no modelo
  const calculateTokenCost = (inputTokens: number, outputTokens: number, model: string): number => {
    // Normalizar o nome do modelo para corresponder aos preços
    const normalizedModel = model.toLowerCase();
    let pricing = MODEL_PRICING.default;
    
    // Encontrar o pricing mais adequado para o modelo
    for (const [modelKey, price] of Object.entries(MODEL_PRICING)) {
      if (normalizedModel.includes(modelKey)) {
        pricing = price;
        break;
      }
    }
    
    // Calcular o custo (preço por 1000 tokens * número de tokens / 1000)
    const inputCost = (pricing.input * inputTokens) / 1000;
    const outputCost = (pricing.output * outputTokens) / 1000;
    
    // Retornar custo total arredondado para 4 casas decimais
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  };

  // Função para calcular estimativas de custo para diferentes períodos
  const calculateCostEstimates = (completionsData: CompletionsUsageData): CompletionsUsageData['costEstimates'] => {
    if (!completionsData || !completionsData.byDate || !completionsData.byModel) {
      return {
        daily: 0,
        last24h: 0,
        last7days: 0,
        last30days: 0,
        byModel: {}
      };
    }

    try {
      console.log('🧮 Calculando estimativas de custo para diferentes períodos...');

      const today = new Date().toISOString().split('T')[0];
      const byModel: { [key: string]: number } = {};
      let dailyCost = 0;
      let last24hCost = 0;
      let last7daysCost = 0;
      let last30daysCost = 0;

      // Calcular custos por modelo
      completionsData.byModel.forEach((model: ModelResult) => {
        const modelName = model.name || 'desconhecido';
        const cost = calculateTokenCost(model.input_tokens, model.output_tokens, modelName);
        byModel[modelName] = cost;
      });

      // Cálculo para custo diário (usando dailyStats se disponível)
      if (completionsData.dailyStats) {
        // Use a média de custo do modelo para estimativa
        const avgInputCost = Object.values(MODEL_PRICING).reduce((sum, p) => sum + p.input, 0) / Object.keys(MODEL_PRICING).length;
        const avgOutputCost = Object.values(MODEL_PRICING).reduce((sum, p) => sum + p.output, 0) / Object.keys(MODEL_PRICING).length;
        
        dailyCost = (avgInputCost * completionsData.dailyStats.input_tokens / 1000) + 
                   (avgOutputCost * completionsData.dailyStats.output_tokens / 1000);
        dailyCost = Math.round(dailyCost * 10000) / 10000;
      }

      // Processar dados para diferentes períodos
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24*60*60*1000).toISOString().split('T')[0];
      const sevenDaysAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0];

      completionsData.byDate.forEach((date: DateResult) => {
        if (!date || !date.date) return;
        
        // Para cada data, calcular custo aproximado usando preços médios
        const avgInputCost = 0.005;  // Valor médio para entrada
        const avgOutputCost = 0.015; // Valor médio para saída
        
        const dateCost = (avgInputCost * date.input_tokens / 1000) + 
                       (avgOutputCost * date.output_tokens / 1000);
        
        // Adicionar ao período apropriado
        if (date.date >= oneDayAgo) {
          last24hCost += dateCost;
        }
        
        if (date.date >= sevenDaysAgo) {
          last7daysCost += dateCost;
        }
        
        if (date.date >= thirtyDaysAgo) {
          last30daysCost += dateCost;
        }
      });

      // Arredondar os valores
      last24hCost = Math.round(last24hCost * 100) / 100;
      last7daysCost = Math.round(last7daysCost * 100) / 100;
      last30daysCost = Math.round(last30daysCost * 100) / 100;

      console.log('💰 Custos estimados calculados:', {
        daily: dailyCost,
        last24h: last24hCost,
        last7days: last7daysCost,
        last30days: last30daysCost,
        modelsCount: Object.keys(byModel).length
      });

      return {
        daily: dailyCost,
        last24h: last24hCost,
        last7days: last7daysCost,
        last30days: last30daysCost,
        byModel
      };
    } catch (e) {
      console.error('❌ Erro ao calcular estimativas de custo:', e);
      return {
        daily: 0,
        last24h: 0,
        last7days: 0,
        last30days: 0,
        byModel: {}
      };
    }
  };

  // Função para buscar dados de custos reais - modificada para não usar Supabase
  const fetchRealCostData = async () => {
    // Esta função não será mais usada pois obtemos os dados de custos diretamente da API
    return null;
  };

  // Modificar a função fetchData para buscar dados apenas do localStorage
  const fetchData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Buscar dados do localStorage
      console.log('🔄 Buscando dados do localStorage...');
      let completionsUsage = null;
      let dailyStats = null;
      
      try {
        const storedDataStr = localStorage.getItem(STORAGE_KEY);
        if (storedDataStr) {
          const storedData = JSON.parse(storedDataStr);
          if (storedData && storedData.completionsUsage) {
            completionsUsage = storedData.completionsUsage;
            dailyStats = storedData.completionsUsage.dailyStats || null;
            console.log('✅ Dados carregados do localStorage com sucesso');
          } else {
            console.log('⚠️ Dados no localStorage não contêm completionsUsage');
          }
        } else {
          console.log('⚠️ Nenhum dado encontrado no localStorage');
        }
      } catch (e) {
        console.warn('⚠️ Erro ao carregar dados do localStorage:', e);
      }
      
      // Se não temos dados em cache, criar estrutura vazia
      if (!completionsUsage) {
        console.log('Criando estrutura de dados vazia para completions');
        completionsUsage = createEmptyCompletionsData();
      }
      
      // Adicionar o completionsUsage com dailyStats
      const enhancedCompletionsUsage = {
        ...completionsUsage,
        dailyStats: dailyStats || undefined,
      };
      
      // Calcular estimativas de custo
      const costEstimates = calculateCostEstimates({
        ...enhancedCompletionsUsage
      });

      // Adicionar estimativas de custo
      const completionsUsageWithEstimates = {
        ...enhancedCompletionsUsage,
        costEstimates
      };

      // Montar o objeto de resposta
      const data = {
        subscription: null,
        currentMonth: null,
        currentMonthTotal: 0,
        previousMonth: null,
        previousMonthTotal: 0,
        months: [],
        completionsUsage: completionsUsageWithEstimates
      };
      
      console.log('✅ Processamento de dados concluído com dados:', 
        !completionsUsage.byDate.length && !completionsUsage.byModel.length
          ? 'vazios (estrutura inicial)'
          : `${completionsUsage.byDate.length} registros por data, ${completionsUsage.byModel.length} modelos`
      );
      
      setUsageData(data);
      
      // Se não temos dados no localStorage, precisamos buscar da API
      if (!completionsUsage.byDate.length && !completionsUsage.byModel.length) {
        console.log('Dados vazios, recomendado sincronizar com API usando syncCompletionsData()');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Função para sincronizar dados de completions
   */
  const syncCompletionsData = async () => {
    setIsLoading(true);
    
    try {
      toast.info('Sincronizando dados de completions...', {
        description: 'Buscando dados da API da OpenAI'
      });
      
      // Buscar 31 dias (máximo permitido pela API)
      const daysToFetch = 31;
      console.log(`🔄 Iniciando sincronização de dados para os últimos ${daysToFetch} dias`);
      
      const response = await fetch('/api/openai/sync-completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days: daysToFetch })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na resposta da API:', errorData);
        throw new Error(errorData.error || 'Erro ao sincronizar dados de completions');
      }
      
      const result = await response.json();
      console.log('✅ Resultado da sincronização de completions:', result);
      
      // Verificar e processar dados recebidos
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        console.warn('⚠️ API retornou sucesso, mas sem dados para processar');
        toast.warning('Nenhum dado disponível', {
          description: 'A API não retornou dados para processar.'
        });
        setIsLoading(false);
        return;
      }
      
      // Processar os dados brutos
      console.log(`🔍 Processando ${result.data.length} registros recebidos da API...`);
      const processedData = processCompletionsData(result.data);
      
      // Log detalhado para diagnóstico
      console.log('📊 Dados processados:',
        `${processedData.byDate.length} dias, ` +
        `${processedData.byModel.length} modelos, ` +
        `${processedData.total.input_tokens.toLocaleString()} input tokens, ` +
        `${processedData.total.output_tokens.toLocaleString()} output tokens`
      );
      
      if (processedData.byDate.length === 0) {
        console.warn('⚠️ Nenhum dado por data gerado após processamento');
      } else {
        console.log('📅 Datas processadas:', processedData.byDate.map(d => d.date).join(', '));
      }
      
      // Atualizar o estado com os novos dados
      setUsageData(prevData => {
        if (!prevData) {
          // Criar objeto inicial se não existir
          const newData: OpenAIUsageSummary = {
            completionsUsage: {
              ...processedData,
              // Manter dailyStats se já existir
              dailyStats: prevData?.completionsUsage?.dailyStats,
              // Manter custos se já existirem
              actualCosts: prevData?.completionsUsage?.actualCosts
            }
          };
          
          // Salvar no localStorage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
            localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
          } catch (e) {
            console.warn('⚠️ Erro ao salvar dados no localStorage:', e);
          }
          
          return newData;
        }
        
        // Atualizar dados existentes
        const newData = { ...prevData };
        
        if (!newData.completionsUsage) {
          newData.completionsUsage = processedData;
        } else {
          // Atualizar mantendo dailyStats e actualCosts
          newData.completionsUsage = {
            ...processedData,
            dailyStats: newData.completionsUsage.dailyStats || undefined,
            actualCosts: newData.completionsUsage.actualCosts || undefined
          };
        }
        
        // Calcular estimativas de custo
        newData.completionsUsage.costEstimates = calculateCostEstimates(newData.completionsUsage);
        
        // Salvar no localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
          localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
          console.warn('⚠️ Erro ao salvar dados no localStorage:', e);
        }
        
        return newData;
      });
      
      // Atualizar o timestamp da última sincronização
      const now = new Date();
      setLastSyncTime(now);
      
      toast.success('Dados sincronizados com sucesso', {
        description: `${result.data.length} registros processados.`
      });
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar dados de completions:', error);
      
      toast.error('Falha na sincronização de dados', {
        description: error instanceof Error ? error.message : 'Não foi possível sincronizar os dados.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Função para sincronizar dados de custos da OpenAI
   */
  const syncCostData = async () => {
    setCostSyncInProgress(true);
    
    toast.info('Obtendo dados de custos reais...', {
      description: 'Buscando dados diretamente da API da OpenAI'
    });
    
    try {
      // Dias limitados a 30 para compatibilidade com a API
      const daysToFetch = 30;
      console.log(`🔄 Iniciando obtenção de dados de custo para os últimos ${daysToFetch} dias`);
      
      // Chamar a API para obter os dados de custos diretamente
      const response = await fetch('/api/openai/sync-costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days: daysToFetch, forceRefresh: true })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na resposta da API de custos:', errorData);
        throw new Error(errorData.error || 'Erro ao obter dados de custos');
      }
      
      const result = await response.json();
      console.log('✅ Resultado da obtenção de custos:', result);
      
      if (!result.data) {
        console.warn('⚠️ API retornou sucesso, mas sem dados processados');
        toast.warning('Nenhum dado de custo disponível', {
          description: 'A API da OpenAI não retornou dados de custos para o período solicitado.'
        });
        setCostSyncInProgress(false);
        return;
      }
      
      // Diagnóstico detalhado dos dados recebidos
      console.log("=== DIAGNÓSTICO DE CUSTOS RECEBIDOS ===");
      if (result.data.byDate && result.data.byDate.length > 0) {
        console.log("Custos por data:");
        result.data.byDate.forEach((item: CostResult) => {
          console.log(`Data: ${item.date}, Valor: $${item.amount_value}`);
        });
      } else {
        console.warn("Nenhum dado de custo por data disponível");
      }
      
      // Atualizar o estado diretamente com os dados recebidos
      setUsageData(prevData => {
        if (!prevData) return prevData;
        
        // Criar uma cópia profunda do estado atual
        const newData = JSON.parse(JSON.stringify(prevData));
        
        // Atualizar a seção de custos
        if (!newData.completionsUsage) {
          newData.completionsUsage = {};
        }
        
        // Adicionar dados de custos reais
        newData.completionsUsage.actualCosts = result.data;
        
        // Log confirmando a atualização
        console.log("Estado atualizado com dados de custos:", 
          result.data.byDate ? 
            `${result.data.byDate.length} registros de custo, total: $${result.data.total}` : 
            "Sem dados por data"
        );
        
        return newData;
      });
      
      toast.success('Dados de custos obtidos', {
        description: `${result.stats?.records_processed || 0} registros processados.`
      });
      
      // Registrar o horário da obtenção bem-sucedida
      const now = new Date();
      setLastSyncTime(now);
      
      // Salvar o timestamp no localStorage também
      try {
        localStorage.setItem('siaflow_completions_last_updated', now.getTime().toString());
      } catch (e) {
        console.warn('Erro ao salvar timestamp no localStorage:', e);
      }
    } catch (error) {
      console.error('Erro ao obter dados de custos:', error);
      
      // Formatando a mensagem de erro para o usuário
      let errorMessage = 'Não foi possível obter os dados de custos.';
      let suggestion = 'Tente novamente mais tarde ou contate o suporte.';
      
      if (error instanceof Error) {
        const errorString = error.message || String(error);
        
        // Verificar por erros específicos
        if (errorString.includes('insufficient permissions')) {
          errorMessage = 'Erro de permissão: A chave de API não tem permissões suficientes.';
          suggestion = 'É necessário utilizar uma chave de API com permissões de administrador (api.usage.read).';
        } else if (errorString.includes('OPENAI_ADMIN_KEY')) {
          errorMessage = 'Chave de API de administrador não configurada.';
          suggestion = 'Configure a variável de ambiente OPENAI_ADMIN_KEY com uma chave de administrador da OpenAI.';
        }
      }
      
      toast.error('Falha na obtenção de custos', {
        description: `${errorMessage} ${suggestion}`,
        duration: 6000 // Aumentando a duração para dar tempo de ler
      });
    } finally {
      setCostSyncInProgress(false);
    }
  };

  /**
   * Busca e atualiza especificamente os dados do dia atual (hoje)
   * Isso executa uma chamada otimizada que busca apenas o dia de hoje
   */
  const syncTodayData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Iniciando sincronização específica dos dados de hoje');
      
      // Obter data de hoje no formato YYYY-MM-DD para comparações
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      console.log(`Data de hoje para sincronização: ${todayString}`);
      
      // Fazer requisição à API especifica para o dia atual
      console.log('Chamando API para dados de hoje...');
      const todayDataResponse = await fetch('/api/openai/sync-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!todayDataResponse.ok) {
        const errorData = await todayDataResponse.json().catch(() => ({}));
        console.error('❌ Erro na resposta da API:', errorData);
        throw new Error(errorData.error || 'Erro ao sincronizar dados de hoje');
      }
      
      const todayDataResult = await todayDataResponse.json().catch(() => ({ success: false }));
      
      if (!todayDataResult.success) {
        throw new Error(todayDataResult.error || 'Falha ao sincronizar dados de hoje');
      }
      
      console.log('✅ Dados brutos do dia atual recebidos da API:', todayDataResult);
      
      // Verificar se os dados de hoje foram recebidos
      if (!todayDataResult.todayData) {
        console.warn('⚠️ A API retornou sucesso, mas não incluiu dados processados para hoje');
      } else {
        console.log('✅ Dados processados para hoje recebidos:', todayDataResult.todayData);
      }
      
      // Atualizar os dados no state com foco nos dados do dia atual
      setUsageData(prevData => {
        if (!prevData) {
          // Criar estrutura básica de dados
          const newData: OpenAIUsageSummary = {
            subscription: null,
            currentMonth: null,
            currentMonthTotal: 0,
            previousMonth: null,
            previousMonthTotal: 0,
            months: [],
            completionsUsage: {
              byDate: [],
              byModel: [],
              total: {
                input_tokens: 0,
                output_tokens: 0,
                input_cached_tokens: 0,
                input_audio_tokens: 0,
                output_audio_tokens: 0,
                requests: 0,
                efficiency: 0
              },
              dailyStats: {
                input_tokens: 0,
                output_tokens: 0,
                input_cached_tokens: 0,
                output_audio_tokens: 0,
                requests: 0,
                efficiency: 0,
                totalCost: 0
              }
            }
          };
          
          console.log('Criada estrutura básica por não existir dados anteriores');
          
          // Se temos dados de hoje da API, atualizá-los
          if (todayDataResult.todayData) {
            if (newData.completionsUsage) {
              newData.completionsUsage.dailyStats = {
                input_tokens: todayDataResult.todayData.usage.input_tokens || 0,
                output_tokens: todayDataResult.todayData.usage.output_tokens || 0,
                input_cached_tokens: todayDataResult.todayData.usage.input_cached_tokens || 0,
                output_audio_tokens: 0,
                requests: todayDataResult.todayData.usage.requests || 0,
                efficiency: todayDataResult.todayData.usage.efficiency || 0,
                totalCost: todayDataResult.todayData.cost || 0
              };
              
              // Adicionar aos dados por data
              newData.completionsUsage.byDate.push({
                date: todayDataResult.todayData.date,
                input_tokens: todayDataResult.todayData.usage.input_tokens || 0,
                output_tokens: todayDataResult.todayData.usage.output_tokens || 0,
                input_cached_tokens: todayDataResult.todayData.usage.input_cached_tokens || 0,
                requests: todayDataResult.todayData.usage.requests || 0
              });
              
              // Inicializar dados de custos
              newData.completionsUsage.actualCosts = {
                byDate: [{
                  date: todayDataResult.todayData.date,
                  amount_value: todayDataResult.todayData.cost || 0,
                  amount_currency: 'USD'
                }],
                total: todayDataResult.todayData.cost || 0,
                last7days: todayDataResult.todayData.cost || 0,
                last30days: todayDataResult.todayData.cost || 0
              };
            }
          }
          
          return newData;
        }
        
        // Clonar o objeto anterior para não modificá-lo diretamente
        const newData = { ...prevData };
        
        // Garantir que a estrutura de dados existe
        if (!newData.completionsUsage) {
          newData.completionsUsage = {
            byDate: [],
            byModel: [],
            total: {
              input_tokens: 0,
              output_tokens: 0,
              input_cached_tokens: 0,
              input_audio_tokens: 0,
              output_audio_tokens: 0,
              requests: 0,
              efficiency: 0
            }
          };
        }
        
        if (newData.completionsUsage && !newData.completionsUsage.dailyStats) {
          newData.completionsUsage.dailyStats = {
            input_tokens: 0,
            output_tokens: 0,
            input_cached_tokens: 0, 
            output_audio_tokens: 0,
            requests: 0,
            efficiency: 0
          };
        }
        
        // Usar dados da API se disponíveis, ou criar dados vazios
        const todayData = todayDataResult.todayData || {
          date: todayString,
          usage: {
            input_tokens: 0,
            output_tokens: 0,
            input_cached_tokens: 0,
            requests: 0,
            efficiency: 0
          },
          cost: 0
        };
        
        // Garantir que a data está correta
        todayData.date = todayString;
        
        // Atualizar dailyStats com os dados mais recentes
        if (newData.completionsUsage && newData.completionsUsage.dailyStats) {
          newData.completionsUsage.dailyStats = {
            ...newData.completionsUsage.dailyStats,
            ...todayData.usage,
            totalCost: todayData.cost || 0
          };
        }
        
        // Garantir que o array byDate existe
        if (newData.completionsUsage && !newData.completionsUsage.byDate) {
          newData.completionsUsage.byDate = [];
        }
        
        // Atualizar ou adicionar dados para hoje em byDate
        if (newData.completionsUsage && newData.completionsUsage.byDate) {
          const existingTodayIndex = newData.completionsUsage.byDate.findIndex(
            item => item.date === todayString
          );
          
          if (existingTodayIndex >= 0) {
            // Atualizar dados existentes
            newData.completionsUsage.byDate[existingTodayIndex] = {
              date: todayString,
              input_tokens: todayData.usage.input_tokens || 0,
              output_tokens: todayData.usage.output_tokens || 0,
              input_cached_tokens: todayData.usage.input_cached_tokens || 0,
              requests: todayData.usage.requests || 0
            };
          } else {
            // Adicionar novos dados
            newData.completionsUsage.byDate.push({
              date: todayString,
              input_tokens: todayData.usage.input_tokens || 0,
              output_tokens: todayData.usage.output_tokens || 0,
              input_cached_tokens: todayData.usage.input_cached_tokens || 0,
              requests: todayData.usage.requests || 0
            });
          }
        }
        
        // Garantir que a estrutura de custos existe
        if (newData.completionsUsage && !newData.completionsUsage.actualCosts) {
          newData.completionsUsage.actualCosts = {
            byDate: [],
            total: 0,
            last7days: 0,
            last30days: 0
          };
        }
        
        if (newData.completionsUsage && newData.completionsUsage.actualCosts && !newData.completionsUsage.actualCosts.byDate) {
          newData.completionsUsage.actualCosts.byDate = [];
        }
        
        // Atualizar ou adicionar custos para hoje
        if (newData.completionsUsage && newData.completionsUsage.actualCosts && newData.completionsUsage.actualCosts.byDate) {
          const existingTodayCostIndex = newData.completionsUsage.actualCosts.byDate.findIndex(
            item => item.date === todayString
          );
          
          if (existingTodayCostIndex >= 0) {
            // Usar o valor de custo da API ou manter o existente se maior que zero
            const currentCost = newData.completionsUsage.actualCosts.byDate[existingTodayCostIndex].amount_value;
            const newCost = todayData.cost || 0;
            newData.completionsUsage.actualCosts.byDate[existingTodayCostIndex] = {
              date: todayString,
              amount_value: newCost > 0 ? newCost : (currentCost > 0 ? currentCost : 0),
              amount_currency: 'USD'
            };
          } else {
            // Adicionar novo registro de custo
            newData.completionsUsage.actualCosts.byDate.push({
              date: todayString,
              amount_value: todayData.cost || 0,
              amount_currency: 'USD'
            });
          }
        }
        
        // Recalcular totais
        if (newData.completionsUsage && newData.completionsUsage.actualCosts && newData.completionsUsage.actualCosts.byDate && newData.completionsUsage.actualCosts.byDate.length > 0) {
          // Total geral
          newData.completionsUsage.actualCosts.total = newData.completionsUsage.actualCosts.byDate.reduce(
            (sum, item) => sum + (item.amount_value || 0), 0
          );
          
          // Últimos 7 dias
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
          
          newData.completionsUsage.actualCosts.last7days = newData.completionsUsage.actualCosts.byDate
            .filter(item => item.date >= sevenDaysAgoStr)
            .reduce((sum, item) => sum + (item.amount_value || 0), 0);
            
          // Últimos 30 dias
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
          
          newData.completionsUsage.actualCosts.last30days = newData.completionsUsage.actualCosts.byDate
            .filter(item => item.date >= thirtyDaysAgoStr)
            .reduce((sum, item) => sum + (item.amount_value || 0), 0);
        }
        
        // Salvar dados no localStorage para acesso offline
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
          localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
          console.warn('⚠️ Erro ao salvar dados no localStorage:', e);
        }
        
        console.log('✅ Dados de hoje atualizados com sucesso:', {
          custosHoje: todayData.cost,
          usageHoje: todayData.usage
        });
        
        return newData;
      });
      
      // Atualizar o timestamp de última sincronização
      const now = new Date();
      setLastSyncTime(now);
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar dados do dia atual:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar dados do dia atual');
    } finally {
      setIsLoading(false);
    }
  };

  // Função simplificada para exportar apenas dados de completions
  const exportData = async () => {
    if (!usageData || !usageData.completionsUsage) {
      toast.error('Não há dados para exportar');
      return;
    }
    
    try {
      const { completionsUsage } = usageData;
      
      // Exportar dados por modelo
      const modelCsv = [
        'Modelo,Input Tokens,Output Tokens,Tokens Cacheados,Requisições,Eficiência',
        ...completionsUsage.byModel.map(model => 
          `${model.name},${model.input_tokens},${model.output_tokens},${model.input_cached_tokens},${model.requests},${model.efficiency}%`
        )
      ].join('\n');
      
      // Exportar dados por data
      const dateCsv = [
        'Data,Input Tokens,Output Tokens,Tokens Cacheados,Requisições',
        ...completionsUsage.byDate.map(date => 
          `${date.date},${date.input_tokens},${date.output_tokens},${date.input_cached_tokens},${date.requests}`
        )
      ].join('\n');
      
      // Criar blob com os dados
      const blob = new Blob([
        `# Dados de uso da OpenAI - Completions\n`,
        `# Data de exportação: ${new Date().toISOString()}\n\n`,
        `# POR MODELO\n${modelCsv}\n\n`,
        `# POR DATA\n${dateCsv}\n\n`,
        `# TOTAIS\n`,
        `Input Tokens,${completionsUsage.total.input_tokens}\n`,
        `Output Tokens,${completionsUsage.total.output_tokens}\n`,
        `Tokens Cacheados,${completionsUsage.total.input_cached_tokens}\n`,
        `Requisições,${completionsUsage.total.requests}\n`,
        `Eficiência,${completionsUsage.total.efficiency}%\n`
      ], { type: 'text/csv' });
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openai-completions-usage-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 0);
      
      toast.success('Dados exportados com sucesso', {
        description: 'O download do arquivo deve começar automaticamente'
      });
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      toast.error('Erro ao exportar dados', {
        description: err instanceof Error ? err.message : 'Não foi possível exportar os dados'
      });
    }
  };

  /**
   * Função para processar os dados de completions vindo da resposta da API
   * @param apiData Dados brutos da API
   * @returns Dados processados para uso no frontend
   */
  const processCompletionsData = (apiData: any[] = []) => {
    try {
      console.log('Processando dados brutos da API de completions:', 
        !apiData.length ? 'nenhum dado recebido' : `${apiData.length} registros recebidos`);
      
      if (!apiData || !apiData.length) {
        console.warn('⚠️ Nenhum dado recebido da API para processar');
        return createEmptyCompletionsData();
      }
      
      // Mapear os resultados por data
      const resultsByDate = new Map();
      // Mapear os resultados por modelo
      const resultsByModel = new Map();
      
      // Inicializar totais
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalInputCachedTokens = 0;
      let totalInputAudioTokens = 0;
      let totalOutputAudioTokens = 0;
      let totalRequests = 0;
      
      // Processar cada registro da API
      apiData.forEach(item => {
        // Verificar se o registro tem um timestamp válido
        if (!item.start_time) {
          console.warn('⚠️ Registro sem timestamp encontrado, ignorando:', item);
          return;
        }
        
        // Converter timestamp para data no formato YYYY-MM-DD
        const date = new Date(item.start_time * 1000);
        const dateKey = date.toISOString().split('T')[0];
        
        // Debug para verificar conversão de timestamp para data
        console.log(`Timestamp ${item.start_time} convertido para data ${dateKey}`);
        
        // Atualizar resultados por data
        if (!resultsByDate.has(dateKey)) {
          resultsByDate.set(dateKey, {
            date: dateKey,
            input_tokens: 0,
            output_tokens: 0,
            input_cached_tokens: 0,
            input_audio_tokens: 0,
            output_audio_tokens: 0,
            requests: 0
          });
        }
        
        const dateResult = resultsByDate.get(dateKey);
        dateResult.input_tokens += (item.input_tokens || 0);
        dateResult.output_tokens += (item.output_tokens || 0);
        dateResult.input_cached_tokens += (item.input_cached_tokens || 0);
        dateResult.input_audio_tokens += (item.input_audio_tokens || 0);
        dateResult.output_audio_tokens += (item.output_audio_tokens || 0);
        dateResult.requests += (item.num_model_requests || 0);
        
        // Atualizar resultados por modelo
        const modelKey = item.model || 'desconhecido';
        if (!resultsByModel.has(modelKey)) {
          resultsByModel.set(modelKey, {
            name: modelKey,
            input_tokens: 0,
            output_tokens: 0,
            input_cached_tokens: 0,
            input_audio_tokens: 0,
            output_audio_tokens: 0,
            requests: 0
          });
        }
        
        const modelResult = resultsByModel.get(modelKey);
        modelResult.input_tokens += (item.input_tokens || 0);
        modelResult.output_tokens += (item.output_tokens || 0);
        modelResult.input_cached_tokens += (item.input_cached_tokens || 0);
        modelResult.input_audio_tokens += (item.input_audio_tokens || 0);
        modelResult.output_audio_tokens += (item.output_audio_tokens || 0);
        modelResult.requests += (item.num_model_requests || 0);
        
        // Atualizar totais gerais
        totalInputTokens += (item.input_tokens || 0);
        totalOutputTokens += (item.output_tokens || 0);
        totalInputCachedTokens += (item.input_cached_tokens || 0);
        totalInputAudioTokens += (item.input_audio_tokens || 0);
        totalOutputAudioTokens += (item.output_audio_tokens || 0);
        totalRequests += (item.num_model_requests || 0);
      });
      
      // Calcular eficiência para cada modelo
      resultsByModel.forEach(model => {
        model.efficiency = calculateEfficiency(model.input_tokens, model.output_tokens);
      });
      
      // Eficiência total
      const totalEfficiency = calculateEfficiency(totalInputTokens, totalOutputTokens);
      
      // Log detalhado para diagnóstico
      console.log(`Processamento concluído: ${resultsByDate.size} dias, ${resultsByModel.size} modelos`);
      console.log("Todas as datas processadas:", [...resultsByDate.keys()].sort().join(', '));
      
      // Ordenar datas para exibição cronológica
      const byDateSorted = Array.from(resultsByDate.values()).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Ordenar modelos por uso (tokens) para destacar os mais usados
      const byModelSorted = Array.from(resultsByModel.values()).sort((a, b) => {
        return (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens);
      });
      
      // Retornar dados processados
      return {
        byDate: byDateSorted,
        byModel: byModelSorted,
        total: {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          input_cached_tokens: totalInputCachedTokens,
          input_audio_tokens: totalInputAudioTokens,
          output_audio_tokens: totalOutputAudioTokens,
          requests: totalRequests,
          efficiency: totalEfficiency
        }
      };
    } catch (error) {
      console.error('❌ Erro ao processar dados de completions:', error);
      return createEmptyCompletionsData();
    }
  };

  /**
   * Busca e atualiza especificamente os dados do dia atual (hoje)
   * Isso executa uma chamada otimizada que busca apenas o dia de hoje
   */
  // Efeito para buscar dados quando o componente é montado
  useEffect(() => {
    // Se não tiver dados no cache, buscar do servidor
    if (!usageData) {
      fetchData();
    }
    // Não incluir usageData como dependência para evitar atualizações automáticas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calcular custos dos últimos 7 dias
  function calculateLast7DaysCosts(costData: any[]): number {
    if (!costData || !Array.isArray(costData) || costData.length === 0) {
      return 0;
    }
    
    // Usar UTC para consistência com a API da OpenAI
    const now = new Date();
    
    // Data de início: início do dia 7 dias atrás (incluindo hoje)
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0));
    
    // Data de fim: final do dia de hoje
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    
    // Timestamp para comparação
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    
    console.log(`Calculando custos para os últimos 7 dias: ${startDate.toISOString()} até ${endDate.toISOString()}`);
    
    // Usar um Set para rastrear timestamps já processados e evitar duplicação
    const processedBuckets = new Set<number>();
    
    // Total de custos
    let totalCost = 0;
    
    // Processar cada item, verificando se está dentro do período
    for (const item of costData) {
      // Verificar se o bucket está dentro do período desejado
      const bucketStart = item.bucket?.start_time;
      if (!bucketStart || typeof bucketStart !== 'number') continue;
      
      // Já processou este bucket? Pular para evitar duplicação
      if (processedBuckets.has(bucketStart)) continue;
      
      // Adicionar ao conjunto de buckets processados
      processedBuckets.add(bucketStart);
      
      // Verificar se o bucket está dentro do período de 7 dias
      if (bucketStart >= startTimestamp && bucketStart <= endTimestamp) {
        // Adicionar ao custo total com verificação de tipo
        if (item.amount?.value) {
          const value = typeof item.amount.value === 'number' 
            ? item.amount.value 
            : parseFloat(item.amount.value || '0');
          
          // Evitar NaN
          if (!isNaN(value)) {
            totalCost += value;
          }
        }
      }
    }
    
    // Arredondar para 2 casas decimais
    totalCost = Math.round(totalCost * 100) / 100;
    
    console.log(`Total de custos calculados para os últimos 7 dias: $${totalCost.toFixed(2)}`);
    
    return totalCost;
  }

  return {
    usageData,
    isLoading,
    error,
    refreshData: fetchData,
    syncCompletionsData,
    syncCostData,
    syncTodayData,
    exportData
  };
} 