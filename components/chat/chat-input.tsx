"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Paperclip, X, FileText, Image as ImageIcon, Search, Square, Mic, Lightbulb, ChevronUp } from "lucide-react"
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
    <div className="bg-[#333333] rounded-lg shadow-lg">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-[#222222] rounded-t-lg">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 bg-[#444444] text-white text-xs px-3 py-2 rounded"
            >
              {attachment.type === "image" ? (
                <div className="relative w-6 h-6">
                  <Image
                    src={attachment.preview}
                    alt="Preview"
                    fill
                    className="object-cover rounded"
                  />
                </div>
              ) : (
                <FileText className="w-4 h-4 text-white" />
              )}
              <span className="truncate max-w-[100px]">{attachment.file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-1 p-1 rounded-full hover:bg-[#555555] text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center p-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can Grok help?"
          className="flex-1 bg-transparent border-none text-white focus:ring-0 focus:outline-none disabled:opacity-50 placeholder:text-[#aaaaaa] text-sm"
          disabled={isLoading}
          autoComplete="off"
        />
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#444444] rounded-full p-1"
            aria-label="Microphone"
          >
            <Mic className="h-5 w-5" />
          </Button>
          
          <button
            type="button"
            onClick={onSearchWeb}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              isWebSearchActive ? 
              "bg-[#444444] text-white" : 
              "text-white hover:bg-[#444444]"
            }`}
            aria-label={webSearchAriaLabel}
          >
            <Search className="h-3.5 w-3.5" />
            <span>DeepSearch</span>
          </button>
          
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white hover:bg-[#444444]"
            aria-label="Think"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Think</span>
          </button>
          
          <div className="flex items-center gap-1 px-2">
            <span className="text-xs text-white">Grok 3</span>
            <button 
              type="button"
              className="flex items-center justify-center w-6 h-6 rounded-full bg-[#666666] text-white hover:bg-[#777777]"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          
          {isLoading ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full p-1 hover:bg-[#444444] text-red-500"
            >
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              type="button"
              variant="ghost"
              size="icon"
              disabled={(!message.trim() && attachments.length === 0)}
              className={cn(
                "rounded-full p-1 hover:bg-[#444444] disabled:opacity-50",
                (!message.trim() && attachments.length === 0) ? "text-[#aaaaaa]" : "text-white"
              )}
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

