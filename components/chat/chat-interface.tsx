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
import { NoMessages } from "@/components/ui/no-messages"

export function ChatInterface() {
  const { messages, isLoading: isContextLoading, error, fetchMessages } = useChatContext()
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [briefingContent, setBriefingContent] = useState<string | null>(null)
  const [briefingData, setBriefingData] = useState<any>(null)
  const [isSearchingWeb, setIsSearchingWeb] = useState(false)
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false)
  const [isWebSearching, setIsWebSearching] = useState(false)
  const params = useParams()
  const router = useRouter()
  const agentId = params?.agentId as string
  const sessionId = params?.sessionId as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  const toggleWebSearch = () => {
    const newState = !isWebSearchEnabled;
    setIsWebSearchEnabled(newState);
    toast({
      title: newState ? "Pesquisa na Web ativada" : "Pesquisa na Web desativada",
      description: newState 
        ? "Suas próximas mensagens serão processadas com pesquisa na web" 
        : "As mensagens não serão mais processadas com pesquisa na web",
      variant: "default",
    });
  }

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSending(false);
      setIsWebSearching(false);
      toast({
        title: "Geração interrompida",
        description: "A geração da resposta foi interrompida",
        variant: "default",
      });
    }
  }

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isSending) return

    try {
      setIsSending(true);
      
      // Criar um novo AbortController para esta solicitação
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      // Indica que está iniciando a pesquisa na web, se ativada
      if (isWebSearchEnabled) {
        setIsWebSearching(true);
      }

      // Processar anexos se houver
      let processedFiles: { url: string; text: string; fileType: string }[] = []
      if (attachments && attachments.length > 0) {
        try {
          // Adicionar log detalhado para arquivos enviados
          console.log('Processando anexos:', attachments.map(a => ({
            name: a.name,
            type: a.type,
            size: a.size
          })));
          
          processedFiles = await processFiles(attachments)
          
          // Adicionar log detalhado para arquivos processados
          console.log('Anexos processados com sucesso:', processedFiles.map(f => ({
            url: f.url,
            textLength: f.text?.length || 0,
            fileType: f.fileType
          })));
        } catch (processError) {
          console.error('Erro ao processar anexos:', processError);
          toast({
            title: "Erro ao processar anexos",
            description: processError instanceof Error ? processError.message : "Erro desconhecido",
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
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
        content: msg.content,
        // Incluir anexos para que o modelo de IA possa saber que há imagens
        ...(msg.attachments && msg.attachments.length > 0 && {
          attachments: msg.attachments
        })
      }))

      // Carregar o briefing mais recente
      const briefingContent = await BriefingService.getBriefingContent(agentId)

      // Extrair informações de tipos de arquivo para o contexto
      const fileTypes = processedFiles.map(file => file.fileType || 'documento');

      // Log detalhado do que está sendo enviado para a API
      console.log('Enviando para API:', {
        messages: apiMessages,
        fileAnalysis: processedFiles.map((f, i) => ({
          textLength: f.text?.length || 0,
          preview: f.text?.substring(0, 100) + '...',
          fileType: fileTypes[i]
        })),
        hasAttachments: processedFiles.length > 0,
        briefingLength: briefingContent?.length || 0,
        webSearchEnabled: isWebSearchEnabled
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
          fileTypes: fileTypes,
          briefingContent,
          webSearchEnabled: isWebSearchEnabled
        }),
        signal, // Adiciona o sinal do AbortController
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
      setIsSending(false);
      setIsWebSearching(false); // Finaliza a indicação de pesquisa na web
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
        
        // Preparar mensagens para a API, preservando informação de anexos
        const apiMessages = updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          ...(msg.attachments && msg.attachments.length > 0 && {
            attachments: msg.attachments
          })
        }));
        
        // Coletar todas as análises de arquivos necessárias para o contexto
        const fileAnalysis = [];
        const fileTypes = [];
        
        // Procurar por mensagens com anexos nas mensagens mantidas
        const messagesWithAttachments = updatedMessages.filter(msg => 
          msg.attachments && msg.attachments.length > 0
        );
        
        if (messagesWithAttachments.length > 0) {
          // Coletar todos os IDs de anexos
          const allAttachmentIds = messagesWithAttachments.flatMap(msg => 
            (msg.attachments || []).filter(a => a.id).map(a => a.id!)
          );
          
          if (allAttachmentIds.length > 0) {
            // Buscar a análise de texto para todos os anexos
            const { data: attachmentsData, error: attachmentsError } = await supabase
              .from("attachments")
              .select("id, file_name, file_type, extracted_text")
              .in("id", allAttachmentIds);
              
            if (!attachmentsError && attachmentsData) {
              // Processar cada anexo
              attachmentsData.forEach(att => {
                if (att.extracted_text) {
                  fileAnalysis.push(att.extracted_text);
                  
                  // Determinar o tipo de arquivo
                  const ext = att.file_name.split('.').pop()?.toLowerCase();
                  let fileType = 'documento';
                  
                  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '') || att.file_type.startsWith('image/')) {
                    fileType = 'imagem';
                  } else if (ext === 'pdf' || att.file_type.includes('pdf')) {
                    fileType = 'PDF';
                  } else if (ext === 'txt' || att.file_type.includes('text/plain')) {
                    fileType = 'texto';
                  } else if (['doc', 'docx'].includes(ext || '') || att.file_type.includes('word')) {
                    fileType = 'documento Word';
                  } else if (['xls', 'xlsx'].includes(ext || '') || att.file_type.includes('excel')) {
                    fileType = 'planilha Excel';
                  }
                  
                  fileTypes.push(fileType);
                }
              });
            }
          }
        }
        
        // Carregar o briefing mais recente
        const briefingContent = await BriefingService.getBriefingContent(agentId);
        
        // Log para depuração
        console.log('Regenerando resposta com:', {
          messages: apiMessages.length,
          hasFileAnalysis: fileAnalysis.length > 0,
          fileAnalysisCount: fileAnalysis.length,
          fileTypes
        });
        
        // Envia a mensagem para a API da OpenAI
        const response = await fetch(`/api/chat/${agentId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            messages: apiMessages, 
            fileAnalysis,
            fileTypes,
            briefingContent
          }),
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

      // Guardar a mensagem original com seu ID
      const originalMessage = chatMessages[messageIndex];
      
      // Preservar os anexos existentes da mensagem
      const originalAttachments = originalMessage.attachments || [];
      
      // Mantém todas as mensagens até a mensagem editada (inclusive)
      const previousMessages = chatMessages.slice(0, messageIndex);
      
      // Cria a mensagem editada mantendo o ID original e os anexos
      const editedMessage: Message = {
        ...originalMessage,
        content: newContent,
        attachments: originalAttachments
        // Não alterar o timestamp original para manter a ordem
      }
      
      // Atualizar mensagem no banco de dados, preservando anexos
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq("id", messageId)

      if (updateError) throw updateError

      // Verificar se existe uma resposta do assistente após esta mensagem
      let assistantMessageToDelete = null;
      if (messageIndex < chatMessages.length - 1 &&
        chatMessages[messageIndex + 1].role === "assistant") {
        assistantMessageToDelete = chatMessages[messageIndex + 1];
      }

      // Se houver uma resposta do assistente, excluí-la
      if (assistantMessageToDelete) {
        const { error: deleteError } = await supabase
          .from("messages")
          .delete()
          .eq("id", assistantMessageToDelete.id)

        if (deleteError) throw deleteError
      }

      // Preparar as mensagens para a API, incluindo a mensagem editada
      const messagesToKeep = [...previousMessages, editedMessage];
      setChatMessages(messagesToKeep);

      // Preparar as mensagens para a API, preservando informação de anexos
      const apiMessages = messagesToKeep.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.attachments && msg.attachments.length > 0 && {
          attachments: msg.attachments
        })
      }));

      // Carregar o briefing mais recente
      const briefingContent = await BriefingService.getBriefingContent(agentId);

      // Preparar a análise de arquivo para enviar à API - importante para imagens editadas
      const fileAnalysis = [];
      const fileTypes = [];
      
      // Se a mensagem editada tem anexos, inclua a análise desses anexos
      if (editedMessage.attachments && editedMessage.attachments.length > 0) {
        // Buscar a análise de texto armazenada para cada anexo
        const attachmentIds = editedMessage.attachments
          .filter(a => a.id)
          .map(a => a.id!);
          
        if (attachmentIds.length > 0) {
          const { data: attachmentData, error: attachmentError } = await supabase
            .from("attachments")
            .select("id, file_name, file_type, file_url, extracted_text")
            .in("id", attachmentIds);
            
          if (!attachmentError && attachmentData) {
            // Adicionar o texto extraído de cada anexo para o fileAnalysis
            attachmentData.forEach(att => {
              if (att.extracted_text) {
                fileAnalysis.push(att.extracted_text);
                
                // Determinar o tipo de arquivo com base na extensão ou MIME type
                const ext = att.file_name.split('.').pop()?.toLowerCase();
                let fileType = 'documento';
                
                if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '') || att.file_type.startsWith('image/')) {
                  fileType = 'imagem';
                } else if (ext === 'pdf' || att.file_type.includes('pdf')) {
                  fileType = 'PDF';
                } else if (ext === 'txt' || att.file_type.includes('text/plain')) {
                  fileType = 'texto';
                } else if (['doc', 'docx'].includes(ext || '') || att.file_type.includes('word')) {
                  fileType = 'documento Word';
                } else if (['xls', 'xlsx'].includes(ext || '') || att.file_type.includes('excel')) {
                  fileType = 'planilha Excel';
                }
                
                fileTypes.push(fileType);
              }
            });
          }
        }
      }

      // Log detalhado do que está sendo enviado para a API
      console.log('Enviando para API (edição):', {
        messages: apiMessages.length,
        fileAnalysis: fileAnalysis.map((text, i) => ({
          length: text.length,
          preview: text.substring(0, 100) + '...',
          fileType: fileTypes[i] || 'documento'
        })),
        briefingLength: briefingContent?.length || 0
      });

      // Enviar as mensagens para a API, incluindo análise de arquivos
      const response = await fetch(`/api/chat/${agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          fileAnalysis,
          fileTypes,
          briefingContent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json()
      
      // Criar nova mensagem de resposta
      const newAssistantMessage: Message = {
        role: "assistant",
        content: data.message,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      }

      // Insere a nova resposta no banco de dados
      const { data: assistantData, error: insertError } = await supabase
        .from("messages")
        .insert([newAssistantMessage])
        .select()
        .single()

      if (insertError) {
        console.error("Erro ao inserir nova resposta:", insertError);
        throw insertError;
      }

      // Atualiza UI com todas as mensagens incluindo a nova resposta
      setChatMessages([...messagesToKeep, assistantData])
      
      // Scroll para a última mensagem
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    } catch (error) {
      console.error("Erro detalhado ao editar mensagem:", error);
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

  // Verificar se a mensagem está sendo processada
  const isLoading = isSending || isRegenerating;

  // Obter o ícone apropriado para o cabeçalho com base no estado
  const getWebSearchStatus = () => {
    if (isWebSearching) return "searching";
    if (isWebSearchEnabled) return "enabled";
    return "disabled";
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B] flex items-center justify-center">
      <div className="w-full h-screen max-w-[1300px] mx-auto px-4 ml-32 mr-10 flex">
        <div className="flex w-full py-4">
          <motion.div
            className="w-full h-full min-w-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {chatMessages.length === 0 ? (
              <div className="h-full overflow-hidden rounded-[15px]">
                <NoMessages 
                  agentInfo={agent} 
                  briefingData={briefingData} 
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  userName="Mateus"
                  onWebSearchChange={setIsWebSearchEnabled}
                />
              </div>
            ) : (
              <div className="h-full overflow-hidden flex flex-col rounded-[15px] border border-[#272727]">
                <ChatHeader
                  title={agent.name}
                  agentId={agentId}
                  sessionId={sessionId}
                  webSearchStatus={getWebSearchStatus()}
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
                        isLoading={isLoading}
                        onRegenerate={handleRegenerate}
                        onEdit={handleEdit}
                        onFeedback={handleFeedback}
                      />
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-[#0A0A0B]">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    showAttachments
                    onSearchWeb={toggleWebSearch}
                    isWebSearchActive={isWebSearchEnabled}
                    onCancel={handleCancelRequest}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
} 