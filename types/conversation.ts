export interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  agent_id: string
  created_at: string
  updated_at: string
  messages: Message[]
}

