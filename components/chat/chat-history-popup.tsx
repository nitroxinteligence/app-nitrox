"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Edit2, Trash2, Check, X, PlusCircle, Clock, History, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"
import { motion, AnimatePresence } from "framer-motion"

interface ChatHistoryItem {
  id: string
  title: string
  created_at: string
  summary?: string
}

interface ChatHistoryPopupProps {
  agentId: string
  currentSessionId: string
  isOpen: boolean
  onClose: () => void
  onCreateNew: () => void
}

export function ChatHistoryPopup({ 
  agentId, 
  currentSessionId, 
  isOpen, 
  onClose,
  onCreateNew
}: ChatHistoryPopupProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      fetchChatHistory()
    }
  }, [isOpen, agentId])

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      const chatHistoryData = data || [];
      
      // Buscar mensagens para cada chat para gerar resumos
      const historyWithSummaries = await Promise.all(
        chatHistoryData.map(async (chat) => {
          try {
            // Buscar as primeiras mensagens de cada chat
            const { data: messages, error: messagesError } = await supabase
              .from("messages")
              .select("*")
              .eq("session_id", chat.id)
              .order("created_at", { ascending: true })
              .limit(3) // Limitar a 3 mensagens para o resumo
            
            if (messagesError) throw messagesError;
            
            // Gerar um resumo baseado nas mensagens do chat
            let summary = "Novo Chat";
            
            if (messages && messages.length > 0) {
              // Pegar a primeira mensagem do usuário, se existir
              const firstUserMsg = messages.find(msg => msg.role === "user");
              
              if (firstUserMsg) {
                // Extrair as primeiras palavras da mensagem (até 5 palavras ou 30 caracteres)
                const msgContent = firstUserMsg.content || "";
                const words = msgContent.split(" ");
                let summaryContent = words.slice(0, 5).join(" ");
                
                if (summaryContent.length > 30) {
                  summaryContent = summaryContent.substring(0, 30);
                }
                
                if (summaryContent.length > 0) {
                  summary = summaryContent + (words.length > 5 ? "..." : "");
                }
              }
            }
            
            return {
              ...chat,
              summary
            };
          } catch (error) {
            console.error("Erro ao buscar mensagens para chat:", chat.id, error);
            return chat;
          }
        })
      );
      
      setChatHistory(historyWithSummaries);
    } catch (error) {
      console.error("Error in fetchChatHistory:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico de chat. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleSessionClick = (sessionId: string) => {
    router.push(`/chat/${agentId}/${sessionId}`)
    onClose()
  }

  const startEditing = (sessionId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(sessionId)
    setEditingTitle(title)
  }

  const handleEditSubmit = async () => {
    if (!editingSessionId) return

    try {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ title: editingTitle })
        .eq("id", editingSessionId)

      if (error) throw error

      setChatHistory(chatHistory.map((chat) => 
        (chat.id === editingSessionId ? { ...chat, title: editingTitle, summary: editingTitle } : chat)
      ))
      setEditingSessionId(null)
      toast({
        title: "Sucesso",
        description: "Título do chat atualizado com sucesso.",
      })
    } catch (error) {
      console.error("Error updating chat title:", error)
      toast({
        title: "Erro",
        description: "Falha ao atualizar título do chat. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const confirmDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setChatToDelete(sessionId)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!chatToDelete) return

    try {
      const { error } = await supabase.from("chat_sessions").delete().eq("id", chatToDelete)

      if (error) throw error

      // Atualizar o histórico local
      const updatedHistory = chatHistory.filter((chat) => chat.id !== chatToDelete)
      setChatHistory(updatedHistory)

      // Se o chat atual foi excluído
      if (currentSessionId === chatToDelete) {
        // Se ainda existem outros chats, navegar para o mais recente
        if (updatedHistory.length > 0) {
          const latestChat = updatedHistory[0]
          router.push(`/chat/${agentId}/${latestChat.id}`)
        } else {
          // Se não há mais chats, criar um novo
          onCreateNew()
        }
      }

      toast({
        title: "Sucesso",
        description: "Chat excluído com sucesso.",
      })
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o chat. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setDeleteConfirmOpen(false)
      setChatToDelete(null)
    }
  }

  const filteredHistory = chatHistory.filter((chat) => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Função para formatar a data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Verificar se é hoje
    if (date.toDateString() === today.toDateString()) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }
    
    // Verificar se é ontem
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }
    
    // Outro dia
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-[#0A0A0B] border border-[#1B1D1D] text-white w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <AlertDialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#58E877]" />
            <AlertDialogTitle className="text-xl">Histórico</AlertDialogTitle>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" 
              size="icon"
              onClick={onCreateNew}
              className="rounded-full h-8 w-8 hover:bg-[#272727] text-[#58E877]"
              aria-label="Novo chat"
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        </AlertDialogHeader>
        
        <div className="mb-4 mt-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#f4f4f4]/60" />
          <Input
            placeholder="Buscar nos chats..."
            className="w-full bg-[#272727] border-[#3a3a3c] text-white pl-10 placeholder:text-[#f4f4f4]/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <AnimatePresence>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="relative group"
                >
                  {editingSessionId === chat.id ? (
                    <div className="px-4 py-3 flex items-center space-x-2 bg-[#272727] rounded-md mb-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="bg-[#1a1a1c] border-[#3a3a3c] text-white flex-grow"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleEditSubmit()
                          } else if (e.key === "Escape") {
                            cancelEditing(e as any)
                          }
                        }}
                      />
                      <Button variant="ghost" size="icon" className="p-1 hover:bg-[#3a3a3c]" onClick={handleEditSubmit}>
                        <Check className="w-4 h-4 text-[#58E877]" />
                      </Button>
                      <Button variant="ghost" size="icon" className="p-1 hover:bg-[#3a3a3c]" onClick={(e) => cancelEditing(e)}>
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleSessionClick(chat.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 transition-colors duration-200 rounded-md mb-2 cursor-pointer",
                        currentSessionId === chat.id
                          ? "bg-[#272727] text-[#58E877] border-l-2 border-l-[#58E877] pl-[14px]"
                          : "text-[#f4f4f4] hover:bg-[#272727]/50 hover:text-white",
                      )}
                    >
                      <div className="flex items-center flex-grow min-w-0">
                        <MessageSquare
                          className={cn(
                            "w-4 h-4 mr-2.5 flex-shrink-0 transition-colors duration-200",
                            currentSessionId === chat.id ? "text-[#58E877]" : "text-[#f4f4f4]/60",
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="truncate pr-2 text-sm">{chat.summary || chat.title}</span>
                          <span className="text-xs text-[#f4f4f4]/40">{formatDate(chat.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-[#3a3a3c] transition-colors duration-200"
                          onClick={(e) => startEditing(chat.id, chat.title, e)}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#58E877]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-[#3a3a3c] transition-colors duration-200"
                          onClick={(e) => confirmDelete(chat.id, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-[#f4f4f4]/60">
                {searchQuery ? "Nenhum chat encontrado com essa busca" : "Nenhum chat encontrado"}
              </div>
            )}
          </AnimatePresence>
        </div>
        
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel className="bg-[#272727] text-white/70 hover:text-white border-[#272727] hover:bg-[#3a3a3c]">
            Fechar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
      
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-[#0A0A0B] border border-[#1B1D1D] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#f4f4f4]/60">
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o chat e removerá seus dados de nossos
              servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#272727] text-white/70 hover:text-white border-[#272727] hover:bg-[#3a3a3c]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertDialog>
  )
} 