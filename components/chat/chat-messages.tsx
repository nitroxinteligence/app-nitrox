"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Message } from "@/types/chat"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { Pencil, Copy, RotateCcw, ThumbsUp, ThumbsDown, Check, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase-client"
import Image from "next/image"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Definição de tipos para os componentes de markdown
type MarkdownComponentProps = {
  children: ReactNode;
  href?: string;
}

// Definindo os componentes de renderização personalizada para o Markdown
const markdownComponents = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="text-xl font-semibold mb-3 text-[#58E877]">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-[#58E877]">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-[#58E877]">{children}</h3>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
  ul: ({ children }) => <ul className="mb-4 ml-5 space-y-1 list-disc marker:text-[#bfbfbf]">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-5 space-y-1 list-decimal marker:text-[#bfbfbf]">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  hr: () => <hr className="my-4 border-[#333333]" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#58E877] hover:underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="pl-4 border-l-2 border-[#58E877] italic text-gray-300 my-2">
      {children}
    </blockquote>
  ),
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
  onRegenerate?: (messageId: string) => Promise<void>
  onEdit?: (messageId: string, newContent: string) => Promise<void>
  onFeedback?: (messageId: string, isPositive: boolean) => Promise<void>
}

interface FileAttachmentProps {
  file: {
    file_url: string
    file_name: string
    file_type: string
    file_size: number
  }
}

function FileAttachment({ file }: FileAttachmentProps) {
  const isImage = file.file_type.startsWith('image/')

  return (
    <a
      href={file.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 bg-[#1c1c1c] text-white text-xs px-3 py-2 rounded hover:bg-[#272727] transition-colors",
        isImage && "hover:opacity-90"
      )}
    >
      {isImage ? (
        <div className="relative w-32 h-32 rounded overflow-hidden">
          <Image
            src={file.file_url}
            alt={file.file_name}
            fill
            className="object-cover"
            unoptimized // Para URLs externas do Supabase
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#58E877]" />
          <span className="truncate max-w-[150px]">{file.file_name}</span>
        </div>
      )}
    </a>
  )
}

interface Feedback {
  message_id: string
  is_positive: boolean
}

export function ChatMessages({ messages, isLoading, onRegenerate, onEdit, onFeedback }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [feedbackStates, setFeedbackStates] = useState<Map<string, "like" | "dislike" | null>>(new Map())
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    setEditingMessageId(null)
    setEditContent("")
  }, [messages])

  useEffect(() => {
    const loadFeedbackStates = async () => {
      try {
        const messageIds = messages
          .filter(m => m.id && m.role === "assistant")
          .map(m => m.id!)

        if (messageIds.length === 0) return

        const { data: feedbacks, error } = await supabase
          .from("feedback")
          .select("message_id, is_positive")
          .in("message_id", messageIds)
          .order("created_at", { ascending: false })

        if (error) throw error

        const newFeedbackStates = new Map()
        
        // Primeiro, inicializa todos os IDs de mensagem com null
        messageIds.forEach(id => {
          newFeedbackStates.set(id, null)
        })
        
        // Depois, atualiza com os feedbacks existentes
        feedbacks?.forEach((feedback: Feedback) => {
          newFeedbackStates.set(feedback.message_id, feedback.is_positive ? "like" : "dislike")
        })
        
        setFeedbackStates(newFeedbackStates)
      } catch (error) {
        console.error("Erro ao carregar estados de feedback:", error)
      }
    }

    loadFeedbackStates()
  }, [messages])

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        description: "Texto copiado para a área de transferência",
      })
    } catch (error) {
      toast({
        description: "Erro ao copiar texto",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (messageId: string, content: string) => {
    if (editingMessageId) return
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const handleEditSubmit = async (messageId: string) => {
    if (!editContent.trim()) return

    try {
      const currentContent = editContent
      
      if (onEdit) {
        await onEdit(messageId, currentContent)
      }
      
      setEditingMessageId(null)
      setEditContent("")
    } catch (error) {
      toast({
        description: "Erro ao editar mensagem",
        variant: "destructive",
      })
    }
  }

  const handleFeedback = async (messageId: string, isPositive: boolean) => {
    if (isSubmittingFeedback === messageId) return

    try {
      setIsSubmittingFeedback(messageId)
      
      // Atualiza o estado otimisticamente
      setFeedbackStates(prev => {
        const newMap = new Map(prev)
        newMap.set(messageId, isPositive ? "like" : "dislike")
        return newMap
      })

      if (onFeedback) {
        await onFeedback(messageId, isPositive)
      }
    } catch (error) {
      // Reverte o estado em caso de erro
      setFeedbackStates(prev => {
        const newMap = new Map(prev)
        const oldState = prev.get(messageId) ?? null
        newMap.set(messageId, oldState)
        return newMap
      })
      
      toast({
        description: "Erro ao registrar feedback",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingFeedback(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent("")
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <AnimatePresence initial={false} mode="sync">
          {messages.map((message) => (
            <motion.div
              key={message.id || message.created_at}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="group relative"
            >
              {message.role === "user" ? (
                <div className="relative flex justify-end mb-6">
                  {message.id && editingMessageId === message.id ? (
                    <div className="w-full max-w-2xl bg-[#1c1c1c] rounded-lg p-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-[#1c1c1c] text-white rounded-lg p-2 min-h-[44px] resize-none border border-[#272727] focus:outline-none focus:border-[#58E877]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleEditSubmit(message.id!)
                          } else if (e.key === "Escape") {
                            handleCancelEdit()
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-[#272727] text-red-500"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleEditSubmit(message.id!)}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-[#272727] text-[#58E877]"
                          disabled={!editContent.trim()}
                          type="button"
                        >
                          <Check className="h-3 w-3" />
                          Enviar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl text-[#E8F3ED] bg-transparent rounded-lg p-3 pb-10 relative">
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.attachments.map((file, index) => (
                            <FileAttachment key={index} file={file} />
                          ))}
                        </div>
                      )}
                      <div className="absolute right-3 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => message.id && handleEdit(message.id, message.content)}
                              className="p-1 hover:text-[#58E877] transition-colors"
                              type="button"
                              disabled={!!editingMessageId}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">Editar mensagem</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleCopy(message.content)}
                              className="p-1 hover:text-[#58E877] transition-colors"
                              type="button"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">Copiar texto</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative mb-6">
                  <div className="text-white bg-transparent rounded-lg p-3 pb-10">
                    <div className="prose prose-invert max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-3">
                      <ReactMarkdown 
                        components={markdownComponents} 
                        remarkPlugins={[remarkGfm]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.attachments.map((file, index) => (
                          <FileAttachment key={index} file={file} />
                        ))}
                      </div>
                    )}
                    <div className={cn(
                      "absolute left-3 bottom-2 transition-opacity flex gap-2",
                      feedbackStates.get(message.id!) || "opacity-0 group-hover:opacity-100"
                    )}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => message.id && onRegenerate?.(message.id)}
                            className="p-1 hover:text-[#58E877] transition-colors"
                            type="button"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Regenerar resposta</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleCopy(message.content)}
                            className="p-1 hover:text-[#58E877] transition-colors"
                            type="button"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Copiar texto</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => message.id && handleFeedback(message.id, true)}
                            className={cn(
                              "p-1 transition-colors relative",
                              feedbackStates.get(message.id!) === "like" 
                                ? "text-[#58E877] bg-[#58E877]/10" 
                                : "text-white hover:text-[#58E877] hover:bg-[#58E877]/5",
                              isSubmittingFeedback === message.id && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={isSubmittingFeedback === message.id}
                            type="button"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Gostei da resposta</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => message.id && handleFeedback(message.id, false)}
                            className={cn(
                              "p-1 transition-colors relative",
                              feedbackStates.get(message.id!) === "dislike" 
                                ? "text-red-500 bg-red-500/10" 
                                : "text-white hover:text-red-500 hover:bg-red-500/5",
                              isSubmittingFeedback === message.id && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={isSubmittingFeedback === message.id}
                            type="button"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Não gostei da resposta</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && !isSubmittingFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-transparent rounded-lg p-3">
              <TextShimmer className="text-sm text-[#71717A]" duration={1.5}>
                Pensando...
              </TextShimmer>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </TooltipProvider>
  )
}

