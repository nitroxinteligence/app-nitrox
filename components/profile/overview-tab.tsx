import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, MessageSquare, ArrowUpCircle } from "lucide-react"
import type React from "react" // Import React
import { motion } from "framer-motion"

interface OverviewTabProps {
  stats: Array<{ title: string; value: string; icon: React.ElementType }>
  quickActions: Array<{ title: string; icon: React.ElementType; href: string }>
  setSelectedTab: (tab: string) => void
}

export function OverviewTab({ stats, quickActions, setSelectedTab }: OverviewTabProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="space-y-12 bg-[#0A0A0B] border border-[#272727] rounded-lg p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Ações Rápidas</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} {...action} setSelectedTab={setSelectedTab} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Atividade Recente</h2>
          <Card className="bg-[#0F0F10] border-[#272727]">
            <CardContent className="p-6">
              <ul className="space-y-4">
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#58E877]" />
                    <span className="text-[#E8F3ED]/60 text-base">Novo membro adicionado à equipe</span>
                  </div>
                  <span className="text-sm text-[#E8F3ED]/40">Há 2 horas</span>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#58E877]" />
                    <span className="text-[#E8F3ED]/60 text-base">Chat iniciado com Agente de Vendas</span>
                  </div>
                  <span className="text-sm text-[#E8F3ED]/40">Há 1 dia</span>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-[#58E877]" />
                    <span className="text-[#E8F3ED]/60 text-base">Plano atualizado para Pro</span>
                  </div>
                  <span className="text-sm text-[#E8F3ED]/40">Há 3 dias</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <Card className="bg-[#0F0F10] border-[#272727]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[#E8F3ED]/60">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[#58E877]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
      </CardContent>
    </Card>
  )
}

function QuickActionCard({ title, icon: Icon, href, setSelectedTab }) {
  const handleClick = () => {
    const tabName = title === "Plano" ? title : title.split(" ")[0]
    setSelectedTab(tabName)
  }

  return (
    <Card
      className="bg-[#0F0F10] border-[#272727] hover:border-[#58E877] transition-all duration-300 cursor-pointer group"
      onClick={handleClick}
    >
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="p-3 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300 bg-transparent border border-[#272727]">
          <Icon className="h-6 w-6 text-[#58E877]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-[#E8F3ED]/60">Clique para acessar</p>
      </CardContent>
    </Card>
  )
}

