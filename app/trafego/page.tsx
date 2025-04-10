"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, X, FileText, Info } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/types/chat"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  attachments?: {
    url: string
    name: string
    type: string
  }[]
}

interface FilePreview {
  file: File
  preview: string
  type: "image" | "document"
}

// Perguntas para o briefing estruturado
const BRIEFING_QUESTIONS = [
  "Qual é o objetivo principal da sua campanha? (conscientização, tráfego, conversões, etc.)",
  "Qual é o seu público-alvo? Descreva características demográficas e interesses.",
  "Qual é seu orçamento diário ou total para esta campanha?",
  "Por quanto tempo você planeja veicular esta campanha?",
  "Você já tem criativos prontos ou precisa de orientação para criá-los?",
  "Quais são as principais métricas que você deseja acompanhar?",
  "Você já realizou campanhas semelhantes anteriormente? Quais foram os resultados?"
]

export default function TrafficManagerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content: "Olá! Sou seu Gestor de Tráfego IA. Posso ajudar você a criar campanhas, analisar métricas, otimizar anúncios e gerenciar seu orçamento para o Meta ADS (Facebook). Como posso te ajudar hoje?",
      createdAt: new Date(),
    },
  ])
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [attachments, setAttachments] = useState<FilePreview[]>([])
  const [showUploadLimits, setShowUploadLimits] = useState(false)
  const [briefingStep, setBriefingStep] = useState(-1) // -1 = não iniciado, 0 a n = pergunta do briefing
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Ajustar altura do textarea automaticamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`
    }
  }, [message])

  // Limpar previews ao desmontar o componente
  useEffect(() => {
    return () => {
      attachments.forEach(attachment => {
        if (attachment.type === "image") {
          URL.revokeObjectURL(attachment.preview)
        }
      })
    }
  }, [attachments])

  // Rolagem automática para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Carregar mensagens do localStorage ao iniciar
  useEffect(() => {
    const savedMessages = localStorage.getItem('trafegoMessages')
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        // Converter strings de data de volta para objetos Date
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }))
        setMessages(messagesWithDates)
      } catch (error) {
        console.error("Erro ao carregar mensagens:", error)
      }
    }
  }, [])

  // Salvar mensagens no localStorage quando mudarem
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('trafegoMessages', JSON.stringify(messages))
    }
  }, [messages])

  // Inicia o processo de briefing
  const startBriefing = () => {
    // Adicionar mensagem informando sobre o briefing
    const briefingIntro: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "Vamos iniciar um briefing para criar sua campanha no Meta ADS. Vou fazer algumas perguntas para entender melhor suas necessidades e objetivos.",
      createdAt: new Date()
    }
    
    setMessages(prev => [...prev, briefingIntro])
    
    // Definir o estado para a primeira pergunta e enviá-la depois de um breve delay
    setTimeout(() => {
      setBriefingStep(0)
      setIsTyping(true)
      
      setTimeout(() => {
        const questionMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: BRIEFING_QUESTIONS[0],
          createdAt: new Date()
        }
        
        setMessages(prev => [...prev, questionMessage])
        setIsTyping(false)
      }, 1500)
    }, 1000)
  }

  // Continuar o briefing para a próxima pergunta
  const continueBriefing = () => {
    if (briefingStep < BRIEFING_QUESTIONS.length - 1) {
      // Avançar para a próxima pergunta
      const nextStep = briefingStep + 1
      setBriefingStep(nextStep)
      setIsTyping(true)
      
      setTimeout(() => {
        const questionMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: BRIEFING_QUESTIONS[nextStep],
          createdAt: new Date()
        }
        
        setMessages(prev => [...prev, questionMessage])
        setIsTyping(false)
      }, 1500)
    } else {
      // Finalizar o briefing
      setIsTyping(true)
      
      setTimeout(() => {
        const summaryMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Obrigado por fornecer todas essas informações! Agora tenho um bom entendimento do que você precisa. Vou preparar uma estratégia de campanha com base nas suas respostas. Quando o backend estiver implementado, poderei criar sua campanha automaticamente no Meta ADS.",
          createdAt: new Date()
        }
        
        setMessages(prev => [...prev, summaryMessage])
        setIsTyping(false)
        setBriefingStep(-1) // Resetar o briefing
      }, 2000)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if ((!message.trim() && attachments.length === 0) || isLoading) return

    try {
      setIsLoading(true)
      
      // Adicionar mensagem do usuário
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message.trim(),
        createdAt: new Date(),
        attachments: attachments.map(a => ({
          url: a.preview,
          name: a.file.name,
          type: a.file.type
        }))
      }
      
      setMessages(prev => [...prev, userMessage])
      
      // Limpar input e anexos
      setMessage("")
      setAttachments([])
      
      // Verificar se estamos no modo briefing
      if (briefingStep >= 0) {
        // Se estamos no briefing, continue para a próxima pergunta após um pequeno delay
        setTimeout(() => {
          setIsLoading(false)
          continueBriefing()
        }, 800)
        return
      }
      
      // Verificar se a mensagem do usuário indica que ele quer criar uma campanha
      const lowerMessage = message.toLowerCase()
      if (
        lowerMessage.includes("criar campanha") || 
        lowerMessage.includes("nova campanha") ||
        lowerMessage.includes("iniciar campanha") ||
        lowerMessage.includes("configurar campanha") ||
        lowerMessage.includes("montar campanha")
      ) {
        setTimeout(() => {
          setIsLoading(false)
          startBriefing()
        }, 800)
        return
      }
      
      // Simulação de resposta do assistente para outras mensagens
      setIsLoading(false)
      setIsTyping(true)
      
      setTimeout(() => {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Entendi sua solicitação. Neste momento, estou em fase de desenvolvimento e ainda não estou conectado ao backend. Em breve estarei funcionando completamente para ajudar com suas campanhas de tráfego pago no Meta ADS! Se quiser iniciar uma campanha, basta dizer \"criar campanha\" para iniciarmos o briefing.",
          createdAt: new Date()
        }
        
        setMessages(prev => [...prev, assistantMessage])
        setIsTyping(false)
      }, 2000)
      
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive",
      })
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const createFilePreview = async (file: File): Promise<FilePreview> => {
    if (file.type.startsWith('image/')) {
      return {
        file,
        preview: URL.createObjectURL(file),
        type: "image"
      }
    }
    
    // Para documentos, retornamos um tipo documento
    return {
      file,
      preview: file.name,
      type: "document"
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: FilePreview[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Validar tipo do arquivo
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`Tipo de arquivo não suportado: ${file.name}`)
        continue
      }

      // Validar tamanho do arquivo
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`Arquivo muito grande: ${file.name}`)
        continue
      }

      const preview = await createFilePreview(file)
      newFiles.push(preview)
    }

    if (errors.length > 0) {
      toast({
        title: "Erro ao adicionar arquivos",
        description: errors.join("\n"),
        variant: "destructive",
      })
    }

    if (newFiles.length > 0) {
      setAttachments(prev => [...prev, ...newFiles])
    }

    // Limpar input
    e.target.value = ""
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev]
      // Limpar preview URL se for imagem
      if (newAttachments[index].type === "image") {
        URL.revokeObjectURL(newAttachments[index].preview)
      }
      newAttachments.splice(index, 1)
      return newAttachments
    })
  }

  // Limpar todas as mensagens
  const clearChat = () => {
    if (window.confirm("Tem certeza que deseja limpar todas as mensagens?")) {
      setMessages([{
        id: "welcome-message",
        role: "assistant",
        content: "Olá! Sou seu Gestor de Tráfego IA. Posso ajudar você a criar campanhas, analisar métricas, otimizar anúncios e gerenciar seu orçamento para o Meta ADS (Facebook). Como posso te ajudar hoje?",
        createdAt: new Date(),
      }])
      localStorage.removeItem('trafegoMessages')
      setBriefingStep(-1)
    }
  }

  // Formatação de tamanho de arquivo para exibição
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B]">
      {/* Gradient Orbs - customizado para cores relacionadas a marketing/tráfego */}
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-[#4267B2] opacity-10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-[20%] -z-10 h-[600px] w-[600px] rounded-full bg-[#FF5CA8] opacity-10 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative rounded-2xl bg-black/40 backdrop-blur-xl"
        >
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="border-b border-[#272727] p-4 bg-[#0A0A0B]/80 rounded-t-2xl backdrop-blur-xl flex justify-between items-center">
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-[#4267B2]">Meta ADS</span> 
                <span className="text-white/50">|</span> 
                <span>Gestor de Tráfego IA</span>
              </h1>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-[#adadad] hover:text-white hover:bg-[#1a1a1c]"
                        onClick={clearChat}
                      >
                        Limpar Chat
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Limpar o histórico de conversa
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex max-w-[80%] mb-4",
                    msg.role === "user" ? "ml-auto" : "mr-auto"
                  )}
                >
                  <div 
                    className={cn(
                      "rounded-xl p-4",
                      msg.role === "user" 
                        ? "bg-[#4267B2]/20 border border-[#4267B2]/30 text-white" 
                        : "bg-[#1a1a1c] border border-[#272727] text-white"
                    )}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((attachment, idx) => (
                          <div key={idx} className="relative">
                            {attachment.type.startsWith('image/') ? (
                              <div className="relative w-32 h-32 rounded overflow-hidden mb-2">
                                <Image
                                  src={attachment.url}
                                  alt={attachment.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-[#272727] p-2 rounded mb-2">
                                <FileText className="h-4 w-4 text-[#4267B2]" />
                                <span className="text-sm truncate">{attachment.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className="text-xs text-gray-400 mt-2 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Indicador de digitação */}
              {isTyping && (
                <div className="flex max-w-[80%] mb-4 mr-auto">
                  <div className="rounded-xl p-4 bg-[#1a1a1c] border border-[#272727] text-white">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-[#4267B2] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#4267B2] animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#4267B2] animate-bounce" style={{ animationDelay: "600ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#272727] bg-[#0A0A0B] rounded-b-2xl">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="relative group flex items-center gap-2 bg-[#1a1a1c] text-white text-xs px-3 py-2 rounded"
                    >
                      {attachment.type === "image" ? (
                        <div className="relative w-8 h-8 rounded overflow-hidden">
                          <Image
                            src={attachment.preview}
                            alt={attachment.file.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <FileText className="w-5 h-5 text-[#4267B2]" />
                      )}
                      <span className="truncate max-w-[150px]">{attachment.file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-white/60 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative flex items-center">
                <TooltipProvider>
                  <Tooltip open={showUploadLimits} onOpenChange={setShowUploadLimits}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-3 text-[#E8F3ED]/60 hover:text-white hover:bg-transparent disabled:opacity-50"
                        disabled={isLoading || isTyping}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-semibold">Arquivos permitidos:</p>
                        <ul className="text-xs space-y-1">
                          <li>Imagens: JPG, PNG</li>
                          <li>Documentos: PDF, DOC, DOCX, XLS, XLSX, TXT</li>
                          <li>Tamanho máximo: {formatFileSize(MAX_FILE_SIZE)}</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isTyping 
                      ? "Assistente está digitando..." 
                      : attachments.length > 0 
                        ? "Adicione um comentário..." 
                        : briefingStep >= 0 
                          ? "Responda a pergunta do briefing..." 
                          : "Converse com seu Gestor de Tráfego IA..."
                  }
                  className="min-h-[44px] max-h-[200px] bg-[#1a1a1c] border-[#272727] text-white resize-none pl-16 pr-12 py-2 disabled:opacity-50"
                  disabled={isLoading || isTyping}
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  disabled={(!message.trim() && attachments.length === 0) || isLoading || isTyping}
                  className={cn(
                    "absolute right-3 hover:bg-transparent disabled:opacity-50",
                    (!message.trim() && attachments.length === 0) ? "text-[#E8F3ED]/60" : "text-[#4267B2] hover:text-[#5b7cc2]"
                  )}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Upload Info */}
              <div className="mt-2 text-xs text-[#adadad] flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>
                  Dica: Digite "criar campanha" para iniciar o briefing de uma nova campanha.
                </span>
              </div>
              
              {/* Botão de Criar Campanha */}
              {briefingStep === -1 && messages.length > 0 && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={startBriefing}
                    className="bg-[#4267B2] hover:bg-[#5b7cc2] text-white font-medium"
                  >
                    Criar Campanha
                  </Button>
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 