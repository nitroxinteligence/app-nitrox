"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { 
  RefreshCw, AlertCircle, DollarSign, BarChart3, ChevronRight,
  CreditCard, Zap, Download, Upload, Target, Clock, Eye, EyeOff, Loader2,
  Calendar, ChevronDown, ChevronUp, Info, ArrowUpDown, Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import useOpenAIUsage from '@/hooks/useOpenAIUsage'
import { formatCurrency } from '@/lib/utils'
import UsageCard from '@/components/usage/UsageCard'
import UsageChart from '@/components/usage/UsageChart'
import ModelUsageTable from '@/components/usage/ModelUsageTable'
import TokenDistributionCard from '@/components/usage/TokenDistributionCard'
import EfficiencyCard from '@/components/usage/EfficiencyCard'
import CompletionsModelTable from '@/components/usage/CompletionsModelTable'
import CompletionsDateTable from '@/components/usage/CompletionsDateTable'
import MetricsAreaChart from '@/components/usage/MetricsAreaChart'

// Define the interface for MetricsData (if it's defined in this file)
interface MetricsData {
  inputTokens: number[];
  outputTokens: number[];
  requisicoes: number[];
  totalCosts: number[];
  dates: string[];
}

// Define interface for OpenAIUsageSummary
interface OpenAIUsageSummary {
  subscription: any | null;
  currentMonth: any | null;
  currentMonthTotal: number;
  previousMonth: any | null;
  previousMonthTotal: number;
  months: any[];
  completionsUsage: {
    byDate: Array<{
      date: string;
      input_tokens: number;
      output_tokens: number;
      input_cached_tokens: number;
      requests: number;
    }>;
    byModel: Array<{
      name: string;
      input_tokens: number;
      output_tokens: number;
      input_cached_tokens: number;
      requests: number;
      efficiency: number;
    }>;
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
      byDate: Array<{
        date: string;
        amount_value: number | string;
        amount_currency: string;
      }>;
      total: number;
      last7days: number;
      last30days: number;
    };
  };
}

export default function CreditsPage() {
  const {
    usageData,
    isLoading,
    error,
    refreshData,
    syncCompletionsData,
    syncCostData,
    exportData,
    syncTodayData
  } = useOpenAIUsage()
  
  const [activeSection, setActiveSection] = useState<'model' | 'date'>('model')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [costSyncInProgress, setCostSyncInProgress] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | '7d' | '30d' | '90d'>('7d')
  const initialLoadDoneRef = useRef(false);
  const [dataReady, setDataReady] = useState(false);
  
  // Carregar timestamp de última atualização do localStorage
  useEffect(() => {
    try {
      const lastSyncTimestampStr = localStorage.getItem('siaflow_completions_last_updated');
      if (lastSyncTimestampStr) {
        const lastSyncTimestamp = parseInt(lastSyncTimestampStr);
        if (!isNaN(lastSyncTimestamp)) {
          setLastSyncTime(new Date(lastSyncTimestamp));
        }
      }
    } catch (e) {
      console.warn('Erro ao ler timestamp de sincronização do localStorage:', e);
    }
  }, []);
  
  // Função unificada para sincronização eficiente de todos os dados
  const syncAllData = async (options = { showToast: true, isInitialLoad: false }) => {
    // Se for uma sincronização manual (botão), mostrar indicadores visuais
    if (!options.isInitialLoad) {
      setSyncInProgress(true);
      setCostSyncInProgress(true);
      setDataReady(false);
      
      if (options.showToast) {
        toast.loading('Sincronizando dados...', {
          id: 'sync-data',
          description: 'Recuperando informações atualizadas da API OpenAI'
        });
      }
    }

    // CARREGAMENTO INSTANTÂNEO - Verificar se temos dados em cache local
    try {
      const cachedDataStr = localStorage.getItem('siaflow_completions_data');
      if (cachedDataStr && options.isInitialLoad) {
        try {
          const cachedData = JSON.parse(cachedDataStr);
          if (cachedData && cachedData.completionsUsage) {
            console.log('🚀 Usando dados em cache para exibição instantânea');
            // Usar temporariamente os dados em cache enquanto carregamos dados frescos
            if (!dataReady) {
              setDataReady(true);
            }
          }
        } catch (e) {
          console.warn('⚠️ Erro ao processar dados em cache:', e);
        }
      }
    } catch (e) {
      // Ignorar erros de acesso ao localStorage
    }

    // Definir um timeout CURTO para garantir que a interface seja mostrada rapidamente
    // em caso de falha de carregamento
    if (options.isInitialLoad) {
      setTimeout(() => {
        if (!dataReady) {
          console.log('⏱️ Timeout de carregamento atingido, exibindo interface de fallback...');
          setDataReady(true);
        }
      }, 2000); // Mostrar a interface após 2 segundos se os dados não carregarem
    }

    try {
      console.log(`🔄 Iniciando sincronização${options.isInitialLoad ? ' inicial' : ' completa'} de dados...`);
      
      // NOVA IMPLEMENTAÇÃO: Carregar todos os dados de uma vez
      console.log('Carregando TODOS os dados simultaneamente...');
      
      // 1. Criar um objeto para armazenar todos os resultados
      const results = {
        basicData: null,
        todayData: null,
        historicalData: null,
        costData: null
      };
      
      // 2. Carregar todos os dados em paralelo
      const [basicData, todayData, historicalData, costData] = await Promise.all([
        // Dados básicos
        refreshData().catch(err => {
          console.warn('⚠️ Falha ao carregar dados básicos:', err);
          return null as any;
        }),
        
        // Dados específicos de hoje
        syncTodayData().catch(err => {
          console.warn('⚠️ Falha ao carregar dados do dia atual:', err);
          return null as any;
        }),
        
        // Dados históricos
        syncCompletionsData().catch(err => {
          console.warn('⚠️ Falha ao carregar dados históricos:', err);
          return null as any;
        }),
        
        // Dados de custos
        syncCostData().catch(err => {
          console.warn('⚠️ Falha ao carregar dados de custos:', err);
          return null as any;
        })
      ]);
      
      // 3. Armazenar todos os resultados
      results.basicData = basicData;
      results.todayData = todayData;
      results.historicalData = historicalData;
      results.costData = costData;
      
      // 4. Agora que temos todos os dados, mostrar a interface
      if (!dataReady) {
        console.log('✅ Todos os dados carregados simultaneamente, exibindo interface completa...');
        setDataReady(true);
      }
      
      // 5. Registrar horário da sincronização bem-sucedida
      const now = new Date();
      setLastSyncTime(now);
      
      // 6. Salvar timestamp no localStorage
      try {
        localStorage.setItem('siaflow_completions_last_updated', now.getTime().toString());
      } catch (storageError) {
        console.warn('⚠️ Não foi possível salvar o timestamp:', storageError);
      }
      
      // 7. Calcular estatísticas da sincronização
      const success = Object.values(results).filter(Boolean).length;
      const total = Object.keys(results).length;
      console.log(`✓ Sincronização concluída: ${success}/${total} operações bem-sucedidas`);
      
      // 8. Notificar o usuário sobre o resultado (apenas para sincronizações manuais)
      if (!options.isInitialLoad && options.showToast) {
        if (success === total || success >= 3) { // Pelo menos 3 operações bem-sucedidas
          toast.success('Dados sincronizados com sucesso!', {
            id: 'sync-data',
            description: `Última atualização: ${now.toLocaleTimeString()}`
          });
        } else if (success > 0) {
          toast.warning('Sincronização parcial concluída', {
            id: 'sync-data',
            description: `${success}/${total} operações concluídas. Alguns dados podem estar incompletos.`
          });
        } else {
          throw new Error('Falha em todas as operações de sincronização');
        }
      }
      
      // 9. Limpar indicadores visuais
      setSyncInProgress(false);
      setCostSyncInProgress(false);
      
      return results;
      
    } catch (error) {
      console.error('❌ Erro na sincronização de dados:', error);
      
      if (options.showToast) {
        toast.error('Falha na sincronização dos dados', {
          id: 'sync-data',
          description: error instanceof Error 
            ? error.message 
            : 'Erro de conexão com a API. Verifique o console para mais detalhes.'
        });
      }
      
      // Mesmo com erro, garantir que a interface esteja disponível
      if (!dataReady) {
        setDataReady(true);
      }
      
      // Remover indicadores de sincronização
      setSyncInProgress(false);
      setCostSyncInProgress(false);
      
      return null;
    }
  };

  // Efeito para carregamento inicial dos dados (usa ref para executar apenas uma vez)
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadDoneRef.current) return;
      initialLoadDoneRef.current = true;
      
      setDataReady(false); // Definindo que os dados não estão prontos
      
      try {
        // Usar a função unificada, mas com opção de carregamento inicial
        await syncAllData({ showToast: false, isInitialLoad: true });
      } catch (err) {
        console.error('Erro no processo de carregamento inicial:', err);
        
        // Mesmo com erro, sempre marcar os dados como prontos para evitar tela em branco
        setDataReady(true);
        
        // Mostrar toast somente se os dados não estiverem prontos após erro
        if (!dataReady) {
          toast.error('Falha ao carregar dados iniciais', {
            description: 'Carregando com dados limitados. Tente atualizar manualmente.'
          });
        }
      }
    };
    
    loadInitialData();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efeito separado para o intervalo de atualização - sincronização automática a cada hora
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('🔄 Sincronizando dados automaticamente (intervalo de 1h)...');
      
      // Usar a função unificada, mas sem mostrar toasts para atualizações automáticas
      syncAllData({ showToast: false, isInitialLoad: false }).catch(err => {
        console.error('Erro ao sincronizar dados automaticamente:', err);
      });
      
    }, 60 * 60 * 1000); // 1 hora
    
    return () => clearInterval(intervalId);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Função para o botão Sincronizar Dados
  const handleSyncAllData = async () => {
    await syncAllData({ showToast: true, isInitialLoad: false });
  };

  // Verificar se há dados de completions válidos - modificado para não depender de input_tokens
  const hasCompletionsData = usageData?.completionsUsage !== undefined && usageData?.completionsUsage !== null;
  
  // Formatar o horário da última sincronização
  const formatLastSyncTime = () => {
    if (!lastSyncTime) return null;
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastSyncTime);
  };

  // Preparar dados para o gráfico de área
  const metricsAreaData = () => {
    if (!usageData?.completionsUsage?.byDate || !Array.isArray(usageData.completionsUsage.byDate)) {
      return {
        inputTokens: [],
        outputTokens: [],
        requisicoes: [],
        totalCosts: [],
        dates: []
      };
    }

    console.log('============ DEBUGGING EVOLUÇÃO DE MÉTRICAS ============');
    
    // Obter a data atual em UTC e garantir que é o início do dia
    const now = new Date();
    const todayString = now.toISOString().split('T')[0]; // YYYY-MM-DD no formato local
    
    // Hoje em formato UTC para alinhamento com API da OpenAI
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayUTCString = todayUTC.toISOString().split('T')[0]; // YYYY-MM-DD em UTC
    
    console.log(`Data atual (local): ${todayString}`);
    console.log(`Data atual (UTC): ${todayUTCString}`);
    
    // SOLUÇÃO ASSERTIVA: Gerar explicitamente datas diárias para os últimos 31 dias
    const dates31Days: string[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      // Formatar como YYYY-MM-DD
      const dateFormatted = date.toISOString().split('T')[0];
      dates31Days.push(dateFormatted);
    }
    
    // Verificar se o dia atual está presente
    console.log(`Dia atual (${todayString}) presente na lista?: ${dates31Days.includes(todayString)}`);
    console.log(`Primeira data: ${dates31Days[0]}, Última data: ${dates31Days[dates31Days.length-1]}`);
    
    // Criar array explícito de resultados
    const resultData = dates31Days.map(date => {
      // Procurar por esta data nos dados existentes
      const existingData = usageData.completionsUsage?.byDate?.find(item => item.date === date);
      
      // Se encontrou dados existentes, usar eles
      if (existingData) {
        return {
          date: date,
          input_tokens: existingData.input_tokens || 0,
          output_tokens: existingData.output_tokens || 0,
          input_cached_tokens: existingData.input_cached_tokens || 0,
          requests: existingData.requests || 0
        };
      }
      
      // Se não encontrou, criar entrada com zeros
      return {
        date: date,
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        requests: 0
      };
    });
    
    // Usar dados de hoje de dailyStats se disponíveis (sobreescrevendo quaisquer outros)
    if (usageData.completionsUsage?.dailyStats && 
        Object.keys(usageData.completionsUsage?.dailyStats || {}).length > 0) {
      
      // Encontrar o índice do dia atual
      const todayIndex = resultData.findIndex(item => item.date === todayString);
      
      if (todayIndex >= 0) {
        console.log(`Encontrado índice para o dia atual (${todayString}) na posição ${todayIndex}`);
        console.log('Atualizando com dados mais recentes de dailyStats');
        
        resultData[todayIndex] = {
          ...resultData[todayIndex],
          input_tokens: usageData.completionsUsage?.dailyStats?.input_tokens || 0,
          output_tokens: usageData.completionsUsage?.dailyStats?.output_tokens || 0,
          input_cached_tokens: usageData.completionsUsage?.dailyStats?.input_cached_tokens || 0,
          requests: usageData.completionsUsage?.dailyStats?.requests || 0
        };
      } else {
        console.warn(`ALERTA: Não foi possível encontrar o dia atual (${todayString}) na lista de datas`);
      }
    }
    
    // Obter dados de custos
    const costsByDate = usageData.completionsUsage?.actualCosts?.byDate || [];
    
    // Criar mapa de custo por data
    const costMap = new Map();
    
    // Preencher o mapa com os custos disponíveis
    if (costsByDate.length > 0) {
      console.log(`Processando ${costsByDate.length} registros de custos`);
      
      costsByDate.forEach(costEntry => {
        const costValue = typeof costEntry.amount_value === 'string' 
          ? parseFloat(costEntry.amount_value) 
          : (costEntry.amount_value || 0);
        
        costMap.set(costEntry.date, costValue);
      });
    }
    
    // Adicionar custo de hoje se disponível nos dailyStats
    if (usageData.completionsUsage?.dailyStats?.totalCost !== undefined) {
      const todayCost = typeof usageData.completionsUsage.dailyStats.totalCost === 'string'
        ? parseFloat(usageData.completionsUsage.dailyStats.totalCost)
        : usageData.completionsUsage.dailyStats.totalCost;
      
      console.log(`Definindo custo de hoje (${todayString}) para $${todayCost.toFixed(4)}`);
      costMap.set(todayString, todayCost);
    }
    
    // Garantir que todas as datas tenham um custo (mesmo que zero)
    resultData.forEach(item => {
      if (!costMap.has(item.date)) {
        costMap.set(item.date, 0);
      }
    });
    
    // DIAGNÓSTICO FINAL: Verificar todos os dados antes de retornar
    console.log('--------- Diagnóstico final dos dados do gráfico ---------');
    console.log(`Total de dias: ${resultData.length}`);
    console.log(`Último dia: ${resultData[resultData.length - 1].date} (deve ser ${todayString})`);
    
    // Ajuste FINAL: garantir que a última data é HOJE, independente de timezone
    if (resultData[resultData.length - 1].date !== todayString) {
      console.warn(`CORREÇÃO DE EMERGÊNCIA: Forçando última data para o dia atual (${todayString})`);
      resultData[resultData.length - 1].date = todayString;
    }
    
    // Gerar estrutura final de dados para o gráfico
    const result = {
      inputTokens: resultData.map(d => d.input_tokens || 0),
      outputTokens: resultData.map(d => d.output_tokens || 0),
      requisicoes: resultData.map(d => d.requests || 0),
      totalCosts: resultData.map(d => costMap.get(d.date) || 0),
      dates: resultData.map(d => d.date)
    };
    
    // Verificação final
    console.log(`Datas finais: primeiro=${result.dates[0]}, último=${result.dates[result.dates.length-1]}`);
    console.log('============ FIM DEBUGGING ============');
    
    return result;
  };

  const metricsAreaDataResult = metricsAreaData();

  // Auxiliar para garantir a exibição dos dados de hoje
  const getTodayTokensDisplay = () => {
    // Obter a data em UTC para garantir alinhamento com a API
    const utcNow = new Date();
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    // Verificar se temos dados de hoje em dailyStats
    if (usageData?.completionsUsage?.dailyStats) {
      const dailyStats = usageData.completionsUsage.dailyStats;
      return (
        (dailyStats.input_tokens || 0) + 
        (dailyStats.output_tokens || 0)
      ).toLocaleString();
    }
    
    // Ou tentar encontrar nos dados históricos
    if (usageData?.completionsUsage?.byDate) {
      const todayData = usageData.completionsUsage.byDate.find(item => item.date === todayString);
      if (todayData) {
        return (
          (todayData.input_tokens || 0) + 
          (todayData.output_tokens || 0)
        ).toLocaleString();
      }
    }
    
    // Se não encontrar nada, mostrar 0
    return "0";
  };
  
  // Auxiliar para obter requisições de hoje
  const getTodayRequestsDisplay = () => {
    // Obter a data em UTC para garantir alinhamento com a API
    const utcNow = new Date();
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    // Verificar se temos dados de hoje em dailyStats
    if (usageData?.completionsUsage?.dailyStats) {
      return (usageData.completionsUsage.dailyStats.requests || 0).toLocaleString();
    }
    
    // Ou tentar encontrar nos dados históricos
    if (usageData?.completionsUsage?.byDate) {
      const todayData = usageData.completionsUsage.byDate.find(item => item.date === todayString);
      if (todayData) {
        return (todayData.requests || 0).toLocaleString();
      }
    }
    
    // Se não encontrar nada, mostrar 0
    return "0";
  };
  
  // Auxiliar para obter custos de hoje
  const getTodayCostDisplay = () => {
    // Obter a data em UTC para garantir alinhamento com a API
    const utcNow = new Date();
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    // Verificar se temos cost em dailyStats (prioridade)
    if (usageData?.completionsUsage?.dailyStats?.totalCost !== undefined) {
      const costValue = typeof usageData.completionsUsage.dailyStats.totalCost === 'string' 
        ? parseFloat(usageData.completionsUsage.dailyStats.totalCost) 
        : usageData.completionsUsage.dailyStats.totalCost;
      return `$${costValue.toFixed(2)}`;
    }
    
    // Ou tentar encontrar nos custos atuais
    if (usageData?.completionsUsage?.actualCosts?.byDate) {
      const todayCost = usageData.completionsUsage.actualCosts.byDate.find(
        item => item.date === todayString
      );
      
      if (todayCost?.amount_value) {
        const costValue = typeof todayCost.amount_value === 'string'
          ? parseFloat(todayCost.amount_value)
          : todayCost.amount_value;
        return `$${costValue.toFixed(2)}`;
      }
    }
    
    // Fallback para estimativa ou 0
    return `$${(usageData?.completionsUsage?.costEstimates?.daily || 0).toFixed(2)}`;
  };
  
  // Executar manualmente a sincronização de dados de hoje quando necessário
  useEffect(() => {
    // Obter a data atual em UTC
    const now = new Date();
    const utcNow = new Date(now.getTime());
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    // Se temos dados básicos mas não temos dados do dia atual (usando UTC), tentar sincronizar
    if (usageData && 
        (!usageData.completionsUsage?.dailyStats || 
         !usageData.completionsUsage.byDate?.some(item => item.date === todayString))) {
      console.log('Detectada ausência de dados do dia atual em UTC, tentando sincronizar...');
      console.log(`Data UTC que estamos procurando: ${todayString}`);
      syncTodayData().catch(err => {
        console.warn('Falha ao tentar sincronizar dados de hoje:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageData]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] text-white">
      <div className="fixed inset-0 w-full h-full bg-[#0A0A0B] -z-10" />
      
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-normal tracking-tight text-white">
                <span className="bg-gradient-to-r from-[#58E877] to-[#E8F3ED] bg-clip-text text-transparent">
                  Monitoramento OpenAI
                </span>
              </h1>
              <p className="text-[#7f7f7f] mt-1">
                Acompanhe o uso e os custos da API da OpenAI
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-[#7f7f7f] hover:text-white hover:bg-gray-800/50 relative group"
                onClick={exportData}
                disabled={isLoading || !usageData}
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Exportar para CSV</span>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-sm text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Exportar para CSV
                </div>
              </Button>

              <Button 
                  variant="outline"
                  size="sm"
                className="bg-[#111114] text-white border-[#4f4f4f] hover:bg-[#222224] hover:text-white"
                onClick={handleSyncAllData}
                disabled={syncInProgress || costSyncInProgress}
              >
                {syncInProgress || costSyncInProgress ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar Dados
                    </>
                  )}
              </Button>
            </div>
          </div>
          
          <Separator className="bg-[#272727]" />
        </div>

        {/* Errors and notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive" className="bg-red-900/10 border border-red-500/30 text-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao carregar dados</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estado de carregamento inicial */}
        {!dataReady ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-[#0f0f0f] border-[#272727] overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24 bg-[#222224]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-full bg-[#222224]" />
                  <Skeleton className="h-4 w-20 mt-2 bg-[#222224]" />
                </CardContent>
              </Card>
            ))}
            <div className="col-span-full flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#5DE97B]" />
              <span className="ml-3 text-[#5DE97B]">Atualizando dados de uso e custos...</span>
            </div>
        </div>
        ) : isLoading ? (
          // Esqueletos de carregamento padrão
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-[#0f0f0f] border-[#272727] overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24 bg-[#222224]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-full bg-[#222224]" />
                  <Skeleton className="h-4 w-20 mt-2 bg-[#222224]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          // Estado de erro - já tratado acima
          <div className="py-8 text-center">
            <p className="text-[#7f7f7f]">Não foi possível carregar os dados.</p>
          </div>
        ) : !usageData ? (
          // Estado vazio
          <div className="py-8 text-center">
            <p className="text-[#7f7f7f]">Nenhum dado disponível.</p>
          </div>
        ) : (
          // Dados carregados com sucesso
          <>
            {/* Seção de resumo */}
            <section className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h2 className="text-xl font-semibold mb-2 md:mb-0">Resumo de Utilização da API</h2>
                
                {lastSyncTime && (
                  <div className="flex items-center text-xs text-[#878787]">
                    <Clock className="h-3 w-3 mr-1" />
                    Última sincronização: {formatLastSyncTime()}
                  </div>
                )}
              </div>
              
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <UsageCard
                  title="Total de Tokens"
                  value={getTodayTokensDisplay()}
                  description={`Tokens processados pela API hoje`}
                  icon={<Zap className="h-4 w-4" />}
                  className="bg-[#0f0f0f] border-[#272727] hover:border-[#323234] transition-colors duration-200"
                />
                
                <UsageCard
                  title="Total de Requisições"
                  value={getTodayRequestsDisplay()}
                  description="Chamadas à API realizadas hoje"
                  icon={<Target className="h-4 w-4" />}
                  className="bg-[#0f0f0f] border-[#272727] hover:border-[#323234] transition-colors duration-200"
                />
                
                <UsageCard
                  title="Custos Totais Hoje"
                  value={getTodayCostDisplay()}
                  description="Custos da API OpenAI hoje"
                  icon={<CreditCard className="h-4 w-4" />}
                  className="bg-[#0f0f0f] border-[#272727] hover:border-[#323234] transition-colors duration-200"
                  valueClassName="text-[#5DE97B]"
                />
                
                <UsageCard
                  title="Custos Totais 31 dias"
                  value={
                    usageData?.completionsUsage?.actualCosts?.last30days !== undefined
                      ? `$${Number(usageData.completionsUsage.actualCosts.last30days).toFixed(2)}`
                      : "Não disponível"
                  }
                  description="Custos dos últimos 31 dias"
                  icon={<DollarSign className="h-4 w-4" />}
                  className="bg-[#0f0f0f] border-[#272727] hover:border-[#323234] transition-colors duration-200"
                  valueClassName="text-[#5DE97B]"
                />
              </div>
            </section>
            
            {/* Seção de gráficos/visualizações */}
            {hasCompletionsData ? (
              <section className="mb-8">
                <div className="grid gap-6 lg:grid-cols-2">
                  <TokenDistributionCard 
                    inputTokens={usageData?.completionsUsage?.total?.input_tokens || 0}
                    outputTokens={usageData?.completionsUsage?.total?.output_tokens || 0}
                    cachedTokens={usageData?.completionsUsage?.total?.input_cached_tokens || 0}
                  />
                  
                  <Card className="bg-[#0f0f0f] border-[#222224] overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-xl font-medium text-gray-100">Uso por Modelos LLMs</CardTitle>
                      <CardDescription className="text-[#adadad]">
                        Distribuição de uso por modelos da API
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {usageData?.completionsUsage?.byModel && usageData?.completionsUsage?.byModel.length > 0 ? (
                        <ScrollArea className="h-[320px] pr-4">
                          <div className="space-y-4">
                            {/* Mostrar todos os modelos ao invés de limitar a 5 */}
                            {usageData.completionsUsage.byModel.map((model, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-[180px]" title={model.name}>
                                    {model.name}
                                  </span>
                                  <span className="text-sm text-[#c4c4c4]">
                                    {model.input_tokens + model.output_tokens > 0 
                                      ? `${(model.input_tokens + model.output_tokens).toLocaleString()} tokens`
                                      : `${model.requests} chamadas`
                                    }
                                  </span>
                                </div>
                                <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#5DE97B] to-[#088737]" 
                                    style={{ 
                                      width: `${Math.min(100, Math.max(5, 
                                        calculateModelPercentage(model, usageData?.completionsUsage?.byModel || [])
                                      ))}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40">
                          <BarChart3 className="h-10 w-10 text-[#272727] mb-2" />
                          <p className="text-[#878787]">Nenhum dado de modelo disponível</p>
                        </div>
                      )}
                      
                      {usageData?.completionsUsage?.byModel && usageData?.completionsUsage?.byModel.length > 0 && (
                        <div className="pt-4 flex justify-between text-xs text-[#878787]">
                          <span>{usageData.completionsUsage.byModel.length} modelos utilizados</span>
                          <span>
                            {usageData?.completionsUsage?.total?.requests || 0} chamadas totais
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </section>
            ) : (
              <section className="mb-8">
                <Card className="bg-[#0f0f0f] border-[#222224] overflow-hidden">
                  <div className="p-8 text-center text-[#7f7f7f]">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-600 opacity-50" />
                    <p className="text-lg font-medium text-gray-300">Nenhum dado de utilização da API encontrado</p>
                    <p className="mt-2 text-sm text-[#7f7f7f]">
                      Clique em "Sincronizar" no topo da página para buscar dados da API da OpenAI
                    </p>
                  </div>
              </Card>
              </section>
            )}
            
            {/* Métricas detalhadas */}
            {hasCompletionsData && (
              <section className="mb-8">
                <Card className="bg-[#0f0f0f] border-[#222224] overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                  <div>
                        <CardTitle className="text-lg font-medium text-gray-100">Métricas Detalhadas</CardTitle>
                        <CardDescription className="text-[#878787]">
                          Dados diretos da API OpenAI
                    </CardDescription>
                      </div>
                  </div>
                </CardHeader>
                  
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {/* Total de Tokens */}
                      <div className="bg-[#161616] p-4 rounded-md">
                        <p className="text-sm text-[#878787] mb-1">Total de Tokens</p>
                        <p className="text-xl font-medium">
                          {(
                            (usageData?.completionsUsage?.total?.input_tokens || 0) + 
                            (usageData?.completionsUsage?.total?.output_tokens || 0) + 
                            (usageData?.completionsUsage?.total?.input_cached_tokens || 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-[#161616] p-4 rounded-md">
                        <p className="text-sm text-[#878787] mb-1">Input Tokens</p>
                        <p className="text-xl font-medium">
                          {(usageData?.completionsUsage?.total?.input_tokens || 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-[#161616] p-4 rounded-md">
                        <p className="text-sm text-[#878787] mb-1">Output Tokens</p>
                        <p className="text-xl font-medium">
                          {(usageData?.completionsUsage?.total?.output_tokens || 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-[#161616] p-4 rounded-md">
                        <p className="text-sm text-[#878787] mb-1">Tokens Cacheados</p>
                        <p className="text-xl font-medium">
                          {(usageData?.completionsUsage?.total?.input_cached_tokens || 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-[#161616] p-4 rounded-md">
                        <p className="text-sm text-[#878787] mb-1">Requisições</p>
                        <p className="text-xl font-medium">
                          {(usageData?.completionsUsage?.total?.requests || 0).toString()}
                        </p>
                      </div>
                      
                      <div className="bg-[#161616] p-4 rounded-md">
                        <p className="text-sm text-[#878787] mb-1">Dias Monitorados</p>
                        <p className="text-xl font-medium">
                          {(usageData?.completionsUsage?.byDate.length || 0).toString()} dias
                        </p>
                      </div>
                    </div>
                    
                    {/* Seção de custos reais */}
                    {usageData?.completionsUsage?.actualCosts && (
                      <div className="mt-6 mb-6">
                        <Separator className="bg-[#272727] mb-4" />
                        <h3 className="text-lg font-medium mb-3">Custos Totais da API</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-[#161616] p-4 rounded-md">
                            <p className="text-sm text-[#878787] mb-1">Custo Total</p>
                            <p className="text-xl font-medium text-[#5DE97B]">
                              ${(usageData.completionsUsage.actualCosts.total || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-[#878787] mt-1">
                              Custo total acumulado
                            </p>
                          </div>
                          
                          <div className="bg-[#161616] p-4 rounded-md">
                            <p className="text-sm text-[#878787] mb-1">Últimos 7 dias</p>
                            <p className="text-xl font-medium text-[#5DE97B]">
                              ${(usageData.completionsUsage.actualCosts.last7days || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-[#878787] mt-1">
                              Custo dos últimos 7 dias
                            </p>
                          </div>
                          
                          <div className="bg-[#161616] p-4 rounded-md">
                            <p className="text-sm text-[#878787] mb-1">Últimos 30 dias</p>
                            <p className="text-xl font-medium text-[#5DE97B]">
                              ${(usageData.completionsUsage.actualCosts.last30days || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-[#878787] mt-1">
                              Custo dos últimos 30 dias
                            </p>
                          </div>
                        </div>
                        
                        {usageData.completionsUsage.actualCosts.byDate && usageData.completionsUsage.actualCosts.byDate.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-[#878787] mb-2">
                              <Info className="h-3 w-3 inline-block mr-1" />
                              Os custos reais são obtidos diretamente da API da OpenAI.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Gráfico de Área para Métricas */}
                    {metricsAreaDataResult.dates.length > 0 && (
                      <div className="mt-6">
                        <MetricsAreaChart data={metricsAreaDataResult} />
                    </div>
                  )}
                </CardContent>
              </Card>
              </section>
            )}
          </>
        )}
        
        {/* Footer */}
        <div className="pt-6">
          <Separator className="bg-[#272727] mb-6" />
          <div className="flex items-center justify-between text-xs text-[#272727]">
            <p>Dados atualizados automaticamente a cada 1 hora</p>
            <p>Última atualização: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Função para filtrar datas com base no período selecionado
function filterDatesByRange(dates: any[], range: string): any[] {
  if (!dates || dates.length === 0 || range === 'all') {
    return dates;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIsoString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

  // Verificar se o dia atual está presente nos dados
  const hasToday = dates.some(item => item.date === todayIsoString);
  
  // Cria uma cópia dos dados para não modificar o original
  let filteredDates = [...dates];
  
  // Filtrar datas conforme o período selecionado
  filteredDates = filteredDates.filter(item => {
    const itemDate = new Date(item.date);
    
    switch (range) {
      case 'today':
        return itemDate >= today;
      case '7d': {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return itemDate >= sevenDaysAgo;
      }
      case '30d': {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return itemDate >= thirtyDaysAgo;
      }
      case '90d': {
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        return itemDate >= ninetyDaysAgo;
      }
      default:
        return true;
    }
  });
  
  // Ordenar por data (mais antiga para mais recente)
  filteredDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return filteredDates;
}

// Função para calcular a porcentagem de uso de um modelo em relação ao total
function calculateModelPercentage(model: any, allModels: any[]): number {
  if (!model || !allModels || allModels.length === 0) {
    return 0;
  }
  
  // Calcular o total de tokens (input + output) de todos os modelos
  const totalTokens = allModels.reduce((sum, m) => 
    sum + (m.input_tokens || 0) + (m.output_tokens || 0), 0);
  
  if (totalTokens === 0) {
    // Se não houver tokens, tentar calcular com base nas requisições
    const totalRequests = allModels.reduce((sum, m) => sum + (m.requests || 0), 0);
    if (totalRequests === 0) return 0;
    return (model.requests / totalRequests) * 100;
  }
  
  // Calcular a porcentagem com base nos tokens totais deste modelo
  const modelTokens = (model.input_tokens || 0) + (model.output_tokens || 0);
  return (modelTokens / totalTokens) * 100;
}

function Cost7DaysCard({ usageData }: { usageData: OpenAIUsageSummary | null }) {
  // Obter os custos dos últimos 7 dias
  const cost7days = usageData?.completionsUsage?.actualCosts?.last7days || 0;
  
  return (
    <Card className="bg-[#0f0f0f] border-[#222224] overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-medium text-gray-100">Custos Totais 7 dias</CardTitle>
        <CardDescription className="text-[#adadad]">
          Custos dos últimos 7 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-[#5DE97B] mb-2 flex items-center">
            <DollarSign className="h-6 w-6 mr-1" />
            {cost7days.toFixed(2)}
          </div>
          <p className="text-[#878787]">Custos dos últimos 7 dias</p>
        </div>
      </CardContent>
    </Card>
  );
} 