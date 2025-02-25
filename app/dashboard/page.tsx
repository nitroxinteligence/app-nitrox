"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MetricsDashboard } from "@/components/dashboard/metrics-dashboard"
import { DashboardProvider } from "@/contexts/DashboardContext"
import { DateFilter } from "@/components/dashboard/date-filter"
import { useDashboardContext } from "@/contexts/DashboardContext"

const dashboardInformation = {
  Métricas: {
    title: "Dashboard de Métricas",
    description: "Análise detalhada de geração e qualificação de leads",
  },
  "Google Ads": {
    title: "Dashboard de Google Ads",
    description: "Métricas e análises de performance de campanhas Google Ads",
  },
  "Meta Ads": {
    title: "Dashboard de Meta Ads",
    description: "Métricas e análises de desempenho de campanhas Meta Ads",
  },
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5, ease: "easeOut" }
}

function DashboardContent() {
  const { setDateRange } = useDashboardContext()
  const { title, description } = dashboardInformation["Métricas"]

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
                <DateFilter onDateRangeChange={setDateRange} />
              </div>
              <p className="max-w-2xl text-[#E8F3ED]/60 text-lg font-normal">{description}</p>
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

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}

