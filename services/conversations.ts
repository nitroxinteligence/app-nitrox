import { supabase } from "@/lib/supabase-client"
import type { Conversation } from "@/types/conversation"

export async function getConversation(sessionId: string): Promise<Conversation | null> {
  const { data, error } = await supabase.from("conversations").select("*, messages(*)").eq("id", sessionId).single()

  if (error) {
    console.error("Error fetching conversation:", error)
    return null
  }

  return data as Conversation
}

export async function getAllConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.from("conversations").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching all conversations:", error)
    return []
  }

  return data as Conversation[]
}

