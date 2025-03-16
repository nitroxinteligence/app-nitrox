"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MetricsDashboard } from "@/components/dashboard/metrics-dashboard"
import { DashboardProvider } from "@/contexts/DashboardContext"
import { DateFilter } from "@/components/dashboard/date-filter"
import { useDashboardContext } from "@/contexts/DashboardContext"
import { ExportMetricsButton } from "@/components/dashboard/export-metrics-button"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { UpdateMetricsButton } from "@/components/dashboard/update-metrics-button"

const metricsInformation = {
  Métricas: {
    title: "Métricas",
    description: "Análise detalhada de geração e qualificação de leads",
  },
  "Google Ads": {
    title: "Métricas do Google Ads",
    description: "Métricas e análises de performance de campanhas Google Ads",
  },
  "Meta Ads": {
    title: "Métricas do Meta Ads",
    description: "Métricas e análises de desempenho de campanhas Meta Ads",
  },
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5, ease: "easeOut" }
}

function MetricsContent() {
  const { setDateRange } = useDashboardContext()
  const { title, description } = metricsInformation["Métricas"]
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>()

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setSelectedDateRange(range)
    setDateRange(range)
  }

  const exportMetrics = (range: DateRange | undefined) => {
    // Implementation of exportMetrics function
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="fixed inset-0 w-full h-full bg-[#0A0A0B] -z-10" />

      <div className="mx-auto max-w-7xl px-4 pt-0 pb-0">
        <motion.div 
          className="relative rounded-2xl bg-[#0A0A0B]/40 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-12 p-8">
            <motion.div 
              className="space-y-4"
              {...fadeInUp}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <h1 className="bg-gradient-to-r from-[#58E877] to-white bg-clip-text text-4xl font-regular text-transparent tracking-[-0.02em]">
                  {title}
                </h1>
                <div className="flex items-center gap-4">
                  <DateFilter onDateRangeChange={handleDateRangeChange} />
                  <UpdateMetricsButton className="bg-gradient-to-r from-[#1E1E1E] to-[#272727] hover:from-[#272727] hover:to-[#323232]" />
                  <Button
                    onClick={() => exportMetrics(selectedDateRange)}
                    className="bg-[#1E1E1E] hover:bg-[#272727] text-white border border-[#272727] transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Métricas
                  </Button>
                </div>
              </div>
              <p className="max-w-2xl text-[#E8F3ED]/60 text-lg font-normal">
                {description}{" "}
                <span className="text-[#58E877]/80 text-sm">
                  Use o botão "Atualizar Métricas" para extrair dados mais recentes do N8N.
                </span>
              </p>
            </motion.div>

            <motion.div 
              className="mt-8"
              {...fadeInUp}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <MetricsDashboard />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function MetricsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  return (
    <DashboardProvider dateRange={dateRange} setDateRange={setDateRange}>
      <MetricsContent />
    </DashboardProvider>
  )
} 