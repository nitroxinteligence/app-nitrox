"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { format, subDays } from "date-fns"
import { DashboardLoading } from "@/components/dashboard/loading"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ChartSkeleton } from "@/components/ui/skeleton"

const METRICS = {
  leadsCapturados: {
    key: "leadsCapturados",
    name: "Leads Capturados",
    color: "#58E877"
  },
  leadsQualificados: {
    key: "leadsQualificados",
    name: "Leads Qualificados",
    color: "#32ad4a"
  },
  leadsNaoQualificados: {
    key: "leadsNaoQualificados",
    name: "Leads Não Qualificados",
    color: "#FFA500"
  },
  taxaConversao: {
    key: "taxaConversao",
    name: "Taxa de Conversão",
    color: "#3dff60"
  }
}

export function LeadsChart() {
  const [timeRange, setTimeRange] = React.useState("30d")
  const [metrics, setMetrics] = React.useState<any[]>([])
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [selectedMetric, setSelectedMetric] = React.useState<string | null>(null)

  // Função para buscar dados do Supabase
  const fetchMetrics = React.useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsInitialLoading(true)
      } else {
        setIsUpdating(true)
      }
      
      const daysToSubtract = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30
      const startDate = subDays(new Date(), daysToSubtract)

      const { data, error } = await supabase
        .from('lead_metrics')
        .select('*')
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true })

      if (error) throw error

      const formattedData = data.map(metric => ({
        date: new Date(metric.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        leadsCapturados: metric.total_leads,
        leadsQualificados: metric.qualified_leads,
        leadsNaoQualificados: metric.unqualified_leads,
        taxaConversao: metric.conversion_rate
      }))

      setMetrics(formattedData)
    } catch (error) {
      console.error('Erro ao buscar métricas:', error)
    } finally {
      if (isInitial) {
        setIsInitialLoading(false)
      } else {
        setIsUpdating(false)
      }
    }
  }, [timeRange])

  // Efeito para buscar dados quando o componente montar
  React.useEffect(() => {
    fetchMetrics(true)

    // Configurar subscription em tempo real
    const subscription = supabase
      .channel('lead_metrics_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lead_metrics'
      }, () => {
        fetchMetrics(false)
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Efeito separado para atualizar dados quando timeRange mudar
  React.useEffect(() => {
    if (!isInitialLoading) {
      fetchMetrics(false)
    }
  }, [timeRange])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E1E1E] border border-[#272727] rounded-lg p-3 shadow-lg">
          <p className="text-[#E8F3ED] text-sm mb-2">{label}</p>
          {payload.map((item: any, index: number) => {
            const metric = Object.values(METRICS).find(m => m.key === item.dataKey)
            if (!metric) return null
            if (selectedMetric && selectedMetric !== metric.key) return null
            
            return (
              <div key={index} className="flex items-center gap-2 text-sm py-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: metric.color }}
                />
                <span className="text-[#E8F3ED]">{metric.name}:</span>
                <span className="text-[#E8F3ED] font-medium">
                  {metric.key === "taxaConversao" ? `${item.value}%` : item.value}
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  if (isInitialLoading) {
    return (
      <Card className="w-full bg-[#0F0F10] border-[#272727]">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b border-[#272727] py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle className="text-white">Evolução de Leads</CardTitle>
            <CardDescription className="text-[#E8F3ED]/60">
              Carregando dados...
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartSkeleton />
        </CardContent>
      </Card>
    )
  }

  // Show skeleton when there's no data
  if (!metrics || metrics.length === 0) {
    return (
      <Card className="w-full bg-[#0F0F10] border-[#272727]">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b border-[#272727] py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle className="text-white">Evolução de Leads</CardTitle>
            <CardDescription className="text-[#E8F3ED]/60">
              Nenhum dado disponível
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartSkeleton />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full bg-[#0F0F10] border-[#272727]">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b border-[#272727] py-5 sm:flex-row">
          <motion.div 
            className="grid flex-1 gap-1 text-center sm:text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CardTitle className="text-white">Evolução de Leads</CardTitle>
            <CardDescription className="text-[#E8F3ED]/60">
              Acompanhamento em tempo real das métricas de leads
            </CardDescription>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="w-[160px] rounded-lg sm:ml-auto bg-[#1E1E1E] border-[#272727] text-white"
                aria-label="Selecione um período"
              >
                <SelectValue placeholder="Últimos 30 dias" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-[#1E1E1E] border-[#272727]">
                <SelectItem value="90d" className="rounded-lg text-white">
                  Últimos 90 dias
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg text-white">
                  Últimos 30 dias
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg text-white">
                  Últimos 7 dias
                </SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <motion.div 
            className="flex flex-wrap gap-2 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {Object.values(METRICS).map((metric, index) => (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMetric(selectedMetric === metric.key ? null : metric.key)}
                  className={cn(
                    "border-[#272727] hover:bg-[#272727] hover:text-white transition-colors",
                    selectedMetric === metric.key && "bg-[#272727] text-white"
                  )}
                  style={{
                    color: selectedMetric === metric.key ? metric.color : undefined,
                    borderColor: selectedMetric === metric.key ? metric.color : undefined
                  }}
                >
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: metric.color }} />
                  {metric.name}
                </Button>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            className={cn(
              "h-[300px] w-full transition-opacity duration-300",
              isUpdating && "opacity-60"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  {Object.values(METRICS).map((metric) => (
                    <linearGradient key={metric.key} id={metric.key} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={metric.color} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#272727" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  stroke="#666666"
                  tick={{ 
                    fill: '#666666',
                    fontSize: 11
                  }}
                />
                <YAxis 
                  stroke="#666666"
                  tick={{ 
                    fill: '#666666',
                    fontSize: 11
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Tooltip content={<CustomTooltip />} />
                {Object.values(METRICS).map((metric) => (
                  (!selectedMetric || selectedMetric === metric.key) && (
                    <Area
                      key={metric.key}
                      type="monotone"
                      dataKey={metric.key}
                      stroke={metric.color}
                      strokeWidth={2}
                      fill={`url(#${metric.key})`}
                      name={metric.name}
                      animationDuration={1000}
                      animationBegin={0}
                      animationEasing="ease-out"
                    />
                  )
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

