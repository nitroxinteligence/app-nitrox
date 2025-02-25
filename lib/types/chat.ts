export interface Message {
  id?: string
  role: "system" | "user" | "assistant"
  content: string
  session_id: string
  created_at: string
}

export interface ChatResponse {
  message: string
  error?: string
}

export interface StreamingChatResponse {
  role: string
  content: string
}

export interface ChatRequestBody {
  messages: Message[]
  agentId?: string
}

export interface Agent {
  id: string
  name: string
  description: string
  created_at: string
}

export interface ChatSession {
  id: string
  agent_id: string
  title: string
  created_at: string
}

export interface Department {
  id: string
  name: string
  created_at: string
}

