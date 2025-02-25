"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Pencil, Save } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { BriefingService } from "@/lib/briefing-service"
import { toast } from "sonner"

interface BriefingDialogProps {
  isOpen: boolean
  onClose: () => void
  agentId: string
}

export function BriefingDialog({ isOpen, onClose, agentId }: BriefingDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [briefing, setBriefing] = useState("")
  const [savedBriefing, setSavedBriefing] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && agentId) {
      loadBriefing()
    }
  }, [isOpen, agentId])

  const loadBriefing = async () => {
    const briefingData = await BriefingService.getBriefing(agentId)
    if (briefingData) {
      setSavedBriefing(briefingData.content)
      setBriefing(briefingData.content)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const success = await BriefingService.saveBriefing(agentId, briefing)
      if (success) {
        setSavedBriefing(briefing)
        setIsEditing(false)
        toast.success("Briefing salvo com sucesso!")
      } else {
        toast.error("Erro ao salvar o briefing")
      }
    } catch (error) {
      console.error("Error saving briefing:", error)
      toast.error("Erro ao salvar o briefing")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setBriefing(savedBriefing)
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[600px] bg-[#0A0A0B] border-[#272727] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-[#58E877] to-white bg-clip-text text-transparent">
            Briefing do Negócio
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 w-full">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <div className="w-full">
                  <Textarea
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                    placeholder="Descreva informações importantes sobre seu negócio..."
                    className="min-h-[200px] max-h-[400px] w-full overflow-y-auto bg-[#121214] border-[#272727] text-white placeholder:text-white/40 resize-none focus:ring-[#58E877] focus:border-[#58E877] break-all whitespace-pre-wrap"
                    style={{
                      overflowWrap: 'break-word',
                      wordBreak: 'break-all'
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="bg-transparent border-[#272727] text-white hover:bg-[#272727] transition-colors"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-[#58E877] text-black hover:bg-[#4EDB82] transition-colors"
                    disabled={isLoading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="viewing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative w-full space-y-4"
              >
                <div 
                  className="min-h-[200px] max-h-[400px] w-full overflow-y-auto p-3 bg-[#121214] rounded-md border border-[#272727] text-white/80 break-all whitespace-pre-wrap"
                  style={{
                    overflowWrap: 'break-word',
                    wordBreak: 'break-all'
                  }}
                >
                  {savedBriefing || "Nenhuma informação adicionada ainda..."}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleEdit}
                    className="bg-transparent border-[#272727] text-white hover:bg-[#272727] transition-colors gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar briefing
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
} 