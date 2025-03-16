"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
import { LoadingScreen } from "@/components/loading-screen"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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

export default function InicioPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [showInitializing, setShowInitializing] = useState(true)
  const { user, loading } = useAuth()
  const router = useRouter()

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

  // Efeito para garantir que o componente só renderize no cliente
  useEffect(() => {
    setIsMounted(true)
    
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [])

  // Efeito para verificar se é o primeiro acesso após o login
  useEffect(() => {
    if (!isMounted) return

    // Verificar se é o primeiro acesso após o login
    const isFirstAccess = sessionStorage.getItem('firstAccess') !== 'false'
    
    if (!isFirstAccess) {
      setShowInitializing(false)
    } else {
      // Marcar que não é mais o primeiro acesso
      sessionStorage.setItem('firstAccess', 'false')
    }
  }, [isMounted])

  // Renderiza um estado vazio até que o componente esteja montado
  if (!isMounted || loading) {
    return null
  }

  // Verificar se o usuário está autenticado
  if (!user) {
    // O AuthGuard já vai redirecionar, mas esta é uma camada extra de segurança
    router.push('/login')
    return null
  }

  const handleSyncCompletionsData = async () => {
    try {
      setIsLoading(true);
      toast.info('Sincronizando dados da OpenAI...', { id: 'sync-data' });
      await syncCompletionsData();
      toast.success('Dados sincronizados com sucesso!', { id: 'sync-data' });
    } catch (error) {
      console.error('❌ Erro ao sincronizar dados de completions:', error);
      
      // Extrair mensagem de erro mais detalhada da API quando disponível
      let errorMessage = error instanceof Error ? error.message : 'Erro de conexão com a API';
      let errorDescription = 'Verifique a conexão ou tente novamente mais tarde.';
      
      // Tentar extrair informações mais detalhadas de erros da OpenAI
      if (errorMessage.includes('OpenAI') || errorMessage.includes('API')) {
        try {
          // Tentar extrair o JSON do erro da OpenAI se estiver presente
          const openaiErrorMatch = errorMessage.match(/\{[\s\S]*\}/);
          if (openaiErrorMatch) {
            const errorJson = JSON.parse(openaiErrorMatch[0]);
            if (errorJson.error && errorJson.error.message) {
              errorDescription = `Erro da OpenAI: ${errorJson.error.message}`;
            }
          }
        } catch (e) {
          console.warn('Não foi possível extrair detalhes do erro da OpenAI:', e);
        }
      }
      
      toast.error('Erro ao sincronizar dados de completions', {
        id: 'sync-data',
        description: errorDescription
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardProvider>
      <AnimatePresence>
        {showInitializing && (
          <LoadingScreen 
            duration={3000}
            onComplete={() => setShowInitializing(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial="hidden"
        animate={isLoading || showInitializing ? "hidden" : "visible"}
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
            {/* Agents Card */}
            <Card className="bg-[#0F0F0F] border-[#272727]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-medium text-white">
                    Monitoramento em tempo real dos Agentes de IA
                  </CardTitle>
                  <CardDescription className="text-sm text-[#727272]">
                    Seus agentes de IA estão operacionais e conectados
                  </CardDescription>
                </div>
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

