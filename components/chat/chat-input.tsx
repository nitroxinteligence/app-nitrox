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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const isLoading = externalLoading || isInternalLoading;

  // Autoajustar a altura do textarea com base no conteúdo
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 bg-[#1c1c1c] text-white text-xs px-3 py-2 rounded"
            >
              {attachment.type === "image" ? (
                <div className="relative h-8 w-8 rounded overflow-hidden">
                  <Image
                    src={attachment.preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <FileText className="h-4 w-4 text-[#58E877]" />
              )}
              <span className="truncate max-w-[150px]">{attachment.file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-1 -right-1 rounded-full bg-[#272727] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="rounded-xl bg-[#1c1c1c] p-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="O que você deseja saber?"
          className="w-full bg-transparent border-none text-white resize-none outline-none placeholder:text-[#f4f4f4]/40 min-h-[24px] max-h-[150px] overflow-y-auto"
          rows={1}
        />
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {showAttachments && (
              <label className="cursor-pointer p-2 rounded-full text-[#f4f4f4]/60 hover:text-white hover:bg-[#272727]">
                <Paperclip className="h-5 w-5" />
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  onChange={handleFileSelect} 
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
              </label>
            )}
            
            <button
              type="button"
              onClick={onSearchWeb}
              className={`flex items-center gap-2 px-3 py-1 ml-2 rounded-full ${
                isWebSearchActive ? 
                "bg-[#57E676]/20 text-[#57E676] hover:bg-[#57E676]/30" : 
                "text-[#f4f4f4]/60 hover:text-white hover:bg-[#272727]"
              }`}
              aria-label={webSearchAriaLabel}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Pesquisa na Web</span>
            </button>
          </div>
          
          {isLoading ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500"
              aria-label="Cancelar geração"
            >
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={(!message.trim() && attachments.length === 0)}
              className={cn(
                "rounded-full p-2.5 bg-[#58E877] hover:bg-[#4EDB82] disabled:opacity-50",
                (!message.trim() && attachments.length === 0) ? "text-[#1a1a1c]/60" : "text-[#1a1a1c]"
              )}
              aria-label="Enviar mensagem"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

