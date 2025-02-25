'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChatHistory } from '@/components/chat/chat-history'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatHeader } from '@/components/chat/chat-header'
import { Message } from '@/types/chat'

export default function ChatPage() {
  const { agentId } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      <ChatHistory agentId={agentId as string} />
      <div className="flex-1 flex flex-col">
        <ChatHeader />
        <div className="flex-1 overflow-y-auto p-4">
          <ChatMessages messages={messages} isLoading={isLoading} />
          <div ref={messagesEndRef} />
        </div>
        <ChatInput
          onSend={async (content, attachments) => {
            setIsLoading(true)
            // Add user message
            setMessages(prev => [...prev, { role: 'user', content }])
            
            try {
              const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messages: [...messages, { role: 'user', content }],
                  agentId,
                  attachments,
                }),
              })
              
              const data = await response.json()
              
              // Add AI response
              setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
            } catch (error) {
              console.error('Error:', error)
            } finally {
              setIsLoading(false)
            }
          }}
        />
      </div>
    </div>
  )
}

