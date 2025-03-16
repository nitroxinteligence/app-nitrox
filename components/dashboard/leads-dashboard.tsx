"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, FileSpreadsheet, Filter, RefreshCw, Users, UserCheck, UserMinus, PercentSquare } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import LeadsChart from "@/components/dashboard/leads-chart"
import ConversionChart from "@/components/dashboard/conversion-chart"
import FunnelChart from "@/components/dashboard/funnel-chart"
import AgeChart from "@/components/dashboard/age-chart"
import { DateRangePicker } from "@/components/date-range-picker"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, AreaChart, Area, ResponsiveContainer, RechartsTooltip } from "recharts"
import { AlertTriangle } from "lucide-react"

// Sample data
const leadData = [
  { month: "Jan", leads: 1500 },
  { month: "Feb", leads: 1800 },
  { month: "Mar", leads: 2500 },
  { month: "Apr", leads: 1200 },
  { month: "May", leads: 2000 },
  { month: "Jun", leads: 2300 },
]

const funnelData = [
  { stage: "Leads Frios", value: 500 },
  { stage: "Leads Mornos", value: 300 },
  { stage: "Leads Quentes", value: 150 },
  { stage: "Oportunidades", value: 75 },
  { stage: "Clientes", value: 30 },
]

const conversionData = [
  { name: "Frio para Morno", taxa: 60 },
  { name: "Morno para Quente", taxa: 50 },
  { name: "Quente para Oportunidade", taxa: 40 },
  { name: "Oportunidade para Cliente", taxa: 30 },
]

const ageData = [
  { name: "18-25", value: 40 },
  { name: "26-35", value: 30 },
  { name: "36-45", value: 15 },
  { name: "46-55", value: 10 },
  { name: "+55", value: 5 },
]

export function LeadsDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isUpdatingMetrics, setIsUpdatingMetrics] = useState(false)
  const [metricsData, setMetricsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Função para buscar métricas da API
  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Construir parâmetros de consulta com base no intervalo de datas
      let queryParams = '';
      if (dateRange.from && dateRange.to) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        queryParams = `?from=${fromDate}&to=${toDate}`;
      }
      
      const response = await fetch(`/api/metrics/lead-metrics${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar métricas: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao buscar métricas');
      }
      
      // Processar dados para os gráficos
      const processedData = processMetricsData(data.metrics);
      
      setMetricsData(processedData);
      console.log('Métricas carregadas:', processedData);
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast({
        title: "Erro ao carregar métricas",
        description: err instanceof Error ? err.message : 'Ocorreu um erro ao carregar as métricas',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Processar dados de métricas para os gráficos
  const processMetricsData = (metrics: any[]) => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return {
        leadData: [],
        conversionData: [],
        funnelData: [],
        totalLeads: 0,
        qualifiedLeads: 0,
        unqualifiedLeads: 0,
        conversionRate: 0
      };
    }
    
    // Ordenar métricas por data
    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Dados para o gráfico de leads
    const leadData = sortedMetrics.map(metric => ({
      month: new Date(metric.date).toLocaleDateString('pt-BR', { month: 'short' }),
      leads: metric.total_leads,
      qualified: metric.qualified_leads,
      unqualified: metric.unqualified_leads
    }));
    
    // Dados para o gráfico de conversão
    const conversionData = sortedMetrics.map(metric => ({
      name: new Date(metric.date).toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' }),
      taxa: metric.conversion_rate
    }));
    
    // Dados para o funil
    const latestMetric = sortedMetrics[sortedMetrics.length - 1];
    const funnelData = [
      { stage: "Leads Capturados", value: latestMetric.total_leads },
      { stage: "Leads Qualificados", value: latestMetric.qualified_leads },
      { stage: "Leads Convertidos", value: Math.round(latestMetric.qualified_leads * 0.4) }
    ];
    
    // Totais
    const totalLeads = latestMetric.total_leads;
    const qualifiedLeads = latestMetric.qualified_leads;
    const unqualifiedLeads = latestMetric.unqualified_leads;
    const conversionRate = latestMetric.conversion_rate;
    
    return {
      leadData,
      conversionData,
      funnelData,
      totalLeads,
      qualifiedLeads,
      unqualifiedLeads,
      conversionRate
    };
  };

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })} - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}`
    }
    return "Período: últimos 30 dias"
  }

  const handleDateRangeChange = (newRange: { from: Date | null; to: Date | null }) => {
    setDateRange(newRange)
    // Buscar dados para o novo intervalo de datas
    if (newRange.from || newRange.to) {
      fetchMetrics();
    }
  }

  // Função para atualizar as métricas de leads
  const updateLeadMetrics = async () => {
    try {
      setIsUpdatingMetrics(true)
      toast({
        title: "Atualizando métricas",
        description: "Buscando dados do N8N...",
        duration: 3000,
      })

      const response = await fetch("/api/metrics/lead-metrics?force=true")
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Métricas atualizadas",
          description: `Dados atualizados com sucesso!`,
          variant: "default",
          duration: 3000,
        })
        
        // Buscar métricas atualizadas
        fetchMetrics();
      } else {
        throw new Error(data.message || 'Erro ao atualizar métricas');
      }
    } catch (error) {
      console.error("Erro ao atualizar métricas:", error)
      toast({
        title: "Erro ao atualizar métricas",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar as métricas",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsUpdatingMetrics(false)
    }
  }
  
  // Carregar métricas ao montar o componente
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Renderizar estado de carregamento
  if (isLoading && !metricsData) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-12 h-12 text-[#58E877] animate-spin mb-4" />
        <h3 className="text-xl font-medium text-white">Carregando métricas de leads...</h3>
        <p className="text-[#E8F3ED]/60 mt-2">Aguarde enquanto buscamos os dados mais recentes.</p>
      </div>
    );
  }
  
  // Renderizar estado de erro
  if (error && !metricsData) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-red-900/20 rounded-lg border border-red-800">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-medium text-white">Erro ao carregar métricas</h3>
        <p className="text-[#E8F3ED]/80 mt-2 text-center max-w-md">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4 bg-red-950 border-red-800 hover:bg-red-900"
          onClick={fetchMetrics}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Usar dados reais ou dados de exemplo como fallback
  const displayData = metricsData || {
    leadData,
    conversionData,
    funnelData,
    totalLeads: 0,
    qualifiedLeads: 0,
    unqualifiedLeads: 0,
    conversionRate: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Métricas de Leads</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant="outline"
              className="bg-[#1E1E1E] text-white border-[#272727] hover:bg-[#272727]"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {formatDateRange()}
            </Button>
            {isDatePickerOpen && (
              <div className="absolute right-0 top-full mt-2 z-10">
                <DateRangePicker
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from || new Date()}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    setDateRange(range)
                    handleDateRangeChange(range)
                    setIsDatePickerOpen(false)
                  }}
                />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="bg-[#1E1E1E] text-white border-[#272727] hover:bg-[#272727]"
            onClick={updateLeadMetrics}
            disabled={isUpdatingMetrics}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isUpdatingMetrics ? "animate-spin" : ""}`} />
            {isUpdatingMetrics ? "Atualizando..." : "Atualizar Métricas"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-[#1E1E1E] text-white border-[#272727] hover:bg-[#272727]">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1E1E1E] border-[#272727] text-white">
              <DropdownMenuLabel>Formato de Exportação</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#272727]" />
              <DropdownMenuItem className="hover:bg-[#272727] cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#272727] cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#E8F3ED]/60 text-sm">Total de Leads</p>
                <h3 className="text-2xl font-bold text-white mt-1">{displayData.totalLeads}</h3>
              </div>
              <div className="bg-[#1E1E1E] p-3 rounded-full">
                <Users className="w-5 h-5 text-[#58E877]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#E8F3ED]/60 text-sm">Leads Qualificados</p>
                <h3 className="text-2xl font-bold text-white mt-1">{displayData.qualifiedLeads}</h3>
              </div>
              <div className="bg-[#1E1E1E] p-3 rounded-full">
                <UserCheck className="w-5 h-5 text-[#58E877]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#E8F3ED]/60 text-sm">Leads Desqualificados</p>
                <h3 className="text-2xl font-bold text-white mt-1">{displayData.unqualifiedLeads}</h3>
              </div>
              <div className="bg-[#1E1E1E] p-3 rounded-full">
                <UserMinus className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#E8F3ED]/60 text-sm">Taxa de Conversão</p>
                <h3 className="text-2xl font-bold text-white mt-1">{displayData.conversionRate.toFixed(1)}%</h3>
              </div>
              <div className="bg-[#1E1E1E] p-3 rounded-full">
                <PercentSquare className="w-5 h-5 text-[#58E877]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">Evolução de Leads</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData.leadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                  <XAxis dataKey="month" stroke="#E8F3ED60" />
                  <YAxis stroke="#E8F3ED60" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#1E1E1E", border: "1px solid #272727", borderRadius: "4px" }}
                    labelStyle={{ color: "#E8F3ED" }}
                    itemStyle={{ color: "#E8F3ED" }}
                  />
                  <Bar dataKey="leads" fill="#58E877" name="Total de Leads" />
                  <Bar dataKey="qualified" fill="#3ABFF8" name="Leads Qualificados" />
                  <Bar dataKey="unqualified" fill="#F87272" name="Leads Desqualificados" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">Taxa de Conversão</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData.conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272727" />
                  <XAxis dataKey="name" stroke="#E8F3ED60" />
                  <YAxis stroke="#E8F3ED60" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#1E1E1E", border: "1px solid #272727", borderRadius: "4px" }}
                    labelStyle={{ color: "#E8F3ED" }}
                    itemStyle={{ color: "#E8F3ED" }}
                  />
                  <Area type="monotone" dataKey="taxa" stroke="#58E877" fill="#58E87720" name="Taxa de Conversão (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">Funil de Conversão</h3>
            <div className="h-[300px]">
              <FunnelChart data={displayData.funnelData} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0F0F0F] border-[#272727]">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">Distribuição por Idade</h3>
            <div className="h-[300px]">
              <AgeChart data={ageData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

