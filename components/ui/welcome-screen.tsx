"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatHistoryPopup } from "@/components/chat/chat-history-popup"
import { toast } from "@/components/ui/use-toast"
import { ChatInput } from "@/components/chat/chat-input"

interface WelcomeScreenProps {
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>
  isLoading: boolean
  userName?: string
  agentId?: string
}

export function WelcomeScreen({ 
  onSendMessage, 
  isLoading, 
  userName = "usuário",
  agentId = "default" 
}: WelcomeScreenProps) {
  const [timeOfDay, setTimeOfDay] = useState("")
  const [isWebSearchActive, setIsWebSearchActive] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  
  // Determinar o horário do dia para saudação
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setTimeOfDay("Bom dia")
    } else if (hour >= 12 && hour < 18) {
      setTimeOfDay("Boa tarde")
    } else {
      setTimeOfDay("Boa noite")
    }
  }, [])
  
  const toggleWebSearch = () => {
    const newState = !isWebSearchActive;
    setIsWebSearchActive(newState);
    // Armazenar no localStorage para persistir entre componentes
    localStorage.setItem('webSearchEnabled', newState.toString());
    
    toast({
      title: newState ? "Pesquisa na Web ativada" : "Pesquisa na Web desativada",
      description: newState 
        ? "Suas próximas mensagens serão processadas com pesquisa na web" 
        : "As mensagens não serão mais processadas com pesquisa na web",
      variant: "default",
    });
  }

  // Carregar a configuração de pesquisa na web do localStorage ao iniciar
  useEffect(() => {
    const savedWebSearchSetting = localStorage.getItem('webSearchEnabled');
    if (savedWebSearchSetting !== null) {
      setIsWebSearchActive(savedWebSearchSetting === 'true');
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-1.5 text-[#f4f4f4] hover:text-white hover:bg-[#272727]"
          aria-label="Abrir histórico de chats"
        >
          <History className="h-4 w-4" />
          <span>Histórico</span>
        </Button>
      </div>

      <motion.div 
        className="w-full max-w-2xl flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-3">{timeOfDay}, {userName}.</h1>
        <p className="text-xl text-[#f4f4f4]/80 mb-12">Como posso ajudar você hoje?</p>
        
        <div className="w-full">
          <ChatInput
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            showAttachments={true}
            onSearchWeb={toggleWebSearch}
            isWebSearchActive={isWebSearchActive}
          />
        </div>
      </motion.div>

      <ChatHistoryPopup
        agentId={agentId}
        currentSessionId=""
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onCreateNew={() => {}}
      />
    </div>
  )
} 