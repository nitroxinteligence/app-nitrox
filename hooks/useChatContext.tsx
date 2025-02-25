"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { supabase } from "@/lib/supabase-client"
import type { Message } from "@/types/chat"

interface ChatContextType {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  fetchMessages: () => Promise<void>
  toggleWebhook: () => void
  isWebhookEnabled: boolean
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}

interface ChatProviderProps {
  children: ReactNode
  agentId: string
  sessionId: string
}

export function ChatProvider({ children, agentId, sessionId }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWebhookEnabled, setIsWebhookEnabled] = useState(true)

  const ensureAgent = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("agents").select("id, name").eq("id", agentId).single()

      if (error) {
        if (error.code === "PGRST116") {
          const { error: insertError } = await supabase
            .from("agents")
            .insert({ 
              id: agentId, 
              name: `Agent ${agentId}`, 
              description: "Auto-created agent",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) throw insertError
        } else {
          throw error
        }
      }
    } catch (err) {
      console.error("Error ensuring agent:", err)
      setError("Failed to create or verify agent")
    }
  }, [agentId])

  const ensureChatSession = useCallback(async () => {
    try {
      await ensureAgent()

      const { data, error } = await supabase.from("chat_sessions").select("id").eq("id", sessionId).single()

      if (error) {
        if (error.code === "PGRST116") {
          const { error: insertError } = await supabase
            .from("chat_sessions")
            .insert({ 
              id: sessionId, 
              agent_id: agentId, 
              title: "New Chat",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            if (insertError.code === "23505") {
              console.log("Chat session already exists, proceeding with existing session")
            } else {
              throw insertError
            }
          }
        } else {
          throw error
        }
      }
    } catch (err) {
      console.error("Error ensuring chat session:", err)
      setError("Failed to create or verify chat session")
    }
  }, [sessionId, agentId, ensureAgent])

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await ensureChatSession()

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch (err) {
      console.error("Error in fetchMessages:", err)
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, ensureChatSession])

  const sendMessage = useCallback(async (content: string) => {
    try {
      setIsLoading(true)
      setError(null)
      await ensureChatSession()

      const newMessage: Message = {
        role: "user",
        content,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      }

      const { data: insertedMessage, error: insertError } = await supabase
        .from("messages")
        .insert([newMessage])
        .select()

      if (insertError) throw insertError

      setMessages((prev) => [...prev, insertedMessage[0]])

      // Call the webhook and get the response
      const response = await fetch(
        "https://node.nitroxinteligencia.com.br/webhook/75c1648f-aaac-407c-bd96-f118ce90bf2c",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId, agentId, chatInput: content }),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      }

      const { error: assistantInsertError } = await supabase
        .from("messages")
        .insert([assistantMessage])

      if (assistantInsertError) throw assistantInsertError

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error("Error in sendMessage:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, agentId, ensureChatSession])

  const toggleWebhook = useCallback(() => {
    setIsWebhookEnabled((prev) => !prev)
    console.log(`Webhook ${!isWebhookEnabled ? "ativado" : "desativado"}`)
  }, [isWebhookEnabled])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const contextValue: ChatContextType = {
    messages,
    isLoading,
    error,
    sendMessage,
    fetchMessages,
    toggleWebhook,
    isWebhookEnabled,
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}