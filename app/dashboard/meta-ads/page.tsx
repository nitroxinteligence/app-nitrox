'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, FileSpreadsheet, Filter } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import StatCard from '@/components/dashboard/meta-ads/stat-card'
import ClicksImpressionsChart from '@/components/dashboard/meta-ads/clicks-impressions-chart'
import GaugeMetrics from '@/components/dashboard/meta-ads/gauge-metrics'
import CampaignsTable from '@/components/dashboard/meta-ads/campaigns-table'
import { DateRangePicker } from '@/components/date-range-picker'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MetaAdsDashboardPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null
  })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, "d 'de' MMMM", { locale: ptBR })
      }
      return `${format(dateRange.from, "d 'de' MMM", { locale: ptBR })} - ${format(dateRange.to, "d 'de' MMM", { locale: ptBR })}`
    }
    return 'Período: últimos 30 dias'
  }

  const handleDateRangeChange = (newRange: { from: Date | null; to: Date | null }) => {
    setDateRange(newRange)
    console.log('Fetching data for range:', newRange)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-4xl font-regular text-transparent tracking-[-0.02em]">
              Dashboard de Meta Ads
            </h2>
            <p className="text-[#E8F3ED]/60 mt-1">
              Métricas e análises de desempenho de campanhas Meta Ads
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <Filter className="h-4 w-4 text-white/80" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-[#1E1E1E] text-white hover:bg-[#2A2A2C] rounded-full px-6">
                  <Download className="w-4 h-4" />
                  Exportar Dados
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#2A2A2C] border-white/10">
                <DropdownMenuLabel className="text-white/70">Formato de Exportação</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-[#3A3A3C]">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Exportar como PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-[#3A3A3C]">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>Exportar como CSV</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-white/70 text-sm">{formatDateRange()}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Gastos"
            stats={[
              {
                label: 'Total',
                value: '3.801,00',
                change: 119,
                previousValue: 'R$ 1.738,00'
              }
            ]}
          />
          <StatCard
            title="Cliques"
            stats={[
              {
                label: 'Total',
                value: '175',
                change: -57,
                previousValue: '411'
              }
            ]}
          />
          <StatCard
            title="Impressões"
            stats={[
              {
                label: 'Total',
                value: '6,357',
                change: -21,
                previousValue: '8,048'
              }
            ]}
          />
        </div>

        <div className="space-y-6 mb-8">
          <ClicksImpressionsChart />
          <GaugeMetrics />
        </div>

        <div className="mb-8">
          <CampaignsTable />
        </div>

        <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white/90 text-lg">Resumo geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-900/20 border border-green-900/20 rounded-md p-4">
              <p className="text-green-400 font-medium mb-2">{'Mostrando progresso significativo'}</p>
              <div className="space-y-2 text-sm text-white/80">
                <p>O número de <span className="text-white">Impressões</span> aumentou de <span className="text-white">7.958</span> para <span className="text-white">8.554</span>, representando um aumento de <span className="text-green-400">7,5%</span>.</p>
                <p>Cliques (Todos) tiveram um aumento substancial de <span className="text-white">231</span> para <span className="text-white">328</span>, marcando um aumento de <span className="text-green-400">41,6%</span>.</p>
                <p>O Valor Gasto diminuiu significativamente, caindo de <span className="text-white">R$ 3.463,00</span> para <span className="text-white">R$ 2.089,00</span>, uma redução de <span className="text-green-400">39,6%</span> nos custos.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <DateRangePicker
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>
    </motion.div>
  )
}

