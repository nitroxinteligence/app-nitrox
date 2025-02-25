"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { DepartmentFilter } from "@/components/department-filter"
import { OverviewTab } from "@/components/whatsapp/overview-tab"
import { MessagesTab } from "@/components/whatsapp/messages-tab"
import { ConnectionTab } from "@/components/whatsapp/connection-tab"
import { SettingsTab } from "@/components/whatsapp/settings-tab"

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function WhatsAppConnectionPage() {
  const { id } = useParams()
  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const tabs = ["Mensagens", "Conexão", "Configurações"]

  // Aqui você buscaria os detalhes da conexão com base no ID
  // Por enquanto, vamos usar dados mockados
  const connectionDetails = {
    title: "Conexão WhatsApp",
    phoneNumber: "5581999999999",
    status: "conectado",
    contacts: 1234,
    messages: 5678,
  }

  const getTabContent = () => {
    switch (selectedTab) {
      case null:
        return <OverviewTab connectionDetails={connectionDetails} />
      case "Mensagens":
        return <MessagesTab connectionId={id as string} />
      case "Conexão":
        return <ConnectionTab connectionDetails={connectionDetails} />
      case "Configurações":
        return <SettingsTab connectionId={id as string} />
      default:
        return <OverviewTab connectionDetails={connectionDetails} /> // Default to OverviewTab
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="container mx-auto p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent"
      >
        {connectionDetails.title}
      </motion.h1>

      <div className="space-y-4">
        <DepartmentFilter departments={tabs} selectedDepartment={selectedTab} onSelectDepartment={setSelectedTab} />

        <Card className="bg-[#121214] border-[#272727]">
          <CardContent className="p-6">{getTabContent()}</CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

