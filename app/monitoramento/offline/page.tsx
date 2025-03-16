'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ReloadIcon, Download, UploadIcon, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import useOfflineOpenAIUsage from '@/hooks/useOfflineOpenAIUsage';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

export default function OfflineCreditsPage() {
  const { usageData, isLoading, error, refreshData, syncWithSupabase, exportData } = useOfflineOpenAIUsage();
  const [activeTab, setActiveTab] = useState('overview');

  // Estados padrão para o caso de dados não estarem disponíveis
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [percentChange, setPercentChange] = useState(0);
  const [usagePercent, setUsagePercent] = useState(0);
  const [remainingCredits, setRemainingCredits] = useState(0);
  const [usageLimit, setUsageLimit] = useState(100); // Limite padrão de $100
  const [dailyAverage, setDailyAverage] = useState(0);
  const [monthStart, setMonthStart] = useState('');
  const [monthEnd, setMonthEnd] = useState('');
  
  // Atualizar estados quando os dados mudarem
  useEffect(() => {
    if (usageData) {
      setCurrentMonthTotal(usageData.currentMonthTotal || 0);
      setPercentChange(usageData.currentMonth?.percentChange || 0);
      setUsagePercent((usageData.currentMonthTotal / usageData.subscription.usageLimit) * 100);
      setRemainingCredits(usageData.subscription.remainingCredits || 0);
      setUsageLimit(usageData.subscription.usageLimit || 100);
      setDailyAverage(usageData.dailyAverage?.amount || 0);
      setMonthStart(usageData.currentMonth?.startDate || '');
      setMonthEnd(usageData.currentMonth?.endDate || '');
    }
  }, [usageData]);

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Função para formatar números grandes
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Manipuladores de eventos
  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Dados atualizados com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar dados');
    }
  };

  const handleSync = async () => {
    try {
      await syncWithSupabase();
      toast.success('Sincronização com N8N completada');
    } catch (err) {
      toast.error('Erro na sincronização');
    }
  };

  const handleExport = async () => {
    try {
      await exportData();
      toast.success('Dados exportados com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar dados');
    }
  };

  const chartColors = {
    gpt35: '#16a34a',
    gpt4: '#2563eb',
    other: '#f59e0b',
    background: '#f8fafc',
    grid: '#e2e8f0',
    text: '#334155'
  };

  // Cores personalizadas para o gráfico de modelo
  const getModelColor = (model: string) => {
    if (model.includes('gpt-3.5')) return chartColors.gpt35;
    if (model.includes('gpt-4')) return chartColors.gpt4;
    return chartColors.other;
  };

  // Formatar dados para o gráfico de área (uso diário)
  const formatDailyChartData = () => {
    if (!usageData?.dailyUsage) return [];
    return usageData.dailyUsage.map((item) => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      cost: Number(item.amount.toFixed(4)),
      tokens: item.totalTokens
    }));
  };

  // Formatar dados para o gráfico de barras (uso por modelo)
  const formatModelChartData = () => {
    if (!usageData?.modelUsage) return [];
    return usageData.modelUsage.map((item) => ({
      name: item.model,
      cost: Number(item.cost.toFixed(4)),
      tokens: item.tokens,
      requests: item.requests
    }));
  };

  // Formatar dados para o gráfico de pizza (uso por agente)
  const formatAgentChartData = () => {
    if (!usageData?.costByAgent) return [];
    return Object.entries(usageData.costByAgent).map(([name, data]) => ({
      name,
      value: Number(data.cost.toFixed(4))
    }));
  };

  // Cores para o gráfico de pizza
  const AGENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Renderizar componentes com base nos estados
  const renderOverviewTab = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gasto Total (Mês Atual)</CardTitle>
          <CardDescription>
            {monthStart ? `${new Date(monthStart).toLocaleDateString('pt-BR')} até ${new Date(monthEnd).toLocaleDateString('pt-BR')}` : 'Mês atual'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(currentMonthTotal)}</div>
          <Badge variant={percentChange >= 0 ? "default" : "destructive"} className="mt-1">
            {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}% em relação ao mês anterior
          </Badge>
          <Progress className="mt-3" value={usagePercent} />
          <p className="text-xs text-muted-foreground mt-1">
            {usagePercent.toFixed(1)}% do limite de {formatCurrency(usageLimit)}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Créditos Restantes</CardTitle>
          <CardDescription>Saldo disponível para uso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(remainingCredits)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Média diária: {formatCurrency(dailyAverage)}
          </p>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Uso Diário</CardTitle>
          <CardDescription>Gastos nos últimos dias</CardDescription>
        </CardHeader>
        <CardContent className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatDailyChartData()} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.gpt35} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartColors.gpt35} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <CartesianGrid strokeDasharray="3 3" />
              <RechartsTooltip 
                formatter={(value: number) => formatCurrency(value)} 
                labelFormatter={(label) => `Dia: ${label}`}
              />
              <Area type="monotone" dataKey="cost" stroke={chartColors.gpt35} fillOpacity={1} fill="url(#colorCost)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderModelsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Uso por Modelo</CardTitle>
          <CardDescription>Custo e tokens por modelo de IA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formatModelChartData()} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke={chartColors.gpt35} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke={chartColors.gpt4} tick={{ fontSize: 10 }} />
                <RechartsTooltip formatter={(value: number, name: string) => {
                  if (name === 'cost') return formatCurrency(value);
                  return formatNumber(value);
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="cost" name="Custo" fill={chartColors.gpt35} />
                <Bar yAxisId="right" dataKey="tokens" name="Tokens" fill={chartColors.gpt4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Detalhes por Modelo</CardTitle>
          <CardDescription>Informações detalhadas sobre o uso de cada modelo</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Requisições</TableHead>
                <TableHead className="text-right">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageData?.modelUsage?.map((model, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-medium">{model.model}</div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(model.tokens)}</TableCell>
                  <TableCell className="text-right">{formatNumber(model.requests)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(model.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>Lista de todos os modelos utilizados no período</TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderAgentsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Uso por Agente</CardTitle>
          <CardDescription>Distribuição de custos por agente/workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formatAgentChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formatAgentChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGENT_COLORS[index % AGENT_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Detalhes por Agente</CardTitle>
          <CardDescription>Informações detalhadas sobre o uso de cada agente</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Agente</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageData?.costByAgent && Object.entries(usageData.costByAgent).map(([name, data], index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-medium">{name}</div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(data.tokens)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>Lista de todos os agentes utilizados no período</TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Créditos e Consumo (Modo Offline)</h1>
          <p className="text-muted-foreground">
            Monitore o uso de créditos e consumo dos modelos de IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? <ReloadIcon className="h-4 w-4 animate-spin mr-2" /> : <ReloadIcon className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading || !usageData}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={isLoading}
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            Sincronizar com N8N
          </Button>
        </div>
      </div>

      <Separator />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {renderOverviewTab()}
        </TabsContent>
        <TabsContent value="models" className="space-y-4">
          {renderModelsTab()}
        </TabsContent>
        <TabsContent value="agents" className="space-y-4">
          {renderAgentsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
} 