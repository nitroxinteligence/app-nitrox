"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { ChatHistory } from "@/components/chat/chat-history"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatHeader } from "@/components/chat/chat-header"
import { AGENTS } from "@/lib/agents"
import { motion } from "framer-motion"
import { useChatContext } from "@/hooks/useChatContext"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/components/ui/use-toast"
import type { Message } from "@/types/chat"
import { MessageLoading } from "@/components/ui/message-loading"
import { processFiles } from "@/lib/file-processor"
import { analyzeDocument, analyzeImage } from "@/lib/groq"
import { BriefingService } from "@/lib/briefing-service"
import { CreateCampaignButton } from "@/components/campaign/create-campaign-button"

export function ChatInterface() {
  const { messages, isLoading: isContextLoading, error, fetchMessages } = useChatContext()
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [briefingContent, setBriefingContent] = useState<string | null>(null)
  const [briefingData, setBriefingData] = useState<any>(null)
  const params = useParams()
  const router = useRouter()
  const agentId = params?.agentId as string
  const sessionId = params?.sessionId as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages && messages.length > 0) {
      setChatMessages(messages)
    }
  }, [messages])

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsTransitioning(true)
        await fetchMessages()
      } catch (error) {
        console.error("Erro ao carregar mensagens:", error)
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro ao carregar mensagens",
          variant: "destructive",
        })
      } finally {
        setIsTransitioning(false)
      }
    }

    if (agentId && sessionId) {
      loadMessages()
    }
  }, [agentId, sessionId, fetchMessages])

  useEffect(() => {
    loadBriefing()
  }, [agentId])

  const loadBriefing = async () => {
    if (!agentId) return
    const content = await BriefingService.getBriefingContent(agentId as string)
    setBriefingContent(content)
    
    if (content) {
      try {
        if (typeof content === 'object') {
          setBriefingData(content)
        } else {
          const parsedContent = JSON.parse(content)
          setBriefingData(parsedContent)
        }
      } catch (e) {
        setBriefingData({ rawContent: content })
      }
    }
  }

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isSending) return

    try {
      setIsSending(true)

      // Processar anexos se houver
      let processedFiles: { url: string; text: string }[] = []
      if (attachments && attachments.length > 0) {
        processedFiles = await processFiles(attachments)
      }

      // Criar o objeto da mensagem com os anexos
      const messageToInsert = {
        role: "user",
        content: content.trim(),
        session_id: sessionId,
        created_at: new Date().toISOString(),
        attachments: processedFiles.map((file, index) => ({
          file_url: file.url,
          file_name: attachments![index].name,
          file_type: attachments![index].type,
          file_size: attachments![index].size
        }))
      }

      // Inserir a mensagem com os anexos em uma única operação
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .insert(messageToInsert)
        .select()
        .single()

      if (messageError) {
        console.error("Erro ao inserir mensagem:", messageError)
        throw messageError
      }

      // Atualizar o estado local com a mensagem do usuário
      const optimisticMessages = [...chatMessages, messageData]
      setChatMessages(optimisticMessages)

      // Preparar mensagens para a API
      const apiMessages = optimisticMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Carregar o briefing mais recente
      const briefingContent = await BriefingService.getBriefingContent(agentId)

      console.log('Sending to API:', {
        messages: apiMessages,
        fileAnalysis: processedFiles.map(f => f.text),
        briefingContent
      })

      // Enviar para a API
      const response = await fetch(`/api/chat/${agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          fileAnalysis: processedFiles.map(f => f.text),
          briefingContent
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Inserir resposta do assistente
      const assistantMessage = {
        role: "assistant",
        content: data.message,
        session_id: sessionId,
        created_at: new Date().toISOString()
      }

      const { data: assistantData, error: assistantError } = await supabase
        .from("messages")
        .insert(assistantMessage)
        .select()
        .single()

      if (assistantError) throw assistantError

      // Atualizar o estado local com a resposta do assistente
      setChatMessages([...optimisticMessages, assistantData])

      // Scroll para a última mensagem
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

    } catch (error) {
      console.error("Erro detalhado:", error)
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleRegenerate = async (messageId: string) => {
    try {
      setIsRegenerating(true)
      const messageIndex = chatMessages.findIndex(m => m.id === messageId)
      if (messageIndex > 0) {
        const userMessage = chatMessages[messageIndex - 1]
        const updatedMessages = chatMessages.slice(0, messageIndex)
        setChatMessages(updatedMessages)
        
        // Envia a mensagem para a API da OpenAI
        const response = await fetch(`/api/chat/${agentId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: updatedMessages }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        const newAssistantMessage: Message = {
          role: "assistant",
          content: data.message,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        }

        const { error: deleteError } = await supabase
          .from("messages")
          .delete()
          .eq("id", messageId)

        if (deleteError) throw deleteError

        const { error: insertError } = await supabase
          .from("messages")
          .insert([newAssistantMessage])

        if (insertError) throw insertError

        setChatMessages([...updatedMessages, newAssistantMessage])
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível regenerar a resposta",
        variant: "destructive",
      })
      await fetchMessages()
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleEdit = async (messageId: string, newContent: string) => {
    if (!newContent.trim() || isSending) return

    try {
      setIsSending(true)
      const messageIndex = chatMessages.findIndex(m => m.id === messageId)
      
      if (messageIndex === -1) {
        throw new Error("Mensagem não encontrada")
      }

      // Mantém todas as mensagens até a mensagem editada
      const previousMessages = chatMessages.slice(0, messageIndex)
      const editedMessage: Message = {
        ...chatMessages[messageIndex],
        content: newContent,
        created_at: new Date().toISOString(),
      }

      // Remove todas as mensagens após a mensagem editada
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .gte("created_at", chatMessages[messageIndex].created_at)
        .eq("session_id", sessionId)

      if (deleteError) throw deleteError

      // Atualiza UI com mensagens anteriores + mensagem editada
      setChatMessages([...previousMessages, editedMessage])

      // Envia a mensagem para a API da OpenAI
      const response = await fetch(`/api/chat/${agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...previousMessages, editedMessage] }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      const newAssistantMessage: Message = {
        role: "assistant",
        content: data.message,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      }

      // Insere a mensagem editada e a nova resposta
      const { error: insertError } = await supabase
        .from("messages")
        .insert([editedMessage, newAssistantMessage])

      if (insertError) throw insertError

      // Atualiza UI com todas as mensagens
      setChatMessages([...previousMessages, editedMessage, newAssistantMessage])
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível editar a mensagem",
        variant: "destructive",
      })
      // Em caso de erro, recarrega as mensagens
      await fetchMessages()
    } finally {
      setIsSending(false)
    }
  }

  const handleFeedback = async (messageId: string, isPositive: boolean) => {
    try {
      if (!messageId) {
        throw new Error("ID da mensagem não encontrado")
      }

      // Verifica se já existe um feedback para esta mensagem
      const { data: feedbacks, error: checkError } = await supabase
        .from("feedback")
        .select("*")
        .eq("message_id", messageId)

      if (checkError) {
        console.error("Erro ao verificar feedback existente:", checkError)
        throw checkError
      }

      const existingFeedback = feedbacks?.[0]

      if (existingFeedback) {
        // Atualiza o feedback existente
        const { error: updateError } = await supabase
          .from("feedback")
          .update({ 
            is_positive: isPositive,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingFeedback.id)
          .select()

        if (updateError) {
          console.error("Erro ao atualizar feedback:", updateError)
          throw updateError
        }

        console.log("Feedback atualizado com sucesso")
      } else {
        // Insere novo feedback
        const { data: insertData, error: insertError } = await supabase
          .from("feedback")
          .insert([
            {
              message_id: messageId,
              is_positive: isPositive,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()

        if (insertError) {
          console.error("Erro ao inserir feedback:", insertError)
          throw insertError
        }

        console.log("Novo feedback inserido com sucesso:", insertData)
      }

      // Busca todos os feedbacks atualizados para esta sessão
      const { data: sessionFeedbacks, error: fetchError } = await supabase
        .from("feedback")
        .select("*")
        .eq("message_id", messageId)

      if (fetchError) {
        console.error("Erro ao buscar feedbacks da sessão:", fetchError)
        throw fetchError
      }

      console.log("Feedbacks da sessão:", sessionFeedbacks)

      toast({
        description: `Feedback ${isPositive ? "positivo" : "negativo"} registrado com sucesso`,
        variant: "default",
      })

      // Atualiza a lista de mensagens para refletir o novo estado
      await fetchMessages()
    } catch (error) {
      console.error("Erro detalhado ao registrar feedback:", error)
      toast({
        title: "Erro ao registrar feedback",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    }
  }

  const agent = AGENTS[agentId]

  if (!agent) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0B]">
        <div className="text-red-500 text-center">
          <p>Agente não encontrado</p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 text-sm text-[#58E877] hover:text-[#4EDB82]"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0A0A0B] flex items-center justify-center pl-24">
      <div className="w-full h-screen max-w-[1400px] mx-auto px-8 flex">
        <div className="flex w-full gap-6 py-4">
          <div className="w-[240px] h-full flex-shrink-0">
            <div className="h-full rounded-[15px] border border-[#272727] overflow-hidden">
              <ChatHistory agentId={agentId} currentSessionId={sessionId} />
            </div>
          </div>

          <motion.div
            className="flex-1 h-full min-w-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col h-full rounded-[15px] border border-[#272727] overflow-hidden bg-[#0A0A0B]">
              <ChatHeader
                title={agent.name}
                agentId={agentId}
              />

              <div className="flex-1 overflow-y-auto">
                {error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-red-500 text-center">
                      <p>{error}</p>
                      <button
                        onClick={() => fetchMessages()}
                        className="mt-2 text-sm text-[#58E877] hover:text-[#4EDB82]"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                ) : isTransitioning ? (
                  <div className="flex items-center justify-center h-full">
                    <MessageLoading />
                  </div>
                ) : (
                  <div className="p-4">
                    <ChatMessages 
                      messages={chatMessages} 
                      isLoading={isRegenerating || isSending || isContextLoading}
                      onRegenerate={handleRegenerate}
                      onEdit={handleEdit}
                      onFeedback={handleFeedback}
                    />
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Adicionar o botão de criar campanha */}
              {briefingContent && (
                <div className="flex justify-center mt-4 mb-2">
                  <CreateCampaignButton
                    agentId={agentId as string}
                    sessionId={sessionId as string}
                    briefingData={briefingData || { rawContent: briefingContent }}
                  />
                </div>
              )}
              
              <div className="sticky bottom-0 bg-[#0A0A0B]">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isSending}
                  showAttachments
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
} 