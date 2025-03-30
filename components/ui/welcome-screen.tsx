"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, ArrowUpIcon, Paperclip, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChatHistoryPopup } from "@/components/chat/chat-history-popup"
import { toast } from "@/components/ui/use-toast"

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
  const [message, setMessage] = useState("")
  const [timeOfDay, setTimeOfDay] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() && !attachments.length) return
    
    // Armazenar o estado atual da pesquisa na web em uma variável
    // para que seja usado mesmo se o estado for atualizado durante o processamento
    const webSearchActive = isWebSearchActive;
    
    // Incluir informação de webSearch no localStorage para o ChatInterface acessar
    if (webSearchActive) {
      localStorage.setItem('webSearchEnabled', 'true');
    }
    
    await onSendMessage(message, attachments.length > 0 ? attachments : undefined);
    setMessage("")
    setAttachments([])
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments(Array.from(e.target.files))
    }
  }

  const toggleWebSearch = () => {
    const newState = !isWebSearchActive;
    setIsWebSearchActive(newState);
    toast({
      title: newState ? "Pesquisa na Web ativada" : "Pesquisa na Web desativada",
      description: newState 
        ? "Suas próximas mensagens serão processadas com pesquisa na web" 
        : "As mensagens não serão mais processadas com pesquisa na web",
      variant: "default",
    });
  }

  // Atualizar ariaLabel para acessibilidade
  const webSearchAriaLabel = isWebSearchActive 
    ? "Desativar pesquisa na web" 
    : "Ativar pesquisa na web";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <motion.div 
        className="w-full max-w-2xl flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-3">{timeOfDay}, {userName}.</h1>
        <p className="text-xl text-[#f4f4f4]/80 mb-12">Como posso ajudar você hoje?</p>
        
        <div className="w-full">
          <form onSubmit={handleSubmit} className="relative">
            <div className="rounded-xl bg-[#1c1c1c] p-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="O que você deseja saber?"
                className="w-full bg-transparent border-none text-white resize-none outline-none placeholder:text-[#f4f4f4]/40 min-h-[100px]"
              />
              
              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="bg-[#272727] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer p-2 rounded-full text-[#f4f4f4]/60 hover:text-white hover:bg-[#272727]">
                    <Paperclip className="h-5 w-5" />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileChange} 
                      multiple
                    />
                  </label>
                  
                  <button
                    type="button"
                    onClick={toggleWebSearch}
                    className={`flex items-center gap-2 px-3 py-1 ml-2 rounded-full ${
                      isWebSearchActive ? 
                      "bg-[#57E676]/20 text-[#57E676] hover:bg-[#57E676]/30" : 
                      "text-[#f4f4f4]/60 hover:text-white hover:bg-[#272727]"
                    }`}
                    aria-label={webSearchAriaLabel}
                  >
                    <Search className="h-4 w-4" />
                    <span className="text-sm">Pesquisa na Web</span>
                  </button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-1.5 text-[#f4f4f4]/60 hover:text-white hover:bg-[#272727] ml-2"
                    aria-label="Abrir histórico de chats"
                  >
                    <History className="h-4 w-4" />
                    <span className="text-sm">Histórico</span>
                  </Button>
                </div>
                
                <Button
                  type="submit"
                  disabled={(!message.trim() && !attachments.length) || isLoading}
                  className={cn(
                    "rounded-full p-2.5 bg-[#58E877] hover:bg-[#4EDB82] disabled:opacity-50",
                    (!message.trim() && !attachments.length) ? "text-[#1a1a1c]/60" : "text-[#1a1a1c]"
                  )}
                >
                  <ArrowUpIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </form>
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