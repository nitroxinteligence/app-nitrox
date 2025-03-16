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
  
  // Efeito para carregamento inicial dos dados (usa ref para executar apenas uma vez)
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadDoneRef.current) return;
      initialLoadDoneRef.current = true;
      
      setDataReady(false); // Definindo que os dados não estão prontos
      
      console.log('🔄 Realizando carregamento inicial de dados...');
      
      try {
        // Etapa 1: Buscar apenas dados básicos primeiro para garantir que a interface seja carregada
        console.log('Etapa 1: Carregando dados básicos...');
        await refreshData().catch(err => {
          console.warn('Aviso: Falha ao carregar dados básicos, continuando com dados locais:', err);
        });
        
        // Dar tempo para o estado ser atualizado
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Marcar os dados como prontos para mostrar a interface, mesmo que incompleta
        setDataReady(true);
        
        // Etapa 2: Carregar dados do dia atual com maior prioridade
        console.log('Etapa 2: Carregando especificamente dados do dia atual...');
        await syncTodayData().catch(err => {
          console.warn('Aviso: Falha ao sincronizar dados do dia atual, continuando com demais dados:', err);
        });
        
        // Pausa pequena para processamento
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Etapa 3: Carregar dados históricos em segundo plano
        console.log('Etapa 3: Carregando dados históricos em segundo plano...');
        Promise.all([
          syncCompletionsData().catch(err => {
            console.warn('Aviso: Falha ao sincronizar dados históricos:', err);
          }),
          syncCostData().catch(err => {
            console.warn('Aviso: Falha ao sincronizar dados de custos:', err);
          })
        ]).finally(() => {
          console.log('Carregamento de dados históricos e custos concluído');
        });
        
        // Registrar horário da sincronização
        const now = new Date();
        setLastSyncTime(now);
        try {
          localStorage.setItem('siaflow_completions_last_updated', now.getTime().toString());
        } catch (storageError) {
          console.warn('Não foi possível salvar o timestamp de sincronização:', storageError);
        }
        
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
    
    // Não incluímos usageData ou refreshData como dependências para evitar loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Efeito separado para o intervalo de atualização - sincronização automática a cada hora
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('🔄 Sincronizando dados automaticamente (intervalo de 1h)...');
      
      // Sincronização automática dos dados de Uso e Custos
      Promise.all([
        syncTodayData(), // Usar a função específica para dados de hoje para maior precisão
        syncCostData()
      ]).catch(err => {
        console.error('Erro ao sincronizar dados automaticamente:', err);
      });
      
    }, 60 * 60 * 1000); // 1 hora
    
    return () => clearInterval(intervalId);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sem dependências para executar apenas uma vez
  
  // Adicionar função específica para sincronizar apenas os dados do dia atual
  const handleSyncTodayData = async () => {
    setSyncInProgress(true);
    
    toast.loading('Sincronizando dados do dia atual...', {
      id: 'sync-today',
      description: 'Buscando os dados mais recentes do dia atual'
    });
    
    try {
      await syncTodayData();
      
      // Registrar o horário da sincronização bem-sucedida
      const now = new Date();
      setLastSyncTime(now);
      
      // Salvar o timestamp no localStorage também
      try {
        localStorage.setItem('siaflow_completions_last_updated', now.getTime().toString());
      } catch (storageError) {
        console.warn('Não foi possível salvar o timestamp de sincronização:', storageError);
      }
      
      toast.success('Dados de hoje atualizados com sucesso!', {
        id: 'sync-today',
        description: `Última atualização: ${now.toLocaleTimeString()}`
      });
    } catch (error) {
      console.error('❌ Erro ao sincronizar dados do dia atual:', error);
      
      // Extrair mensagem de erro mais detalhada da API quando disponível
      let errorMessage = error instanceof Error ? error.message : 'Erro de conexão com a API';
      let errorDescription = 'Verifique a conexão ou tente novamente mais tarde.';
      
      // Tentar extrair informações mais detalhadas de erros da OpenAI
      if (errorMessage.includes('OpenAI') || errorMessage.includes('API')) {
        try {
          // Tentar extrair o JSON do erro da OpenAI se estiver presente
          const openaiErrorMatch = errorMessage.match(/\{[\s\S]*\}/);
          if (openaiErrorMatch) {
            const errorJson = JSON.parse(openaiErrorMatch[0]);
            if (errorJson.error && errorJson.error.message) {
              errorDescription = `Erro da OpenAI: ${errorJson.error.message}`;
            }
          }
        } catch (e) {
          console.warn('Não foi possível extrair detalhes do erro da OpenAI:', e);
        }
      }
      
      toast.error('Falha na sincronização dos dados de hoje', {
        id: 'sync-today',
        description: errorDescription
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  // Função para sincronizar todos os dados (hoje, todos os dados e custos) em sequência
  const handleSyncAllData = async () => {
    setSyncInProgress(true);
    setCostSyncInProgress(true);
    
    toast.loading('Sincronizando todos os dados...', {
      id: 'sync-all',
      description: 'Atualizando dados de hoje, histórico e custos'
    });
    
    try {
      // Executar operações sequencialmente para garantir consistência
      console.log('Iniciando sincronização completa de dados...');
      
      // 1. Sincronizar dados históricos primeiro
      console.log('Passo 1: Sincronizando dados históricos...');
      await syncCompletionsData();
      
      // 2. Sincronizar dados de custos
      console.log('Passo 2: Sincronizando dados de custos...');
      await syncCostData();
      
      // 3. Sincronizar dados de hoje por último (mais importantes e para não serem sobrescritos)
      console.log('Passo 3: Sincronizando dados específicos de hoje...');
      await syncTodayData();
      
      // Registrar o horário da sincronização bem-sucedida
      const now = new Date();
      setLastSyncTime(now);
      
      // Salvar o timestamp no localStorage também
      try {
        localStorage.setItem('siaflow_completions_last_updated', now.getTime().toString());
      } catch (storageError) {
        console.warn('Não foi possível salvar o timestamp de sincronização:', storageError);
      }
      
      toast.success('Sincronização concluída com sucesso!', {
        id: 'sync-all',
        description: `Última atualização: ${now.toLocaleTimeString()}`
      });
    } catch (error) {
      console.error('❌ Erro na sincronização de dados:', error);
      
      toast.error('Falha na sincronização dos dados', {
        id: 'sync-all',
        description: error instanceof Error 
          ? error.message 
          : 'Erro de conexão com a API. Verifique o console para mais detalhes.'
      });
    } finally {
      setSyncInProgress(false);
      setCostSyncInProgress(false);
    }
  };

  const handleSyncCompletionsData = async () => {
    setSyncInProgress(true);
    
    toast.info('Sincronizando dados de completions...', {
      description: 'Este processo pode levar alguns segundos'
    });
    
    try {
      await syncCompletionsData();
      
      // Registrar o horário da sincronização bem-sucedida
      const now = new Date();
      setLastSyncTime(now);
      
      // Salvar o timestamp no localStorage também
      try {
        localStorage.setItem('siaflow_completions_last_updated', now.getTime().toString());
      } catch (storageError) {
        console.warn('Não foi possível salvar o timestamp de sincronização:', storageError);
      }
      
      toast.success('Dados sincronizados com sucesso!', {
        description: `Última atualização: ${now.toLocaleTimeString()}`
      });
    } catch (error) {
      console.error('❌ Erro ao sincronizar dados de completions:', error);
      toast.error('Falha na sincronização dos dados', {
        description: error instanceof Error 
          ? error.message 
          : 'Erro de conexão com a API. Verifique o console para mais detalhes.'
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleSyncCostData = async () => {
    setCostSyncInProgress(true);
    
    try {
      await syncCostData();
      // A função já lida com atualizações de estado e notificações
    } catch (error) {
      console.error('Erro ao obter dados de custos reais:', error);
      toast.error('Falha ao obter dados de custos', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setCostSyncInProgress(false);
    }
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
  const prepareMetricsAreaData = () => {
    if (!usageData?.completionsUsage?.byDate || !Array.isArray(usageData.completionsUsage.byDate)) {
      return {
        inputTokens: [],
        outputTokens: [],
        requisicoes: [],
        totalCosts: [],
        dates: []
      };
    }

    // Usar data em UTC para alinhamento com API da OpenAI
    const now = new Date();
    const utcNow = new Date(now.getTime());
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    
    // Formato YYYY-MM-DD em UTC
    const today = todayUTC.toISOString().split('T')[0]; 
    console.log('Data atual em UTC (hoje):', today);
    console.log('Data atual local:', new Date().toISOString().split('T')[0]);

    // Ordenar dados por data
    const sortedData = [...usageData.completionsUsage.byDate].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Verificar se o dia atual existe nos dados
    const hasToday = sortedData.some(item => item.date === today);
    console.log('Dia atual (UTC) presente nos dados (antes):', hasToday);
    
    // Verificar se temos dados do dia atual em dailyStats
    const hasDailyStats = usageData.completionsUsage.dailyStats && 
                         Object.keys(usageData.completionsUsage.dailyStats).length > 0;
    console.log('Dados de dailyStats disponíveis:', hasDailyStats);
    
    // Sempre usar dailyStats para os dados de hoje, garantindo que apareçam mesmo se não estiverem em byDate
    if (!hasToday && hasDailyStats && usageData.completionsUsage.dailyStats) {
      console.log('Adicionando dados do dia atual (UTC) ao gráfico baseado em dailyStats');
      
      // Criar cópia dos dados de hoje para adicionar ao array
      sortedData.push({
        date: today,
        input_tokens: usageData.completionsUsage.dailyStats.input_tokens || 0,
        output_tokens: usageData.completionsUsage.dailyStats.output_tokens || 0,
        input_cached_tokens: usageData.completionsUsage.dailyStats.input_cached_tokens || 0,
        requests: usageData.completionsUsage.dailyStats.requests || 0
      });
      
      console.log('Dados do dia atual (UTC) adicionados ao gráfico:', sortedData[sortedData.length - 1]);
    } else if (!hasToday) {
      // Se não temos dailyStats, criar registro vazio para hoje
      console.log('Criando registro vazio para o dia atual (UTC) no gráfico');
      sortedData.push({
        date: today,
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        requests: 0
      });
    } else {
      console.log('Dados do dia atual (UTC) já presentes no conjunto de dados');
    }
    
    // Verificar novamente após potencialmente adicionar dados
    const hasTodayAfter = sortedData.some(item => item.date === today);
    console.log('Dia atual (UTC) presente nos dados (depois):', hasTodayAfter);
    
    // Verificar e exibir os dados do dia atual como diagnóstico
    const todayData = sortedData.find(item => item.date === today);
    console.log('Dados do dia atual (UTC) para o gráfico:', todayData);

    // Obter os dados de custos reais por data se disponíveis
    const costsByDate = usageData.completionsUsage.actualCosts?.byDate || [];
    
    // Validar e verificar os dados recebidos para diagnóstico
    console.log("=== DIAGNÓSTICO DE ALINHAMENTO DE DADOS ===");
    console.log("Datas de uso disponíveis:", sortedData.map(d => d.date).join(', '));
    console.log("Datas de custo disponíveis:", costsByDate.map(c => c.date).join(', '));
    
    // Criar um mapa de custos por data para fácil acesso
    const costMap = new Map();
    
    if (costsByDate && costsByDate.length > 0) {
      // Log para diagnóstico
      console.log('Dados de custos por data recebidos:', 
        costsByDate.map(c => `${c.date}: $${typeof c.amount_value === 'string' ? parseFloat(c.amount_value).toFixed(2) : c.amount_value.toFixed(2)}`).join(', ')
      );
      
      costsByDate.forEach(costEntry => {
        // Garantir que o valor é um número
        const costValue = typeof costEntry.amount_value === 'string' 
          ? parseFloat(costEntry.amount_value) 
          : (costEntry.amount_value || 0);
        
        // Usar a data como está - agora já corrigida pelo backend
        costMap.set(costEntry.date, costValue);
      });
    }
    
    // Verificar se temos o custo para o dia atual em UTC
    const hasTodayCost = costMap.has(today);
    console.log(`Custo para o dia atual (${today}) encontrado no mapa de custos:`, hasTodayCost);
    
    if (!hasTodayCost) {
      // Se não temos o custo real do dia atual nos dados da API, temos 3 opções:
      // 1. Usar o totalCost dos dailyStats se disponível (prioridade máxima)
      if (usageData.completionsUsage.dailyStats && 
          typeof usageData.completionsUsage.dailyStats.totalCost !== 'undefined') {
        // Converter para número se necessário
        const todayCost = typeof usageData.completionsUsage.dailyStats.totalCost === 'string'
          ? parseFloat(usageData.completionsUsage.dailyStats.totalCost)
          : usageData.completionsUsage.dailyStats.totalCost;
          
        console.log(`Usando custo diário dos dailyStats: $${todayCost}`);
        costMap.set(today, todayCost);
      }
      // 2. Se não tem totalCost, usar valor zero em vez de estimativa
      else {
        console.log(`Definindo custo zero para hoje (${today}) por não haver dados de custo`);
        costMap.set(today, 0);
      }
    }
    
    // Debug: exibir o mapa de custos
    console.log('Mapa de custos por data (após processamento):', 
      [...costMap.entries()].map(([date, value]) => `${date}: $${value.toFixed(4)}`).join(', '));
    
    // Garantir que as datas usadas no gráfico estejam no mesmo formato que as de custos
    const normalizedDates = sortedData.map(d => {
      // Acessar a data original
      const originalDate = d.date;
      
      // Usar a data original
      return {
        normalizedDate: originalDate,
        originalData: d
      };
    });
    
    // Debug: verificar correspondências
    normalizedDates.forEach(d => {
      const cost = costMap.get(d.normalizedDate);
      if (cost !== undefined) {
        console.log(`✓ Correspondência encontrada: ${d.normalizedDate} = $${cost.toFixed(4)}`);
      } else {
        console.log(`✗ Sem correspondência para data: ${d.normalizedDate}`);
      }
    });

    // Ordenar datas cronologicamente para o gráfico
    normalizedDates.sort((a, b) => 
      new Date(a.normalizedDate).getTime() - new Date(b.normalizedDate).getTime()
    );
    
    return {
      inputTokens: normalizedDates.map(d => d.originalData.input_tokens || 0),
      outputTokens: normalizedDates.map(d => d.originalData.output_tokens || 0),
      requisicoes: normalizedDates.map(d => d.originalData.requests || 0),
      totalCosts: normalizedDates.map(d => {
        // Usar a data normalizada para buscar o custo correspondente
        const cost = costMap.get(d.normalizedDate) || 0;
        return cost;
      }),
      dates: normalizedDates.map(d => d.normalizedDate)
    };
  };

  const metricsAreaData = prepareMetricsAreaData();

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
                    {metricsAreaData.dates.length > 0 && (
                      <div className="mt-6">
                        <MetricsAreaChart data={metricsAreaData} />
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