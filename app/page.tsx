"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BarChart2, Users, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, UserCheck, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar } from "recharts"
import NextLink from "next/link"
import { AdvancedSearch } from "@/components/advanced-search"
import { LeadsChart } from "@/components/dashboard/leads-chart"
import { DashboardProvider } from "@/contexts/DashboardContext"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { AgentGrid } from "@/components/agents/agent-grid"

const chartData = [
  { name: "Jan", value: 400, leads: 240, conversions: 120, disqualifiedLeads: 80, qualifiedLeads: 160 },
  { name: "Fev", value: 300, leads: 139, conversions: 80, disqualifiedLeads: 59, qualifiedLeads: 80 },
  { name: "Mar", value: 500, leads: 980, conversions: 240, disqualifiedLeads: 740, qualifiedLeads: 240 },
  { name: "Abr", value: 278, leads: 390, conversions: 180, disqualifiedLeads: 210, qualifiedLeads: 180 },
  { name: "Mai", value: 789, leads: 480, conversions: 220, disqualifiedLeads: 260, qualifiedLeads: 220 },
  { name: "Jun", value: 639, leads: 380, conversions: 210, disqualifiedLeads: 170, qualifiedLeads: 210 },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

async function getOpenAICost(retries = 1): Promise<number> {
  try {
    const response = await fetch('/api/openai-cost')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch OpenAI cost')
    }
    
    return data.total_cost
  } catch (error) {
    console.error('Error fetching OpenAI cost:', error)
    
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retrying
      return getOpenAICost(retries - 1)
    }
    
    return 0 // Return 0 if all retries failed
  }
}

export default function InicioPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [openAICost, setOpenAICost] = useState<number>(0)

  const handleMouseEnter = (index: number) => {
    setHoveredCard(index)
  }

  const handleMouseLeave = () => {
    setHoveredCard(null)
  }

  const quickActions = [
    { label: "Gerenciar Equipe", icon: Users, href: "/perfil?tab=Perfil" },
    { label: "Analisar Dashboards", icon: BarChart2, href: "/dashboard" },
    { label: "Analisar Custos", icon: DollarSign, href: "/perfil?tab=Custos" },
    { label: "Comprar mais Créditos", icon: CreditCard, href: "/perfil?tab=Plano" },
  ]

  useEffect(() => {
    let isMounted = true

    const fetchCost = async () => {
      const cost = await getOpenAICost(2) // Allow 2 retries
      if (isMounted) {
        setOpenAICost(cost)
      }
    }

    fetchCost()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <DashboardProvider>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-[#0A0A0B] p-6"
      >
        {/* Header Section */}
        <motion.div 
          className="mb-8"
          variants={itemVariants}
        >
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent">
              Visão Águia da Plataforma
            </span>
          </h1>
          <p className="text-white/60">Aqui você tem uma visão geral de tudo que está acontecendo na plataforma.</p>
        </motion.div>

        {/* Advanced Search Bar */}
        <motion.div 
          className="mb-8 relative flex items-center"
          variants={itemVariants}
        >
          <div className="relative flex-1">
            <AdvancedSearch />
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div variants={itemVariants}>
          <MetricsCards />
        </motion.div>

        {/* Main Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={itemVariants}
        >
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Leads Chart */}
            <motion.div variants={itemVariants}>
              <LeadsChart />
            </motion.div>

            {/* Quick Access Grid */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={itemVariants}
            >
              {[
                {
                  href: "/dashboard?tab=Leads",
                  icon: Users,
                  label: "Dashboard de Métricas",
                  description: "Visão geral de leads",
                },
                {
                  href: "/crm",
                  icon: UserCheck,
                  label: "CRM e Movimentações",
                  description: "Clique para acessar",
                },
                {
                  href: "/perfil?tab=Configurações",
                  icon: MessageSquare,
                  label: "Conversas",
                  description: "Monitre em tempo real",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  custom={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <NextLink href={item.href}>
                    <motion.div
                      className="group relative h-auto w-full cursor-pointer overflow-hidden rounded-[10px] bg-[#0F0F10] border border-[#272727] hover:border-[#58E877]/20"
                      transition={{ duration: 0.3 }}
                    >
                      {/* Gradient overlay */}
                      <div
                        className="absolute inset-0 opacity-30 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none"
                        style={{
                          background: `
                            radial-gradient(circle at top, rgba(88, 232, 119, 0.2), transparent 70%),
                            linear-gradient(180deg, 
                              rgba(88, 232, 119, 0.1) 0%,
                              rgba(24, 24, 24, 0.9) 50%,
                              rgba(24, 24, 24, 1) 100%
                            )
                          `,
                        }}
                      />

                      {/* Content wrapper */}
                      <div className="relative z-10 flex flex-col space-y-6 p-6">
                        {/* Icon container */}
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#181818]/40 backdrop-blur-sm">
                          <item.icon className="h-6 w-6 text-[#58E877] transition-transform duration-300 group-hover:scale-110" />
                        </div>

                        {/* Text content */}
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold leading-tight tracking-tight text-white group-hover:text-[#58E877] transition-colors duration-300">
                            {item.label}
                          </h3>
                          <p className="text-base font-normal leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </NextLink>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Column */}
          <motion.div 
            className="space-y-6"
            variants={itemVariants}
          >
            {/* N8N Agents Monitoring */}
            <Card className="bg-[#0F0F10] border-[#272727]">
              <CardHeader>
                <CardTitle className="text-white">Status dos Agentes</CardTitle>
                <CardDescription className="text-[#E8F3ED]/60">
                  Monitoramento em tempo real dos Agentes de IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentGrid />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </DashboardProvider>
  )
}

