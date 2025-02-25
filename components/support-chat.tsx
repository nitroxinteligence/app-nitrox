"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Paperclip } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useChat } from "ai/react"
import { usePathname } from "next/navigation"

interface Message {
  id: string
  content: string
  timestamp: string
  sender: "user" | "assistant"
}

export default function SupportChat() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/support-chat",
    initialMessages: [],
  })

  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      console.log("File selected:", file.name)
      // Implement file upload logic here if needed
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(e)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50" ref={containerRef}>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(true)}
            className="bg-[#58E877] p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
            aria-label="Abrir chat de suporte"
          >
            <MessageCircle className="w-6 h-6 text-black" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 w-[380px] overflow-hidden"
          >
            <Card className="border-[#272727] bg-[#121214] shadow-xl">
              <CardHeader className="border-b border-[#272727] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">Suporte Brazil Flow</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:bg-[#272727] hover:text-[#58E877] transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div ref={chatContainerRef} className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            message.sender === "assistant"
                              ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Imagem%20Clara.jpg-wzhmRAzDpPMeAa0Zd5BbaZASxK6d0w.jpeg"
                              : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/8113070.jpg-hlqTeJbeg0ay574rgRRCzOxmuaA8Wm.jpeg"
                          }
                          alt={message.sender === "assistant" ? "AI" : "User"}
                        />
                        <AvatarFallback>{message.sender === "assistant" ? "AI" : "U"}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg p-3 max-w-[80%] ${
                          message.sender === "user" ? "bg-[#2a2a2b] text-white ml-auto" : "bg-[#1a1a1c] text-white"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Imagem%20Clara.jpg-wzhmRAzDpPMeAa0Zd5BbaZASxK6d0w.jpeg"
                          alt="AI"
                        />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className="bg-[#1a1a1c] rounded-lg p-3 text-white">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-[#58E877] rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-[#58E877] rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 bg-[#58E877] rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#272727] p-4">
                  <form onSubmit={onSubmit} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:text-[#58E877] hover:bg-[#272727] transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-[#1a1a1c] border-[#272727] text-white placeholder:text-white/40"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="bg-[#58E877] hover:bg-[#4EDB82] text-black"
                      disabled={isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".doc,.docx,.pdf,.xls,.xlsx,image/*"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

