"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function NovidadesPopup({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  // Removed useEffect block

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <Card className="w-full max-w-md bg-[#0A0A0B] border-white/[0.05] backdrop-blur-xl">
            <CardHeader className="relative">
              <CardTitle className="text-2xl font-bold text-white">Novidades</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 text-white/70 hover:text-white"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 mb-4">
                Confira as últimas atualizações e recursos adicionados à nossa plataforma!
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Novo dashboard de análise de dados</li>
                <li>Integração aprimorada com WhatsApp</li>
                <li>Tutoriais interativos adicionados</li>
              </ul>
              <Button className="w-full mt-6 bg-[#58E877] text-[#0A0A0B] hover:bg-[#4EDB82]" onClick={onClose}>
                Entendi
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

