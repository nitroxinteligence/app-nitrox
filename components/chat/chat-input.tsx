"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/types/chat"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => Promise<void>
}

interface FilePreview {
  file: File
  preview: string
  type: "image" | "document"
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<FilePreview[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`
    }
  }, [message])

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(attachment => {
        if (attachment.type === "image") {
          URL.revokeObjectURL(attachment.preview)
        }
      })
    }
  }, [attachments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && attachments.length === 0) || isLoading) return

    try {
      setIsLoading(true)
      await onSend(message.trim(), attachments.map(a => a.file))
      setMessage("")
      setAttachments([])
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
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

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-[#272727] bg-[#0A0A0B]">
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
                <FileText className="w-5 h-5 text-[#58E877]" />
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-3 text-[#E8F3ED]/60 hover:text-white hover:bg-transparent disabled:opacity-50"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
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
          placeholder={attachments.length > 0 ? "Adicione um comentário..." : "Digite sua mensagem..."}
          className="min-h-[44px] max-h-[200px] bg-[#1a1a1c] border-[#272727] text-white resize-none pl-16 pr-12 py-2 disabled:opacity-50"
          disabled={isLoading}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          disabled={(!message.trim() && attachments.length === 0) || isLoading}
          className={cn(
            "absolute right-3 hover:bg-transparent disabled:opacity-50",
            (!message.trim() && attachments.length === 0) ? "text-[#E8F3ED]/60" : "text-[#58E877] hover:text-[#4EDB82]"
          )}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  )
}

