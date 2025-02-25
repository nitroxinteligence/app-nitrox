"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function ConfigTab() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="space-y-6">
        <Card className="bg-[#0F0F10] border-[#272727]">
          <CardHeader>
            <CardTitle className="text-white">Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-sm text-[#E8F3ED]/60">Notificações por E-mail</label>
                <div className="flex items-center gap-4">
                  <Input
                    type="email"
                    placeholder="Digite seu e-mail"
                    className="bg-[#121214] border-[#272727] text-white"
                    disabled={!isEditing}
                  />
                  <Button
                    variant="outline"
                    className="bg-[#1E1E1E] border-[#272727] hover:bg-[#272727] text-white"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? "Salvar" : "Editar"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

