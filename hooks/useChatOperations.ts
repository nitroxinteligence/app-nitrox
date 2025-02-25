"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase-client"
import type { Message } from "@/types/chat"

export function useChatOperations(agentId: string, sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const ensureUserProfile = useCallback(async (userId: string) => {
    try {
      // Verificar se o perfil existe
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) {
        if (profileError.code === "PGRST116") {
          // Perfil não existe, vamos criar
          const { data: session } = await supabase.auth.getSession()
          const { error: createError } = await supabase
            .from("profiles")
            .insert([{
              id: userId,
              email: session?.user?.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])

          if (createError) {
            console.error("Erro ao criar perfil:", createError)
            throw new Error("Não foi possível criar o perfil do usuário")
          }
        } else {
          throw profileError
        }
      }

      return true
    } catch (error) {
      console.error("Erro ao verificar/criar perfil:", error)
      throw new Error("Erro ao verificar perfil do usuário")
    }
  }, [])

  const ensureChatSession = useCallback(async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        console.error("Erro ao verificar autenticação:", authError)
        throw new Error("Erro ao verificar autenticação")
      }

      if (!session?.user) {
        console.log("Usuário não autenticado")
        throw new Error("Usuário não autenticado")
      }

      // Garantir que o perfil do usuário existe
      await ensureUserProfile(session.user.id)

      // Verificar se a sessão existe
      const { data: chatSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("id", sessionId)
        .single()

      if (sessionError) {
        if (sessionError.code === "PGRST116") {
          console.log("Criando nova sessão de chat...")
          const { data: newSession, error: createError } = await supabase
            .from("chat_sessions")
            .insert({
              id: sessionId,
              agent_id: agentId,
              user_id: session.user.id,
              title: "Novo Chat",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (createError) {
            console.error("Erro ao criar sessão:", createError)
            if (createError.code === "23503") {
              if (createError.details?.includes("profiles")) {
                throw new Error("Erro ao verificar perfil do usuário")
              } else {
                throw new Error("Agente não encontrado")
              }
            }
            throw new Error("Não foi possível criar a sessão do chat")
          }

          return newSession
        }
        throw new Error("Erro ao verificar sessão do chat")
      }

      // Verificar se o usuário tem acesso à sessão
      if (chatSession.user_id !== session.user.id) {
        throw new Error("Você não tem permissão para acessar esta sessão")
      }

      return chatSession
    } catch (err) {
      console.error("Erro em ensureChatSession:", err)
      if (err instanceof Error) {
        throw err
      }
      throw new Error("Falha ao verificar sessão do chat")
    }
  }, [sessionId, agentId, ensureUserProfile])

  const callWebhook = async (message: string): Promise<string> => {
    try {
      const response = await fetch(
        "https://node.nitroxinteligencia.com.br/webhook/75c1648f-aaac-407c-bd96-f118ce90bf2c",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId, agentId, chatInput: message }),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error("Error calling webhook:", error)
      throw new Error("Failed to get response from webhook")
    }
  }

  const fetchMessages = useCallback(async () => {
    try {
      console.log("Fetching messages for session:", sessionId)
      setIsTransitioning(true)
      setIsLoading(true)
      setError(null)
      
      const session = await ensureChatSession()
      console.log("Chat session confirmed:", session)

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching messages:", error)
        throw error
      }

      console.log("Fetched messages:", data)
      setMessages(data || [])
    } catch (err) {
      console.error("Error in fetchMessages:", err)
      const errorMessage = err instanceof Error ? err.message : "Falha ao carregar mensagens"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
      setIsTransitioning(false)
    }
  }, [sessionId, ensureChatSession])

  const sendMessage = useCallback(
    async (content: string) => {
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
        const webhookResponse = await callWebhook(content)

        const assistantMessage: Message = {
          role: "assistant",
          content: webhookResponse,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        }

        const { error: assistantInsertError } = await supabase.from("messages").insert([assistantMessage])

        if (assistantInsertError) throw assistantInsertError

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        console.error("Error in sendMessage:", err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, ensureChatSession],
  )

  return { messages, isLoading, isTransitioning, error, fetchMessages, sendMessage, callWebhook }
}

