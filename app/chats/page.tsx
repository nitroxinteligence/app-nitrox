"use client"

import { useState, useMemo } from "react"
import { BotCard } from "@/components/bot-card"
import { DepartmentFilter } from "@/components/department-filter"
import { getAgentsByDepartment } from "@/lib/agents"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { ChatSearch } from "@/components/chats/chat-search"

// Define icon names for each agent
const agentIcons: { [key: string]: string } = {
  "cio-coo": "brain",
  inteligencia: "lightbulb",
  estrategista: "chart",
  cmo: "messages",
  copywriter: "messages",
  "estrategias-mkt": "chart",
  researcher: "lightbulb",
  "gestor-trafego": "chart",
  "head-sales": "handshake",
  "pre-vendas": "user",
  "sales-rep": "handshake",
  "head-expansao": "chart",
  suporte: "messages",
  onboarding: "user",
  expansao: "chart",
  rh: "user",
  "inteligencia-mercado": "lightbulb",
  "inteligencia-negocio": "brain",
  "sucesso-cliente": "users",
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function HubPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>("Todos")
  const agentsByDepartment = getAgentsByDepartment()
  const departments = ["Todos", ...Object.keys(agentsByDepartment)]

  const filteredAgentsMemo = useMemo(() => {
    if (selectedDepartment === "Todos") {
      return agentsByDepartment
    }

    const filtered: typeof agentsByDepartment = {}
    if (selectedDepartment && agentsByDepartment[selectedDepartment]) {
      filtered[selectedDepartment] = agentsByDepartment[selectedDepartment]
    }

    return filtered
  }, [agentsByDepartment, selectedDepartment])

  const departmentsToShow =
    selectedDepartment === "Todos" ? Object.keys(filteredAgentsMemo) : selectedDepartment ? [selectedDepartment] : []

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B]"
    >
      <div className="mx-auto max-w-7xl px-4 pt-0 pb-0">
        <div className="relative rounded-2xl bg-[#0A0A0B]/40 backdrop-blur-xl">
          <div className="space-y-6 p-8">
            {/* Header Section */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center space-x-4">
                <h1 className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-4xl font-regular text-transparent tracking-[-0.02em]">
                  Chats Inteligentes
                </h1>
                <div className="relative w-full max-w-md">
                  <ChatSearch />
                </div>
              </div>
              <p className="text-[#E8F3ED]/60 text-lg font-normal max-w-lg">
                Chats inteligentes capacitados e preparados para lidar com cada departamento do seu negócio.
              </p>
            </div>

            {/* Department Filter */}
            <DepartmentFilter
              departments={departments}
              selectedDepartment={selectedDepartment}
              onSelectDepartment={setSelectedDepartment}
            />

            {/* Departments Grid */}
            <Card className="w-full bg-[#0A0A0B]/80 border-white/[0.05]">
              <CardContent className="p-6">
                <div className="space-y-12">
                  {departmentsToShow.map((department) => (
                    <div key={department} className="space-y-8">
                      <h2 className="text-[15px] font-normal text-gray-300 tracking-[0.05em] uppercase">
                        {department}
                      </h2>
                      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3">
                        {filteredAgentsMemo[department]?.map((agent) => (
                          <BotCard
                            key={agent.id}
                            id={agent.id}
                            title={agent.name}
                            description={agent.description}
                            iconName={agentIcons[agent.id] || "circle"}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

