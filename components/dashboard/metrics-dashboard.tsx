"use client"

import { useState } from "react"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Users,
  UserCheck,
  PercentSquare,
  DollarSign,
  ShoppingCart,
  ThumbsUp,
  Smile,
  MessageCircle,
  Bot,
  Clock,
  AlertTriangle,
  RotateCcw,
  UserMinus,
  Activity,
  HelpCircle,
  UserX,
  TrendingUp,
  Star,
  Zap,
  RefreshCw,
  Repeat,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { useDashboardContext } from "@/contexts/DashboardContext"
import { DashboardLoading } from "@/components/dashboard/loading"
import { DashboardError } from "@/components/dashboard/error"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AreaChart as AreaChartComponent } from "@/components/charts/area-chart"
import { BarChart as BarChartComponent } from "@/components/charts/bar-chart"
import { MetricCard } from "@/components/dashboard/metric-card"
import { DashboardSkeleton, MetricSkeleton, ChartSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type MetricType = "Leads" | "Qualificados" | "NaoQualificados"

const valueFormatter = (number: number) => `${Intl.NumberFormat("us").format(number).toString()}`

export function MetricsDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("Leads")
  const { data, isLoading, error } = useDashboardContext()

  // Debug logs
  console.log('MetricsDashboard - Data:', data)

  if (isLoading) {
    return <DashboardLoading />
  }

  if (error) {
    console.error('MetricsDashboard - Error:', error)
    return <DashboardError error={error} />
  }

  // Get latest metrics
  const today = new Date().toISOString().split('T')[0];
  console.log('Today:', today);
  
  const latestLeadMetrics = data.leadMetrics.find(metric => 
    new Date(metric.date).toISOString().split('T')[0] === today
  ) || {
    total_leads: 0,
    qualified_leads: 0,
    unqualified_leads: 0,
    conversion_rate: 0
  };

  console.log('Today\'s metrics:', latestLeadMetrics);

  const latestSalesMetrics = data.salesMetrics[data.salesMetrics.length - 1] || {
    revenue: 0,
    total_opportunities: 0,
    converted_opportunities: 0,
    cost_per_conversion: 0,
    average_ticket: 0,
    conversion_rate: 0
  }

  const latestSatisfactionMetrics = data.satisfactionMetrics[data.satisfactionMetrics.length - 1] || {
    nps_score: 0,
    csat_score: 0,
    sentiment_score: 0,
    total_responses: 0,
    promoters: 0,
    passives: 0,
    detractors: 0
  }

  const latestOperationalMetrics = data.operationalMetrics[data.operationalMetrics.length - 1] || {
    self_service_rate: 0,
    fallback_rate: 0,
    technical_errors: 0,
    avg_resolution_time: 0,
    total_interactions: 0,
    resolved_interactions: 0
  }

  const latestRetentionMetrics = data.retentionMetrics[data.retentionMetrics.length - 1] || {
    return_rate: 0,
    churn_rate: 0,
    usage_frequency: 0,
    total_users: 0,
    returning_users: 0,
    churned_users: 0
  }

  // Formatar dados para os gráficos com ajuste de fuso horário
  const formatDateForDisplay = (dateString: string) => {
    // Converter a string de data para um objeto Date considerando como UTC
    // A data vem no formato ISO (YYYY-MM-DD) ou similar
    const [year, month, day] = dateString.split(/[-T]/);
    
    // Criar uma data no fuso horário local do navegador
    // Usamos ano, mês (0-11 em JS) e dia
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Formatar usando toLocaleDateString para exibição consistente
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Formatar dados para os gráficos
  const chartData = data.leadMetrics.map(metric => ({
    date: formatDateForDisplay(metric.date),
    Leads: metric.total_leads || 0,
    Qualificados: metric.qualified_leads || 0,
    NaoQualificados: metric.unqualified_leads || 0
  }))

  const salesChartData = data.salesMetrics.map(metric => ({
    date: formatDateForDisplay(metric.date),
    conversao: metric.conversion_rate || 0,
    receita: (metric.revenue || 0) / 100
  }))

  const satisfactionData = data.satisfactionMetrics.map(metric => ({
    date: formatDateForDisplay(metric.date),
    NPS: metric.nps_score || 0,
    CSAT: metric.csat_score || 0
  }))

  const operationalEfficiencyData = data.operationalMetrics.map(metric => ({
    date: formatDateForDisplay(metric.date),
    Autoatendimento: metric.self_service_rate || 0,
    Fallback: metric.fallback_rate || 0,
    Erros: metric.technical_errors || 0,
    TTR: metric.avg_resolution_time || 0
  }))

  const retentionData = data.retentionMetrics.map(metric => ({
    date: formatDateForDisplay(metric.date),
    TaxaRetorno: metric.return_rate * 100,
    ChurnRate: metric.churn_rate * 100,
    FrequenciaUso: metric.usage_frequency
  }))

  // Show skeleton when there's no data
  if (!data.leadMetrics || data.leadMetrics.length === 0) {
    return <DashboardSkeleton />
  }

  const tabs = [
    { 
      name: "Leads Capturados", 
      value: valueFormatter(latestLeadMetrics.total_leads), 
      icon: Users 
    },
    { 
      name: "Leads Qualificados", 
      value: valueFormatter(latestLeadMetrics.qualified_leads), 
      icon: UserCheck 
    },
    { 
      name: "Leads Desqualificados", 
      value: valueFormatter(latestLeadMetrics.unqualified_leads), 
      icon: UserX 
    },
    { 
      name: "Taxa de Conversão", 
      value: `${latestLeadMetrics.conversion_rate}%`, 
      icon: PercentSquare 
    },
  ]

  // Get yesterday's metrics for comparison
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
  const yesterdayMetrics = data.leadMetrics.find(metric => 
    new Date(metric.date).toISOString().split('T')[0] === yesterday
  ) || {
    total_leads: 0,
    qualified_leads: 0,
    unqualified_leads: 0,
    conversion_rate: 0
  };

  // Calculate percentage changes
  const getPercentageChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const changes = {
    total_leads: getPercentageChange(latestLeadMetrics.total_leads, yesterdayMetrics.total_leads),
    qualified_leads: getPercentageChange(latestLeadMetrics.qualified_leads, yesterdayMetrics.qualified_leads),
    unqualified_leads: getPercentageChange(latestLeadMetrics.unqualified_leads, yesterdayMetrics.unqualified_leads),
    conversion_rate: getPercentageChange(latestLeadMetrics.conversion_rate, yesterdayMetrics.conversion_rate)
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="w-full bg-[#0A0A0B]/80 border-white/[0.05]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-2xl font-bold">Geração e Qualificação de Leads</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-8">
              <div className="grid grid-cols-4 gap-6">
                {tabs.map((tab, index) => {
                  const metricKey = index === 0 ? 'total_leads' : 
                                   index === 1 ? 'qualified_leads' : 
                                   index === 2 ? 'unqualified_leads' : 'conversion_rate';
                  const change = changes[metricKey];
                  
                  return (
                    <div key={tab.name} className="bg-[#0F0F0F] border border-[#272727] p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-[#E8F3ED]/60 text-sm font-medium">{tab.name}</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="hover:opacity-80 transition-opacity">
                                  <HelpCircle className="w-4 h-4 text-white/40" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1E1E1E] border-[#272727] text-white p-2 rounded-lg">
                                <p className="text-xs">Total de {tab.name.toLowerCase()} hoje</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <tab.icon className="w-6 h-6 text-[#58E877]" />
                      </div>
                      <p className="text-white text-3xl font-bold">{tab.value}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={cn(
                          "flex items-center text-xs",
                          change > 0 ? "text-[#58E877]" : "text-red-500"
                        )}>
                          {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(change).toFixed(1)}%
                        </div>
                        <span className="text-xs text-white/40">vs. ontem</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#0F0F0F] border border-[#272727] p-6 rounded-lg">
                <h3 className="text-white text-lg font-semibold mb-4">Métricas por Períodos</h3>
                <RadioGroup
                  defaultValue="Leads"
                  onValueChange={(value) => setSelectedMetric(value as MetricType)}
                  className="flex p-1 space-x-1 bg-[#1a1a1c] rounded-md"
                >
                  <RadioGroupItem value="Leads" id="leads" className="hidden" />
                  <Label
                    htmlFor="leads"
                    className={`flex-1 py-2 px-4 rounded-md text-center cursor-pointer transition-all duration-200 ${
                      selectedMetric === "Leads"
                        ? "bg-[#58E877] text-black font-medium"
                        : "text-white hover:bg-[#272727]"
                    }`}
                  >
                    Leads Capturados
                  </Label>
                  <RadioGroupItem value="Qualificados" id="qualified" className="hidden" />
                  <Label
                    htmlFor="qualified"
                    className={`flex-1 py-2 px-4 rounded-md text-center cursor-pointer transition-all duration-200 ${
                      selectedMetric === "Qualificados"
                        ? "bg-[#58E877] text-black font-medium"
                        : "text-white hover:bg-[#272727]"
                    }`}
                  >
                    Leads Qualificados
                  </Label>
                  <RadioGroupItem value="NaoQualificados" id="not-qualified" className="hidden" />
                  <Label
                    htmlFor="not-qualified"
                    className={`flex-1 py-2 px-4 rounded-md text-center cursor-pointer transition-all duration-200 ${
                      selectedMetric === "NaoQualificados"
                        ? "bg-[#58E877] text-black font-medium"
                        : "text-white hover:bg-[#272727]"
                    }`}
                  >
                    Leads Desqualificados
                  </Label>
                </RadioGroup>
              </div>

              <div className="h-80 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666666" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis 
                      stroke="#666666" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1E1E1E",
                        border: "1px solid #272727",
                        borderRadius: "8px",
                        padding: "12px"
                      }}
                      labelStyle={{ color: "#E8F3ED" }}
                      itemStyle={{ color: "#58E877" }}
                    />
                    <Bar 
                      dataKey={selectedMetric} 
                      fill="#58E877"
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conversions and Sales Card */}
          <Card className="w-full bg-[#0A0A0B]/80 border-white/[0.05]">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <CardTitle className="text-white text-xl font-bold">Conversões e Vendas</CardTitle>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button className="ml-2 hover:opacity-80 transition-opacity">
                      <HelpCircle className="w-4 h-4 text-[#58E877] cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[300px] bg-[#1E1E1E] border-[#272727] text-white p-3 rounded-lg shadow-lg"
                  >
                    <ul className="space-y-2 list-none">
                      <li>
                        <span className="font-semibold text-[#58E877]">Taxa de Conversão:</span>
                        <br />
                        Percentual de leads que se tornam clientes
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Receita Gerada:</span>
                        <br />
                        Total de receita obtida a partir das conversões
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Custo por Conversão:</span>
                        <br />
                        Valor médio gasto para converter um lead em cliente
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Ticket Médio:</span>
                        <br />
                        Valor médio de cada venda realizada
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Taxa de Conversão</p>
                      <PercentSquare className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestSalesMetrics.conversion_rate}%</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Receita Gerada</p>
                      <DollarSign className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">R$ {valueFormatter(latestSalesMetrics.revenue)}</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Custo por Conversão</p>
                      <ShoppingCart className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">R$ {valueFormatter(latestSalesMetrics.cost_per_conversion)}</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Ticket Médio</p>
                      <DollarSign className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">R$ {valueFormatter(latestSalesMetrics.average_ticket)}</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666666" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis 
                        stroke="#666666" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#1E1E1E",
                          border: "1px solid #272727",
                          borderRadius: "8px",
                          padding: "12px"
                        }}
                        labelStyle={{ color: "#E8F3ED" }}
                        itemStyle={{ color: "#58E877" }}
                      />
                      <defs>
                        <linearGradient id="colorConversao" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#58E877" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#58E877" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4EDB82" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#4EDB82" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="conversao"
                        stroke="#58E877"
                        fill="url(#colorConversao)"
                        name="Taxa de Conversão (%)"
                      />
                      <Area
                        type="monotone"
                        dataKey="receita"
                        stroke="#4EDB82"
                        fill="url(#colorReceita)"
                        name="Receita (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Satisfaction Card */}
          <Card className="w-full bg-[#0A0A0B]/80 border-white/[0.05]">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <CardTitle className="text-white text-xl font-bold">Satisfação do Usuário</CardTitle>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button className="ml-2 hover:opacity-80 transition-opacity">
                      <HelpCircle className="w-4 h-4 text-[#58E877] cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[300px] bg-[#1E1E1E] border-[#272727] text-white p-3 rounded-lg shadow-lg"
                  >
                    <ul className="space-y-2 list-none">
                      <li>
                        <span className="font-semibold text-[#58E877]">NPS (Net Promoter Score):</span>
                        <br />
                        Métrica que mede a lealdade do cliente em uma escala de 0 a 10
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">CSAT (Customer Satisfaction):</span>
                        <br />
                        Índice de satisfação do cliente, geralmente em uma escala de 1 a 5
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Análise de Sentimentos:</span>
                        <br />
                        Classificação das interações dos clientes em positivas, neutras ou negativas
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">NPS</p>
                      <ThumbsUp className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestSatisfactionMetrics.nps_score.toFixed(1)}</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">CSAT</p>
                      <Smile className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestSatisfactionMetrics.csat_score.toFixed(1)}</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Análise de Sentimentos</p>
                      <MessageCircle className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#58E877]">Positivo: {latestSatisfactionMetrics.sentiment_score}%</span>
                      <span className="text-yellow-400">Neutro: {(100 - latestSatisfactionMetrics.sentiment_score) / 2}%</span>
                      <span className="text-red-500">Negativo: {(100 - latestSatisfactionMetrics.sentiment_score) / 2}%</span>
                    </div>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={satisfactionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 13 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 13 }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#272727",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "4px",
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Area type="monotone" dataKey="NPS" stroke="#58E877" fill="#58E877" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="CSAT" stroke="#4EDB82" fill="#4EDB82" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Operational Efficiency Card */}
          <Card className="w-full bg-[#0A0A0B]/80 border-white/[0.05]">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <CardTitle className="text-white text-xl font-bold">Eficiência Operacional</CardTitle>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button className="ml-2 hover:opacity-80 transition-opacity">
                      <HelpCircle className="w-4 h-4 text-[#58E877] cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[300px] bg-[#1E1E1E] border-[#272727] text-white p-3 rounded-lg shadow-lg"
                  >
                    <ul className="space-y-2 list-none">
                      <li>
                        <span className="font-semibold text-[#58E877]">Taxa de autoatendimento:</span>
                        <br />
                        Percentual de interações resolvidas automaticamente sem intervenção humana
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Taxa de fallback:</span>
                        <br />
                        Percentual de casos que necessitaram intervenção humana
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Erros técnicos:</span>
                        <br />
                        Quantidade de falhas técnicas durante atendimentos
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Tempo médio de resolução:</span>
                        <br />
                        Duração média para resolver cada atendimento
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Taxa de autoatendimento</p>
                      <Bot className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestOperationalMetrics.self_service_rate}%</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Taxa de fallback</p>
                      <Users className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestOperationalMetrics.fallback_rate}%</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Erros técnicos</p>
                      <AlertTriangle className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestOperationalMetrics.technical_errors}</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Tempo médio de resolução</p>
                      <Clock className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestOperationalMetrics.avg_resolution_time} min</p>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operationalEfficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272727" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666666" 
                        tick={{ fontSize: 10, fill: '#666666' }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis 
                        stroke="#666666" 
                        tick={{ fontSize: 10, fill: '#666666' }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#1E1E1E",
                          border: "1px solid #272727",
                          borderRadius: "8px",
                          padding: "12px"
                        }}
                        labelStyle={{ color: "#E8F3ED" }}
                        itemStyle={{ color: "#58E877" }}
                      />
                      <Bar dataKey="Autoatendimento" fill="#58E877" name="Taxa de autoatendimento" />
                      <Bar dataKey="Fallback" fill="#4EDB82" name="Taxa de fallback" />
                      <Bar dataKey="Erros" fill="#FF6B6B" name="Erros técnicos" />
                      <Bar dataKey="TTR" fill="#FFA500" name="Tempo médio de resolução" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retention and Loyalty Card */}
          <Card className="w-full bg-[#0A0A0B]/80 border-white/[0.05]">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <CardTitle className="text-white text-xl font-bold">Retenção e Fidelização</CardTitle>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button className="ml-2 hover:opacity-80 transition-opacity">
                      <HelpCircle className="w-4 h-4 text-[#58E877] cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-[300px] bg-[#1E1E1E] border-[#272727] text-white p-3 rounded-lg shadow-lg"
                  >
                    <ul className="space-y-2 list-none">
                      <li>
                        <span className="font-semibold text-[#58E877]">Taxa de retorno:</span>
                        <br />
                        Percentual de clientes que voltam a utilizar o serviço
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Churn rate:</span>
                        <br />
                        Taxa de cancelamento ou abandono do serviço pelos clientes
                      </li>
                      <li>
                        <span className="font-semibold text-[#58E877]">Frequência de uso:</span>
                        <br />
                        Número médio de interações por usuário em um determinado período
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Taxa de retorno</p>
                      <RotateCcw className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestRetentionMetrics.return_rate}%</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Churn rate</p>
                      <UserMinus className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestRetentionMetrics.churn_rate}%</p>
                  </div>
                  <div className="bg-[#0F0F0F] border border-[#272727] p-4 rounded-lg col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E8F3ED]/60 text-xs">Frequência de uso</p>
                      <Activity className="w-4 h-4 text-[#58E877]" />
                    </div>
                    <p className="text-white text-lg font-bold">{latestRetentionMetrics.usage_frequency} interações/usuário</p>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={retentionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666666" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis 
                        stroke="#666666" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#1E1E1E",
                          border: "1px solid #272727",
                          borderRadius: "8px",
                          padding: "12px"
                        }}
                        labelStyle={{ color: "#E8F3ED" }}
                        itemStyle={{ color: "#58E877" }}
                      />
                      <Bar dataKey="TaxaRetorno" fill="#58E877" />
                      <Bar dataKey="ChurnRate" fill="#FF6B6B" />
                      <Bar dataKey="FrequenciaUso" fill="#FFA500" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}

