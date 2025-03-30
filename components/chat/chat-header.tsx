"use client"

import { useState } from "react"
import { BriefingDialog } from "@/components/briefing/briefing-dialog"
import { BriefingButton } from "@/components/briefing/briefing-button"
import { Globe, Loader2, History, PlusCircle } from "lucide-react"
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
    <TooltipProvider>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          
          {webSearchStatus !== "disabled" && (
            <div className="flex items-center gap-1.5 bg-[#272727] px-2.5 py-1 rounded-full">
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
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 text-white hover:bg-[#272727]"
                aria-label="Abrir histórico de chats"
              >
                <History className="h-5 w-5" />
                <span>Histórico</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#272727] text-white border-[#383838]">
              Histórico de chats
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={createNewChat}
                className="p-2 rounded-full hover:bg-[#272727] text-white"
                aria-label="Criar novo chat"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#272727] text-white border-[#383838]">
              Novo chat
            </TooltipContent>
          </Tooltip>
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
    </TooltipProvider>
  )
}

