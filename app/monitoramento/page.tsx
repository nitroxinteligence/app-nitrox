"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { 
  RefreshCw, AlertCircle, DollarSign, BarChart3, ChevronRight,
  CreditCard, Zap, Download, Upload, Target, Clock, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

import useOpenAIUsage from '@/hooks/useOpenAIUsage'
import { formatCurrency } from '@/lib/utils'
import UsageCard from '@/components/usage/UsageCard'
import UsageChart from '@/components/usage/UsageChart'
import ModelUsageTable from '@/components/usage/ModelUsageTable'

interface WorkflowUsageProps {
  workflowStats: Record<string, {
    name: string;
    executions: number;
    tokens: number;
    cost: number;
    calls: number;
    lastExecuted?: string;
    model: string;
    costPer1K?: number;
  }>;
  isLoading: boolean;
}

function WorkflowUsageTable({ workflowStats, isLoading }: WorkflowUsageProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Transformar o objeto workflowStats em um array para facilitar a manipulação
  const workflows = Object.entries(workflowStats || {}).map(([id, stats]) => ({
    id,
    ...stats,
  }));

  console.log('WorkflowUsageTable: dados recebidos:', workflows.length, 'workflows');
  
  // Log detalhado de cada workflow para diagnóstico
  workflows.forEach(workflow => {
    console.log(`Workflow ID: ${workflow.id}`);
    console.log(`  Nome: ${workflow.name}`);
    console.log(`  Modelo: ${workflow.model}`);
    console.log(`  Execuções: ${workflow.executions}`);
    console.log(`  Chamadas: ${workflow.calls}`);
    console.log(`  Tokens: ${workflow.tokens}`);
    console.log(`  Custo: $${workflow.cost.toFixed(4)}`);
    console.log(`  Custo/1K: $${(workflow.costPer1K || 0).toFixed(6)}`);
    console.log(`  Última execução: ${workflow.lastExecuted || 'N/A'}`);
    console.log('-----------------------------------');
  });
  
  if (workflows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Não há dados de uso por workflow disponíveis.
      </div>
    );
  }

  // Ordenar workflows por custo (do mais alto para o mais baixo)
  workflows.sort((a, b) => b.cost - a.cost);
  
  // Função para determinar a cor do status com base no número de execuções
  const getStatusColor = (executions: number) => {
    if (executions > 1000) return "bg-green-500";
    if (executions > 100) return "bg-blue-500";
    if (executions > 10) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  // Função para formatar data de última execução
  const formatLastExecuted = (dateStr?: string) => {
    if (!dateStr) return 'Desconhecido';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Função para formatar o modelo com ícone indicativo
  const formatModel = (model: string) => {
    if (!model || model === 'unknown') return 'Desconhecido';
    
    // Determinar ícone com base no modelo
    let icon = '⚪';
    let tooltip = '';
    
    if (model.includes('gpt-4')) {
      icon = '🔴'; // Vermelho para GPT-4
      tooltip = 'Modelo avançado - custo mais alto';
    } else if (model.includes('gpt-3.5')) {
      icon = '🟢'; // Verde para GPT-3.5
      tooltip = 'Modelo padrão - custo moderado';
    } else if (model.includes('dall-e')) {
      icon = '🎨'; // Paleta para DALL-E
      tooltip = 'Modelo de geração de imagens';
    }
    
    return (
      <div className="flex items-center gap-1" title={tooltip}>
        <span>{icon}</span>
        <span className="truncate max-w-[120px]">{model}</span>
      </div>
    );
  };
  
  // Calcular totais para a linha de resumo
  const totalExecutions = workflows.reduce((sum, w) => sum + w.executions, 0);
  const totalCalls = workflows.reduce((sum, w) => sum + w.calls, 0);
  const totalTokens = workflows.reduce((sum, w) => sum + w.tokens, 0);
  const totalCost = workflows.reduce((sum, w) => sum + w.cost, 0);
  
  // Calcular custo médio ponderado por 1K tokens (considerando volume de tokens)
  const weightedCostPer1K = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0;
  
  console.log('Totais calculados:');
  console.log(`  Total de execuções: ${totalExecutions}`);
  console.log(`  Total de chamadas: ${totalCalls}`);
  console.log(`  Total de tokens: ${totalTokens}`);
  console.log(`  Custo total: $${totalCost.toFixed(4)}`);
  console.log(`  Custo/1K ponderado: $${weightedCostPer1K.toFixed(6)}`);

  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-7 gap-4 p-4 text-sm font-medium">
        <div>Agente</div>
        <div className="text-right">Modelo</div>
        <div className="text-right">Execuções</div>
        <div className="text-right">Chamadas AI</div>
        <div className="text-right">Tokens</div>
        <div className="text-right">Custo Total</div>
        <div className="text-right">Custo/1K Tokens</div>
      </div>
      <Separator />
      {workflows.map((workflow) => (
        <div key={workflow.id} className="grid grid-cols-7 gap-4 p-4 text-sm border-b border-[#222224] hover:bg-[#171719]/50 transition-colors duration-150">
          <div className="font-medium">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(workflow.executions)}`} />
              <span>{workflow.name}</span>
            </div>
            {workflow.lastExecuted && (
              <span className="text-xs text-[#adadad] block mt-1">
                Última execução: {formatLastExecuted(workflow.lastExecuted)}
              </span>
            )}
          </div>
          <div className="text-right">{formatModel(workflow.model)}</div>
          <div className="text-right">{workflow.executions.toLocaleString()}</div>
          <div className="text-right">{workflow.calls.toLocaleString()}</div>
          <div className="text-right">{workflow.tokens.toLocaleString()}</div>
          <div className="text-right">{formatCurrency(workflow.cost)}</div>
          <div className="text-right" title="Custo médio por 1000 tokens para este agente">
            {formatCurrency(workflow.costPer1K || 0)}
          </div>
        </div>
      ))}
      {/* Linha de Total */}
      <div className="grid grid-cols-7 gap-4 p-4 text-sm bg-[#171719] font-medium border-t border-[#323234]">
        <div>TOTAL ({workflows.length} agentes)</div>
        <div className="text-right">-</div>
        <div className="text-right">{totalExecutions.toLocaleString()}</div>
        <div className="text-right">{totalCalls.toLocaleString()}</div>
        <div className="text-right">{totalTokens.toLocaleString()}</div>
        <div className="text-right">{formatCurrency(totalCost)}</div>
        <div className="text-right" title="Custo médio ponderado por 1000 tokens para todos os agentes">
          {formatCurrency(weightedCostPer1K)}
        </div>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const {
    usageData,
    isLoading,
    error,
    refreshData,
    exportData
  } = useOpenAIUsage()
  
  const [activeTab, setActiveTab] = useState('chart')
  const [syncStats, setSyncStats] = useState<any>(null)
  
  // Efeito para atualizar dados periodicamente (a cada 5 minutos)
  useEffect(() => {
    // Atualizar dados ao montar o componente
    refreshData();
    
    // Configurar intervalo para atualização automática
    const intervalId = setInterval(() => {
      console.log('Atualizando dados automaticamente...');
      refreshData();
    }, 5 * 60 * 1000); // 5 minutos
    
    // Limpar intervalo ao desmontar
    return () => clearInterval(intervalId);
  }, [refreshData]);
  
  useEffect(() => {
    console.log('MonitoringPage: Estado do hook', { 
      hasData: !!usageData, 
      isLoading, 
      hasError: !!error
    })
    
    if (usageData) {
      console.log('MonitoringPage: Valores de resumo:', {
        dailySummary: {
          total_calls: usageData.dailySummary?.total_calls,
          total_requests: usageData.dailySummary?.total_requests,
          total_cost: usageData.dailySummary?.total_cost,
          total_tokens: usageData.dailySummary?.total_tokens,
          update_date: usageData.dailySummary?.update_date
        },
        workflowsCount: Object.keys(usageData.workflowStats || {}).length,
        modelsCount: usageData.modelUsage?.length || 0
      });
    }
  }, [usageData, isLoading, error])

  const handleRefreshData = async () => {
    console.log('MonitoringPage: Iniciando atualização de dados')
    
    toast.info('Atualizando dados de uso...', {
      description: 'Buscando informações mais recentes dos agentes.'
    })
    
    try {
      await refreshData()
      
      console.log('MonitoringPage: Dados atualizados')
      
      toast.success('Dados atualizados', {
        description: 'As informações de uso da OpenAI foram atualizadas com sucesso.'
      })
    } catch (err) {
      console.error('Erro ao atualizar dados:', err)
      
      toast.error('Falha na atualização', {
        description: 'Não foi possível atualizar os dados de uso. Tente novamente mais tarde.'
      })
    }
  }

  const handleSyncWithN8N = async () => {
    try {
      console.log('Iniciando sincronização manual com N8N')
      setSyncStats({ status: 'loading', message: 'Sincronizando dados...' })
      
      toast.info('Sincronizando dados com N8N...', {
        description: 'Buscando informações de uso dos agentes no N8N.'
      })
      
      await syncWithSupabase()
      
      setSyncStats({
        status: 'success',
        message: 'Sincronização concluída',
        timestamp: new Date().toISOString()
      })
      
      // Atualizar dados automaticamente
      refreshData()
    } catch (error) {
      console.error('Erro ao sincronizar dados com N8N:', error)
      
      setSyncStats({
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro ao sincronizar',
        timestamp: new Date().toISOString()
      })
      
      toast.error('Erro ao sincronizar dados', {
        description: 'Não foi possível sincronizar dados com o N8N.'
      })
    }
  }

  // Valores padrão seguros para quando os dados não estão disponíveis
  const defaultSubscription = { usageLimit: 0, remainingCredits: 0 }
  const defaultDailyAverage = { amount: 0, percentOfLimit: 0 }
  const defaultDailySummary = { 
    total_calls: 0, 
    total_requests: 0, 
    total_cost: 0, 
    total_tokens: 0,
    update_date: new Date()
  }
  
  // Garantir que temos valores seguros mesmo quando os dados não estão disponíveis
  const subscription = usageData?.subscription || defaultSubscription
  const dailyAverage = usageData?.dailyAverage || defaultDailyAverage
  const modelUsage = usageData?.modelUsage || []
  const dailyUsage = usageData?.dailyUsage || []
  const dailySummary = usageData?.dailySummary || defaultDailySummary

  // Definindo as animações de entrada
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.5, ease: "easeOut" }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] text-white">
      <div className="fixed inset-0 w-full h-full bg-[#0A0A0B] -z-10" />
      
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div 
          className="flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <motion.div
              {...fadeInUp}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h1 className="text-3xl font-normal tracking-tight text-white">
                <span className="bg-gradient-to-r from-[#58E877] to-[#E8F3ED] bg-clip-text text-transparent">
                  Monitoramento OpenAI
                </span>
              </h1>
              <p className="text-[#afafaf] mt-1">
                Acompanhe o uso e os custos da API da OpenAI nos seus agentes de IA
              </p>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2"
              {...fadeInUp}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button 
                variant="ghost" 
                size="icon"
                className="text-[#afafaf] hover:text-white hover:bg-gray-800/50 relative group"
                onClick={handleRefreshData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="sr-only">Atualizar dados</span>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-sm text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Atualizar dados
                </div>
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="text-[#afafaf] hover:text-white hover:bg-gray-800/50 relative group"
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
                variant="ghost" 
                size="icon"
                className="text-[#afafaf] hover:text-white hover:bg-gray-800/50 relative group"
                onClick={handleSyncWithN8N}
                disabled={isLoading}
              >
                <Upload className="h-4 w-4" />
                <span className="sr-only">Sincronizar com N8N</span>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-sm text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Sincronizar com N8N
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="ml-2 bg-transparent text-[#afafaf] border-gray-700 hover:bg-[#26351e]/50"
              >
                <Eye className="h-4 w-4 mr-1" />
                Dados atualizados automaticamente
              </Button>
            </motion.div>
          </div>
          
          <Separator className="bg-[#272727]" />
        </motion.div>

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
          
          {syncStats && syncStats.status && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant={syncStats.status === 'error' ? 'destructive' : 'default'} className="bg-yellow-600/10 border-yellow-600/30">
                <Zap className="h-4 w-4" />
                <AlertTitle>
                  {syncStats.status === 'loading' ? 'Sincronizando agentes...' : 
                   syncStats.status === 'success' ? 'Sincronização concluída' : 
                   'Erro na sincronização'}
                </AlertTitle>
                <AlertDescription>
                  {syncStats.message}
                  {syncStats.timestamp && (
                    <span className="text-xs block mt-1 opacity-70">
                      {new Date(syncStats.timestamp).toLocaleString('pt-BR')}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats cards */}
        <motion.div 
          className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {isLoading ? (
            // Esqueletos de carregamento com design aprimorado
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-[#0F0F0F] border-[#272727] overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24 bg-[#222224]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-full bg-[#222224]" />
                  <Skeleton className="h-4 w-20 mt-2 bg-[#222224]" />
                </CardContent>
              </Card>
            ))
          ) : (
            // Cartões de uso com design aprimorado
            <>
              <UsageCard
                title="Total de chamadas OpenAI"
                value={`${isLoading ? '...' : dailySummary?.total_calls?.toLocaleString() || '0'}`}
                description={`Total no período de ${isLoading ? '...' : new Date(dailySummary?.update_date || new Date()).toLocaleDateString('pt-BR')}`}
                icon={<DollarSign className="h-4 w-4" />}
                trend={usageData?.currentMonth?.percentChange ? {
                  value: usageData.currentMonth.percentChange,
                  label: 'vs. mês anterior'
                } : undefined}
                className="bg-[#0F0F0F] border-[#272727] hover:border-[#323234] transition-colors duration-200"
              />
              <UsageCard
                title="Requisições totais"
                value={`${isLoading ? '...' : dailySummary?.total_requests?.toLocaleString() || '0'}`}
                description={`Chamadas realizadas à API`}
                icon={<Target className="h-4 w-4" />}
                className="bg-[#0F0F0F] border-[#272727] hover:border-[#323234] transition-colors duration-200"
              />
              <UsageCard
                title="Custo total OpenAI"
                value={isLoading ? '...' : formatCurrency(dailySummary?.total_cost || 0)}
                description={`Gasto com consumo de API`}
                icon={<BarChart3 className="h-4 w-4" />}
                className="bg-[#0F0F0F] border-[#272727] hover:border-[#323234] transition-colors duration-200"
              />
              <UsageCard
                title="Tokens utilizados"
                value={`${isLoading ? '...' : Math.round(dailySummary?.total_tokens || 0).toLocaleString()}`}
                description="Total em todos agentes"
                icon={<Zap className="h-4 w-4" />}
                className="bg-[#0F0F0F] border-[#272727] hover:border-[#323234] transition-colors duration-200"
              />
            </>
          )}
        </motion.div>

        {/* Main content tabs */}
        {!isLoading && usageData && (
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Tabs 
              defaultValue="chart" 
              className="space-y-6" 
              value={activeTab} 
              onValueChange={setActiveTab}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chart" className="data-[state=active]:text-white data-[state=active]:[&>svg]:text-[#58E877]">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Gráficos
                </TabsTrigger>
                <TabsTrigger value="table" className="data-[state=active]:text-white data-[state=active]:[&>svg]:text-[#58E877]">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="workflows" className="data-[state=active]:text-white data-[state=active]:[&>svg]:text-[#58E877]">
                  <Zap className="mr-2 h-4 w-4" />
                  Workflows
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="chart" className="space-y-4">
                <Card className="bg-[#0F0F0F] border-[#272727] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium text-gray-100">Uso diário</CardTitle>
                    <CardDescription className="text-[#adadad]">
                      Acompanhe o gasto diário em consumo da OpenAI nos últimos 30 dias
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UsageChart 
                      data={dailyUsage.map(item => ({
                        ...item,
                        totalTokens: item.totalTokens || 0
                      }))} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="table" className="space-y-4">
                <Card className="bg-[#0F0F0F] border-[#272727] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium text-gray-100">Uso por modelo</CardTitle>
                    <CardDescription className="text-[#adadad]">
                      Detalhamento do uso e custo por modelo de IA
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ModelUsageTable models={modelUsage} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="workflows" className="space-y-4">
                <Card className="bg-[#0F0F0F] border-[#272727] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium text-gray-100">Agentes IA do N8N</CardTitle>
                    <CardDescription className="text-[#adadad]">
                      Estatísticas detalhadas dos workflows com uso de IA
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WorkflowUsageTable 
                      workflowStats={usageData?.workflowStats || {}} 
                      isLoading={isLoading} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
        
        {/* Footer */}
        <motion.div 
          className="pt-6"
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Separator className="bg-[#272727] mb-6" />
          <div className="flex items-center justify-between text-xs text-[#afafaf]">
            <p>Dados atualizados automaticamente a cada 5 minutos</p>
            <p>Última atualização: {new Date().toLocaleTimeString()}</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 