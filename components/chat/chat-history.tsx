"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Edit2, Trash2, Check, X, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase-client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ChatHistoryItem {
  id: string
  title: string
  created_at: string
}

interface ChatHistoryProps {
  agentId: string
  currentSessionId: string
}

export function ChatHistory({ agentId, currentSessionId }: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const router = useRouter()
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchChatHistory()
  }, [])

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingSessionId])

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

      setChatHistory(data || [])
    } catch (error) {
      console.error("Error in fetchChatHistory:", error)
      toast({
        title: "Error",
        description: "Failed to load chat history. Please try again.",
        variant: "destructive",
      })
    }
  }

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

      setChatHistory([data, ...chatHistory])
      router.push(`/chat/${agentId}/${data.id}`)
    } catch (error) {
      console.error("Error creating new chat:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar um novo chat. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleSessionClick = (sessionId: string) => {
    // Não precisa fazer nada se já está no mesmo chat
    if (sessionId === currentSessionId) {
      return;
    }
    
    // Navegação normal para o próximo chat
    router.push(`/chat/${agentId}/${sessionId}`)
  }

  const startEditing = (sessionId: string, title: string) => {
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
        (chat.id === editingSessionId ? { ...chat, title: editingTitle } : chat)
      ))
      setEditingSessionId(null)
      toast({
        title: "Success",
        description: "Chat title updated successfully.",
      })
    } catch (error) {
      console.error("Error updating chat title:", error)
      toast({
        title: "Error",
        description: "Failed to update chat title. Please try again.",
        variant: "destructive",
      })
    }
  }

  const cancelEditing = () => {
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const confirmDelete = (sessionId: string) => {
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
          const timestamp = new Date().getTime()
          const newSessionId = `${agentId}_${timestamp}`
          
          const { data: newChat, error: createError } = await supabase
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

          if (createError) throw createError

          setChatHistory([newChat])
          router.push(`/chat/${agentId}/${newSessionId}`)
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

  const filteredHistory = chatHistory.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex flex-col h-full w-[240px] bg-[#0A0A0B] p-4">
      <Button
        variant="outline"
        className="w-full border-[#272727] text-gray-200 hover:bg-[#1A1A1C] hover:text-gray-100"
        onClick={createNewChat}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Novo Chat
      </Button>
      <div className="h-[1px] bg-[#272727] my-4" />
      <div className="mb-4">
        <Input
          placeholder="Procurar chats..."
          className="w-full bg-[#1a1a1c] border-[#272727] text-white placeholder:text-white/40"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#272727] [&::-webkit-scrollbar-thumb]:rounded-full">
        <AnimatePresence>
          {filteredHistory.map((chat) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="relative group"
            >
              {editingSessionId === chat.id ? (
                <div className="px-4 py-2 flex items-center space-x-2">
                  <Input
                    ref={editInputRef}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="bg-[#1a1a1c] border-[#272727] text-white flex-grow"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleEditSubmit()
                      } else if (e.key === "Escape") {
                        cancelEditing()
                      }
                    }}
                  />
                  <Button variant="ghost" size="icon" className="p-1 hover:bg-[#272727]" onClick={handleEditSubmit}>
                    <Check className="w-4 h-4 text-[#58E877]" />
                  </Button>
                  <Button variant="ghost" size="icon" className="p-1 hover:bg-[#272727]" onClick={cancelEditing}>
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 transition-colors duration-200 text-sm",
                    currentSessionId === chat.id
                      ? "bg-[#1a1a1c] text-[#58E877] border-l-2 border-l-[#58E877]"
                      : "text-[#f4f4f4]/60 hover:text-white",
                  )}
                >
                  <div className="flex items-center flex-grow cursor-pointer min-w-0" onClick={() => handleSessionClick(chat.id)}>
                    <MessageSquare
                      className={cn(
                        "w-4 h-4 mr-2.5 flex-shrink-0 transition-colors duration-200",
                        currentSessionId === chat.id ? "text-[#58E877]" : "text-[#f4f4f4]/60",
                      )}
                    />
                    <span className="truncate pr-2">{chat.title}</span>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-[#272727] transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditing(chat.id, chat.title)
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#58E877]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-[#272727] transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmDelete(chat.id)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-[#1a1a1c] border-[#272727] text-white">
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
    </div>
  )
}

