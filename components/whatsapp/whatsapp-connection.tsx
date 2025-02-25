"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WhatsAppConnectionProps {
  onClose: () => void
  onSuccess: (connection: any) => void
}

export function WhatsAppConnection({ onClose, onSuccess }: WhatsAppConnectionProps) {
  const [step, setStep] = useState<"initial" | "connecting" | "success">("initial")

  const handleStart = () => {
    setStep("connecting")

    // Simular conexão bem-sucedida após 3 segundos
    setTimeout(() => {
      setStep("success")
      onSuccess({
        id: Date.now().toString(),
        title: "Nova Conexão",
        status: "conectado",
        phoneNumber: "5581999999999",
        contacts: 0,
        messages: 0,
        avatar: "/placeholder.svg",
      })
    }, 3000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md bg-[#121214] rounded-lg p-6 shadow-xl"
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 text-white/70 hover:text-black hover:bg-white"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <h2 className="text-2xl font-bold text-white mb-4">Conectar WhatsApp</h2>

        {step === "initial" && (
          <div className="space-y-4">
            <p className="text-white/70">Clique no botão abaixo para iniciar o processo de conexão.</p>
            <Button onClick={handleStart} className="w-full bg-[#58E877] text-black hover:bg-[#4EDB82]">
              Iniciar Conexão
            </Button>
          </div>
        )}

        {step === "connecting" && (
          <div className="space-y-4">
            <p className="text-white/70">Conectando ao WhatsApp...</p>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#58E877]" />
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <p className="text-[#58E877]">Conexão estabelecida com sucesso!</p>
            <Button onClick={onClose} className="w-full bg-[#58E877] text-black hover:bg-[#4EDB82]">
              Fechar
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

