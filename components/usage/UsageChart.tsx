"use client"

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { DollarSign, Zap } from 'lucide-react'

// Tipos para os dados do gráfico
interface DailyUsageData {
  date: string
  amount: number // custo em BRL
  totalTokens?: number // tokens totais
}

interface UsageChartProps {
  data: DailyUsageData[]
  title?: string
  description?: string
}

// Personalização do tooltip do gráfico
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-sm border border-white/10 p-3 rounded-lg shadow-lg text-white">
        <p className="text-xs text-[#adadad] mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`tooltip-${index}`} className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-1">
              {entry.dataKey === 'cost' ? (
                <DollarSign className="h-3 w-3 text-gray-300" />
              ) : (
                <Zap className="h-3 w-3 text-gray-300" />
              )}
              <span className="text-xs">{entry.dataKey === 'cost' ? 'Custo:' : 'Tokens:'}</span>
            </div>
            <span className="font-medium text-sm">
              {entry.dataKey === 'cost' 
                ? `R$ ${entry.value.toFixed(2)}` 
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function UsageChart({ data, title, description }: UsageChartProps) {
  const [chartView, setChartView] = useState<'cost' | 'tokens'>('cost')
  
  // Formatar os dados para o gráfico
  const chartData = data.map(item => ({
    date: item.date,
    cost: item.amount,
    tokens: item.totalTokens || 0
  }))

  // Calcular o custo total para o período exibido
  const totalCost = chartData.reduce((sum, item) => sum + item.cost, 0)
  const totalTokens = chartData.reduce((sum, item) => sum + item.tokens, 0)
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        {(title || description) && (
          <div>
            {title && <h3 className="text-lg font-medium text-white">{title}</h3>}
            {description && (
              <p className="text-sm text-[#adadad]">{description}</p>
            )}
          </div>
        )}
        <div className={`flex items-center gap-2 ${!title && !description ? 'ml-auto' : ''}`}>
          <Button
            size="sm"
            variant={chartView === 'cost' ? 'default' : 'outline'}
            className={chartView === 'cost' 
              ? "bg-[#272727] text-white border-gray-700 hover:bg-[#272727]/80" 
              : "bg-transparent text-[#adadad] border-gray-700 hover:bg-[#272727]/50"}
            onClick={() => setChartView('cost')}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Custo
          </Button>
          <Button
            size="sm"
            variant={chartView === 'tokens' ? 'default' : 'outline'}
            className={chartView === 'tokens' 
              ? "bg-[#272727] text-white border-gray-700 hover:bg-[#272727]/80" 
              : "bg-transparent text-[#adadad] border-gray-700 hover:bg-[#272727]/50"}
            onClick={() => setChartView('tokens')}
          >
            <Zap className="h-4 w-4 mr-1" />
            Tokens
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4 justify-between">
        <Card className="bg-[#0F0F0F] border-[#272727] hover:border-[#323234] transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-[#58E877]" />
            <div>
              <p className="text-xs text-[#adadad]">Custo Total</p>
              <p className="text-lg font-medium text-white">
                R$ {totalCost.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0F0F0F] border-[#272727] hover:border-[#323234] transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-[#58E877]" />
            <div>
              <p className="text-xs text-[#adadad]">Tokens Totais</p>
              <p className="text-lg font-medium text-white">
                {totalTokens.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#58E877" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#58E877" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#58E877" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#58E877" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222224" />
            <XAxis 
              dataKey="date" 
              stroke="#4b4b4b" 
              tick={{ fill: '#4b4b4b', fontSize: 12 }} 
              tickMargin={10}
            />
            <YAxis 
              stroke="#4b4b4b" 
              tick={{ fill: '#4b4b4b', fontSize: 12 }}
              tickFormatter={(value) => chartView === 'cost' 
                ? `R$${value.toFixed(1)}` 
                : value >= 1000 
                  ? `${(value / 1000).toFixed(1)}k` 
                  : value.toString()
              }
            />
            <Tooltip content={<CustomTooltip />} />
            {chartView === 'cost' ? (
              <Area 
                type="monotone" 
                dataKey="cost" 
                stroke="#58E877" 
                fillOpacity={1}
                fill="url(#colorCost)" 
                name="Custo (R$)"
              />
            ) : (
              <Area 
                type="monotone" 
                dataKey="tokens" 
                stroke="#58E877" 
                fillOpacity={1}
                fill="url(#colorTokens)" 
                name="Tokens"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 