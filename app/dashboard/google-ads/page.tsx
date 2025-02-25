'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TooltipProvider, 
  TooltipTrigger, 
  Tooltip as TooltipComponent,
  TooltipContent 
} from '@/components/ui/tooltip'
import { Download, FileText, FileSpreadsheet, Filter } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import StatCard from '@/components/dashboard/google-ads/stat-card'
import ClicksImpressions from '@/components/dashboard/google-ads/clicks-impressions'
import ConversionCost from '@/components/dashboard/google-ads/conversion-cost'
import CostPerClick from '@/components/dashboard/google-ads/cost-per-click'
import CampaignsTable from '@/components/dashboard/google-ads/campaigns-table'
import DevicePerformance from '@/components/dashboard/google-ads/device-performance'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { DateRangePicker } from '@/components/date-range-picker' // Importing DateRangePicker

export default function GoogleAdsDashboardPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  })
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false)

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    setDateRange(range)
    // Here you would fetch new data based on the selected range
    console.log('Selected date range:', range)
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-regular">
                <span className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent">
                  Dashboard de Google Ads
                </span>
              </h1>
              <p className="text-[#E8F3ED]/60 mt-1">
                Métricas e análises de performance de campanhas Google Ads
              </p>
            </div>
            <div className="flex items-center gap-4">
              <DateRangePicker // Adding the DateRangePicker component
                isOpen={isDateRangePickerOpen}
                onClose={() => setIsDateRangePickerOpen(false)}
                onDateRangeChange={handleDateRangeChange}
              />
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10"
                onClick={() => setIsDateRangePickerOpen(true)}
              >
                <Filter className="h-4 w-4 text-white/80" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 bg-[#1E1E1E] text-white hover:bg-[#2A2A2C] rounded-full px-6">
                    <Download className="w-4 h-4 text-white" />
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
            <p className="text-white/70 text-sm">Período: {dateRange.from ? format(dateRange.from, 'dd MMM yyyy') + ' - ' + format(dateRange.to, 'dd MMM yyyy') : 'Selecione um período'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Cliques & Impressões"
              stats={[
                { label: 'Cliques', value: '2,9 mil', change: 62.7 },
                { label: 'CTR', value: '6,7%', change: -37.4 },
                { label: 'Impressões', value: '43,6 mil', change: 160.0 },
              ]}
            />
            <StatCard
              title="Taxa de Conversão & Custo"
              stats={[
                { label: 'Conversões', value: '282,8', change: 128.9 },
                { label: 'Taxa conv.', value: '9,6%', change: 40.7 },
                { label: 'Custo/conv.', value: 'R$ 8,02', change: -35.8 },
              ]}
            />
            <StatCard
              title="Custo por Clique"
              stats={[
                { label: 'Custo', value: 'R$ 2,27 mil', change: 1.2 },
                { label: 'CPC médio', value: 'R$ 0,77', change: -37.8 },
                { label: 'Avg. CPM', value: 'R$ 52,01', change: -61.1 },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ClicksImpressions />
            <ConversionCost />
            <CostPerClick />
          </div>

          <div className="mb-8">
            <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Campanhas</CardTitle>
                <CardDescription className="text-[#E8F3ED]/60">
                  Desempenho detalhado das campanhas ativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <CampaignsTable />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <DevicePerformance />
          </div>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}

