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
    <div className="flex flex-col space-y-4">
      {messages.map((message, index) => (
        <motion.div
          key={message.id || index}
          className={cn(
            "flex flex-col",
            message.role === "assistant" ? "items-center" : "items-start"
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={cn(
            "flex flex-col max-w-3xl",
            message.role === "assistant" ? "items-center text-center" : "items-start"
          )}>
            <div className="text-white text-base">
              {message.role === "assistant" ? (
                <div className="space-y-2">
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {message.attachments.map((file, fileIndex) => (
                        <FileAttachment key={fileIndex} file={file} />
                      ))}
                    </div>
                  )}
                  
                  {editingMessageId === message.id ? (
                    <div className="flex flex-col w-full space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 bg-[#1a1a1c] border border-[#272727] rounded text-white focus:ring-1 focus:ring-[#58E877] focus:outline-none"
                        rows={4}
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleCancelEdit()}
                          className="px-3 py-1 rounded bg-[#272727] text-white hover:bg-[#333]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditSubmit(message.id!)}
                          className="px-3 py-1 rounded bg-[#58E877] text-black hover:bg-[#4EDB82]"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {message.attachments.map((file, fileIndex) => (
                        <FileAttachment key={fileIndex} file={file} />
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              )}
            </div>
            
            {message.role === "assistant" && !editingMessageId && (
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => onRegenerate && onRegenerate(message.id!)}
                  className="text-white hover:text-[#aaaaaa] transition-colors"
                  aria-label="Refresh response"
                  disabled={isLoading || isSubmittingFeedback === message.id}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleCopy(message.content)}
                  className="text-white hover:text-[#aaaaaa] transition-colors"
                  aria-label="Copy response"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onFeedback && onFeedback(message.id!, true)}
                  className={cn(
                    "text-white hover:text-[#aaaaaa] transition-colors",
                    feedbackStates.get(message.id!) === "like" && "text-[#58E877]"
                  )}
                  aria-label="Give positive feedback"
                  disabled={isLoading || isSubmittingFeedback === message.id}
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onFeedback && onFeedback(message.id!, false)}
                  className={cn(
                    "text-white hover:text-[#aaaaaa] transition-colors",
                    feedbackStates.get(message.id!) === "dislike" && "text-red-500"
                  )}
                  aria-label="Give negative feedback"
                  disabled={isLoading || isSubmittingFeedback === message.id}
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ))}
      
      {isLoading && (
        <div className="flex items-center justify-center">
          <TextShimmer className="max-w-md" />
        </div>
      )}
    </div>
  )
}

