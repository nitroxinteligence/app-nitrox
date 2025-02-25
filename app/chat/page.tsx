"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChatHistory } from "@/components/chat/chat-history"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatHeader } from "@/components/chat/chat-header"

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([])

  const handleSendMessage = async (content: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: "user", content }])

    // TODO: Implement API call to get AI response
    // For now, we'll just echo the message
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: `Echo: ${content}` }])
    }, 1000)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B]">
      {/* Gradient Orbs */}
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-[#58E877] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-[20%] -z-10 h-[600px] w-[600px] rounded-full bg-[#FFFBA1] opacity-10 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative rounded-2xl bg-black/40 backdrop-blur-xl"
        >
          <div className="flex h-[calc(100vh-8rem)]">
            <ChatHistory />
            <div className="flex-1 flex flex-col">
              <ChatHeader 
                title="Chat com IA" 
                agentId="default" 
              />
              <div className="flex-1 overflow-y-auto p-4">
                <ChatMessages messages={messages} />
              </div>
              <ChatInput onSend={handleSendMessage} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

