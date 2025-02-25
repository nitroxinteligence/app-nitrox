"use client"

import React, { useState, useEffect } from 'react'
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis } from 'recharts'
import { ArrowUpRight, ArrowDownRight, HelpCircle, Info, TrendingUp } from 'lucide-react'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from 'framer-motion'
import { MetricSkeleton } from '@/components/ui/skeleton'
import { useDashboardContext } from '@/contexts/DashboardContext'

const numberFormatter = (number: number) => 
  Intl.NumberFormat('en-US').format(number).toString()

const formatChange = (current: number, previous: number): string => {
  if (!previous) return '0.0'
  const change = ((current - previous) / previous) * 100
  return change.toFixed(1)
}

interface MetricData {
  date: string
  value: number
}

interface Metric {
  name: string
  key: 'total_leads' | 'qualified_leads' | 'unqualified_leads' | 'conversion_rate'
  color: string
  valueFormatter: (value: number) => string
  description: string
}

function MetricCard({ metric }: { metric: Metric }) {
  const { data, isLoading } = useDashboardContext()
  const [chartData, setChartData] = useState<MetricData[]>([])
  
  // Process chart data
  useEffect(() => {
    if (data.leadMetrics.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayData = data.leadMetrics.filter(record => 
        new Date(record.date).toISOString().split('T')[0] === today
      ).map(record => ({
        date: new Date(record.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value: record[metric.key] || 0
      }));

      setChartData(todayData);
    }
  }, [data.leadMetrics, metric.key]);

  // Get current value (today's metrics)
  const today = new Date().toISOString().split('T')[0];
  const currentMetrics = data.leadMetrics.find(metric => 
    new Date(metric.date).toISOString().split('T')[0] === today
  ) || {};
  const value = currentMetrics[metric.key] || 0;
  
  // Get previous value (yesterday's metrics)
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
  const previousMetrics = data.leadMetrics.find(metric => 
    new Date(metric.date).toISOString().split('T')[0] === yesterday
  ) || {};
  const previousValue = previousMetrics[metric.key] || 0;

  const formattedValue = metric.valueFormatter(value)
  const changePercentage = previousValue ? ((value - previousValue) / previousValue) * 100 : 0

  if (isLoading || !data.leadMetrics.length) {
    return <MetricSkeleton />
  }

  return (
    <div className="p-6 bg-[#0F0F0F] border border-[#272727] rounded-lg space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-white/90">{metric.name}</h3>
        <div className={cn("w-2 h-2 rounded-full")} style={{ backgroundColor: metric.color }} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-white/40" />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1E1E1E] border-[#272727] text-white">
              <p className="text-xs">{metric.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="text-2xl font-semibold text-white">{formattedValue}</div>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center text-xs",
            changePercentage > 0 ? "text-[#58E877]" : "text-red-500"
          )}
        >
          {changePercentage > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(changePercentage).toFixed(1)}%
        </div>
        <span className="text-xs text-white/40">vs. ontem</span>
      </div>
      <div className="h-[120px] mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              left: 0,
              right: 0,
              top: 5,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              vertical={false} 
              stroke="#272727" 
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: '#666666', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <Area
              type="natural"
              dataKey="value"
              stroke={metric.color}
              fill={`url(#gradient-${metric.key})`}
              fillOpacity={0.4}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/40 mt-2">
        <TrendingUp className="h-3 w-3" />
        <span>Dados de hoje</span>
      </div>
    </div>
  )
}

export function MetricsCards() {
  const metrics: Metric[] = [
    {
      name: "Leads Capturados",
      key: "total_leads",
      color: "#58E877",
      valueFormatter: (value: number) => numberFormatter(value),
      description: "Total de leads capturados hoje"
    },
    {
      name: "Leads Qualificados",
      key: "qualified_leads",
      color: "#58E877",
      valueFormatter: (value: number) => numberFormatter(value),
      description: "Total de leads qualificados hoje"
    },
    {
      name: "Leads Desqualificados",
      key: "unqualified_leads",
      color: "#FFA500",
      valueFormatter: (value: number) => numberFormatter(value),
      description: "Total de leads desqualificados hoje"
    },
    {
      name: "Taxa de Conversão",
      key: "conversion_rate",
      color: "#58E877",
      valueFormatter: (value: number) => `${value.toFixed(2)}%`,
      description: "Taxa de conversão do dia"
    }
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  )
} 