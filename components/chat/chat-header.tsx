"use client"

import { useState } from "react"
import { BriefingDialog } from "@/components/briefing/briefing-dialog"
import { BriefingButton } from "@/components/briefing/briefing-button"
import { Globe, Search, Loader2, History, PlusCircle, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatHistoryPopup } from "@/components/chat/chat-history-popup"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase-client"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ChatHeaderProps {
  title: string
  agentId: string
  sessionId: string
  webSearchStatus?: "enabled" | "disabled" | "searching"
}

export function ChatHeader({ title, agentId, sessionId, webSearchStatus = "disabled" }: ChatHeaderProps) {
  const [isBriefingOpen, setIsBriefingOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const router = useRouter()

  const createNewChat = async () => {
    try {
      const timestamp = new Date().getTime()
      const newSessionId = `${agentId}_${timestamp}`

      // Criar nova sessão
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert([{
          id: newSessionId,
          agent_id: agentId,
          title: "Novo Chat",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      router.push(`/chat/${agentId}/${data.id}`)
      setIsHistoryOpen(false)
    } catch (error) {
      console.error("Error creating new chat:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar um novo chat. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-b border-[#272727] bg-[#0A0A0B] z-10">
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/chats')}
                className="mr-2 p-1 rounded-full hover:bg-[#272727] text-white"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Voltar para Chats</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <BriefingButton onClick={() => setIsBriefingOpen(true)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Briefing do seu Negócio</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {webSearchStatus !== "disabled" && (
          <div className="flex items-center gap-1.5 bg-[#272727] px-2.5 py-1 rounded-full ml-2">
            {webSearchStatus === "searching" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 text-[#58E877] animate-spin" />
                <span className="text-xs text-[#f4f4f4]">Pesquisando...</span>
              </>
            ) : (
              <>
                <Globe className="h-3.5 w-3.5 text-[#58E877]" />
                <span className="text-xs text-[#f4f4f4]">Web ativa</span>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 text-white hover:bg-[#272727]"
                aria-label="Abrir histórico de chats"
              >
                <History className="h-4 w-4" />
                <span>Histórico</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Ver histórico de chats</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={createNewChat}
                className="ml-2 p-1 rounded-full hover:bg-[#272727] text-white"
                aria-label="Criar novo chat"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Novo chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <BriefingDialog
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        agentId={agentId}
      />
      
      <ChatHistoryPopup
        agentId={agentId}
        currentSessionId={sessionId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onCreateNew={createNewChat}
      />
    </div>
  )
}

