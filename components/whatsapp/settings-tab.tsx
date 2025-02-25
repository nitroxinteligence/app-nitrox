import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"

interface SettingsTabProps {
  connectionId: string
}

export function SettingsTab({ connectionId }: SettingsTabProps) {
  const [name, setName] = useState("Conexão WhatsApp")
  const [notifications, setNotifications] = useState(true)

  const handleSaveSettings = () => {
    // Aqui você implementaria a lógica para salvar as configurações
    console.log(`Salvando configurações para a conexão ${connectionId}`)
  }

  const variants = {
    hidden: { opacity: 0, y: 50 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
  }

  return (
    <motion.div variants={variants} initial="hidden" animate="enter" exit="exit" className="space-y-6">
      <h2 className="text-2xl font-semibold text-white">Configurações</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="connection-name" className="text-white">
            Nome da Conexão
          </Label>
          <Input
            id="connection-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#1a1a1c] border-[#272727] text-white mt-1"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications" className="text-white">
            Notificações
          </Label>
          <Switch
            id="notifications"
            checked={notifications}
            onCheckedChange={setNotifications}
            className="data-[state=checked]:bg-[#58E877]"
          />
        </div>
        <Button
          onClick={handleSaveSettings}
          className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 group"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white to-[#E8F3ED] p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>

          <span className="relative z-10 block px-5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#181818] text-sm">
            <div className="relative z-10 flex items-center justify-center">
              <span className="transition-all duration-500 text-sm text-white">Salvar Configurações</span>
            </div>
          </span>
        </Button>
      </div>
    </motion.div>
  )
}

