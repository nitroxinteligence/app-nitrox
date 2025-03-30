"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, LightbulbIcon, ChevronDownIcon, ArrowUpIcon, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WelcomeScreenProps {
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>
  isLoading: boolean
  userName?: string
}

export function WelcomeScreen({ onSendMessage, isLoading, userName = "usuário" }: WelcomeScreenProps) {
  const [message, setMessage] = useState("")
  const [timeOfDay, setTimeOfDay] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  
  // Determinar o horário do dia para saudação
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setTimeOfDay("Bom dia")
    } else if (hour >= 12 && hour < 18) {
      setTimeOfDay("Boa tarde")
    } else {
      setTimeOfDay("Boa noite")
    }
  }, [])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() && !attachments.length) return
    
    await onSendMessage(message, attachments.length > 0 ? attachments : undefined)
    setMessage("")
    setAttachments([])
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments(Array.from(e.target.files))
    }
  }
  
  const clearSelectedMode = () => {
    // Preservar texto existente que o usuário possa ter adicionado
    if (selectedMode) {
      const modePrefixes: Record<string, string> = {
        "latest-news": "Preciso das últimas notícias sobre ",
        "companion": "Quero conversar sobre ",
        "unhinged": "Me responda de forma descontraída sobre ",
        "loyal-friend": "Como um amigo, me ajude com ",
        "homework": "Preciso de ajuda com a tarefa sobre ",
        "not-doctor": "Tenho uma dúvida não-médica sobre ",
        "not-therapist": "Quero conversar (não como terapia) sobre "
      }
      
      const prefix = modePrefixes[selectedMode]
      if (prefix && message.startsWith(prefix)) {
        setMessage(message.substring(prefix.length))
      }
    }
    
    setSelectedMode(null)
  }
  
  const assistantModes = [
    { id: "latest-news", name: "Últimas Notícias", icon: "📰" },
    { id: "companion", name: "Companheiro", icon: "❤️" },
    { id: "unhinged", name: "Descontraído", icon: "😜" },
    { id: "loyal-friend", name: "Amigo Fiel", icon: "👋" },
    { id: "homework", name: "Ajuda com Tarefas", icon: "📝" },
    { id: "not-doctor", name: "Não é um Médico", icon: "🩺" },
    { id: "not-therapist", name: "Não é um Terapeuta", icon: "🧠" },
  ]
  
  const setMode = (modeId: string) => {
    // Se já estiver selecionado, desmarcar
    if (selectedMode === modeId) {
      clearSelectedMode()
      return
    }
    
    // Se outro modo estava selecionado, limpar primeiro
    if (selectedMode) {
      clearSelectedMode()
    }
    
    setSelectedMode(modeId)
    
    // Adicionar um prefixo baseado no modo selecionado
    const modePrefixes: Record<string, string> = {
      "latest-news": "Preciso das últimas notícias sobre ",
      "companion": "Quero conversar sobre ",
      "unhinged": "Me responda de forma descontraída sobre ",
      "loyal-friend": "Como um amigo, me ajude com ",
      "homework": "Preciso de ajuda com a tarefa sobre ",
      "not-doctor": "Tenho uma dúvida não-médica sobre ",
      "not-therapist": "Quero conversar (não como terapia) sobre "
    }
    
    if (modePrefixes[modeId]) {
      setMessage(modePrefixes[modeId] + message)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <motion.div 
        className="w-full max-w-2xl flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-3">{timeOfDay}, {userName}.</h1>
        <p className="text-xl text-[#f4f4f4]/80 mb-12">Como posso ajudar você hoje?</p>
        
        <div className="w-full">
          <form onSubmit={handleSubmit} className="relative">
            <div className="rounded-xl bg-[#1c1c1c] border border-[#272727] p-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="O que você deseja saber?"
                className="w-full bg-transparent border-none text-white resize-none outline-none placeholder:text-[#f4f4f4]/40 min-h-[100px]"
              />
              
              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="bg-[#272727] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer p-2 rounded-full text-[#f4f4f4]/60 hover:text-white hover:bg-[#272727]">
                    <Paperclip className="h-5 w-5" />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileChange} 
                      multiple
                    />
                  </label>
                  
                  <div className="flex items-center gap-1 bg-[#272727] rounded-full px-3 py-1.5">
                    <Search className="h-4 w-4 text-[#f4f4f4]/60" />
                    <span className="text-sm text-[#f4f4f4]/80">Pesquisa</span>
                    <ChevronDownIcon className="h-4 w-4 text-[#f4f4f4]/60" />
                  </div>
                  
                  <div className="flex items-center gap-1 bg-[#272727] rounded-full px-3 py-1.5">
                    <LightbulbIcon className="h-4 w-4 text-[#f4f4f4]/60" />
                    <span className="text-sm text-[#f4f4f4]/80">Pensar</span>
                  </div>
                  
                  {selectedMode && (
                    <button
                      type="button"
                      onClick={clearSelectedMode}
                      className="flex items-center gap-1 bg-[#58E877]/20 text-[#58E877] rounded-full px-3 py-1.5"
                    >
                      <span className="text-sm">Limpar modo</span>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                <Button
                  type="submit"
                  disabled={(!message.trim() && !attachments.length) || isLoading}
                  className={cn(
                    "rounded-full p-2.5 bg-[#58E877] hover:bg-[#4EDB82] disabled:opacity-50",
                    (!message.trim() && !attachments.length) ? "text-[#1a1a1c]/60" : "text-[#1a1a1c]"
                  )}
                >
                  <ArrowUpIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </form>
        </div>
        
        <div className="mt-10 w-full">
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {assistantModes.map((mode) => (
              <Button
                key={mode.id}
                onClick={() => setMode(mode.id)}
                className={cn(
                  "rounded-full px-4 py-2 bg-[#272727] hover:bg-[#3a3a3c]",
                  selectedMode === mode.id ? "bg-[#58E877]/20 border border-[#58E877] text-[#58E877]" : "text-[#f4f4f4]"
                )}
              >
                <span className="mr-2">{mode.icon}</span>
                <span>{mode.name}</span>
              </Button>
            ))}
          </div>
          
          <Button 
            variant="link" 
            className="text-[#f4f4f4]/60 hover:text-[#f4f4f4] text-sm"
          >
            Alternar para Sugestões
          </Button>
        </div>
      </motion.div>
    </div>
  )
} 