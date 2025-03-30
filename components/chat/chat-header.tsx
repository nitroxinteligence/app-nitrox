"use client"

import { useState } from "react"
import { BriefingDialog } from "@/components/briefing/briefing-dialog"
import { BriefingButton } from "@/components/briefing/briefing-button"
import { Globe, Search, Loader2, History, PlusCircle } from "lucide-react"
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
      <div className="absolute top-0 left-0 right-0 flex justify-end p-4">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={createNewChat}
                className="p-1 rounded-full hover:bg-[#272727] text-white"
                aria-label="Criar novo chat"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Novo chat</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
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

