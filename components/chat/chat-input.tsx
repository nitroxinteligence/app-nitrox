"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Paperclip, X, FileText, Image as ImageIcon, Search, Square } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/types/chat"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface ChatInputProps {
  onSendMessage?: (content: string, attachments?: File[]) => Promise<void>;
  onSend?: (content: string, attachments?: File[]) => Promise<void>;
  isLoading?: boolean;
  showAttachments?: boolean;
  onSearchWeb?: () => void;
  isWebSearchActive?: boolean;
  onCancel?: () => void;
}

interface FilePreview {
  file: File
  preview: string
  type: "image" | "document"
}

// Estilo adicional para o placeholder do textarea
const textareaStyles = {
  placeholder: {
    color: "#b2b2b2"
  },
  input: {
    paddingTop: "0px",
    paddingBottom: "0px",
    display: "flex",
    alignItems: "center",
    lineHeight: "44px" // Mesma altura do botão
  }
};

export function ChatInput({ 
  onSendMessage, 
  onSend, 
  isLoading: externalLoading = false,
  showAttachments = true,
  onSearchWeb,
  isWebSearchActive = false,
  onCancel
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isInternalLoading, setIsInternalLoading] = useState(false)
  const [attachments, setAttachments] = useState<FilePreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const isLoading = externalLoading || isInternalLoading;

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

  // Atualizar ariaLabel para acessibilidade
  const webSearchAriaLabel = isWebSearchActive 
    ? "Desativar pesquisa na web" 
    : "Ativar pesquisa na web";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && attachments.length === 0) || isLoading) return

    try {
      setIsInternalLoading(true)
      // Usar onSendMessage se existir, caso contrário usar onSend
      const sendFunction = onSendMessage || onSend;
      
      if (typeof sendFunction === 'function') {
        await sendFunction(message.trim(), attachments.map(a => a.file));
        setMessage("");
        setAttachments([]);
      } else {
        console.error("Error: onSendMessage or onSend is not a function");
        toast({
          title: "Erro",
          description: "Configuração incorreta do componente de chat",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive",
      })
    } finally {
      setIsInternalLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
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

  const handleCancel = () => {
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    }
  };

  return (
    <div className="p-4 bg-[#141414]">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 bg-[#1c1c1c] text-white text-xs px-3 py-2 rounded"
            >
              {attachment.type === "image" ? (
                <div className="relative h-10 w-10 rounded overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-white" />
                  </div>
                  <Image
                    src={attachment.preview}
                    alt="Preview"
                    width={40}
                    height={40}
                    className="object-cover h-full w-full"
                  />
                </div>
              ) : (
                <FileText className="h-4 w-4 text-white" />
              )}
              <span className="truncate max-w-[200px]">{attachment.file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-2 p-1 rounded-full hover:bg-[#2a2a2a] group-hover:opacity-100 opacity-60"
                type="button"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center px-4 py-2 rounded-[15px] bg-[#1c1c1c]">
        {/* Botões e controles */}
        {showAttachments && (
          <>
            <button
              type="button"
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-[#272727] disabled:opacity-50"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </>
        )}
        
        <button
          type="button"
          onClick={onSearchWeb}
          className={`flex items-center gap-2 px-3 py-1 ml-2 rounded-full ${
            isWebSearchActive ? 
            "bg-blue-400/20 text-blue-400 hover:bg-blue-400/30" : 
            "text-white/60 hover:text-white hover:bg-[#272727]"
          }`}
          aria-label={webSearchAriaLabel}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Pesquisa na Web</span>
        </button>
        
        <form onSubmit={handleSubmit} className="flex flex-1 items-center ml-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can Grok help?"
            className="w-full h-10 flex-1 bg-transparent border-none text-white focus:ring-0 focus:outline-none disabled:opacity-50 placeholder:text-white/40 placeholder:text-[15px]"
            disabled={isLoading}
            autoComplete="off"
          />
          {isLoading ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="ml-2 rounded-full p-2 hover:bg-[#272727] text-red-500"
            >
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={(!message.trim() && attachments.length === 0)}
              className={cn(
                "ml-2 rounded-full p-2 hover:bg-[#272727] disabled:opacity-50",
                (!message.trim() && attachments.length === 0) ? "text-white/60" : "text-blue-400"
              )}
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}

