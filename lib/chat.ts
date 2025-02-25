import type { Message } from "@/types/chat"

export const formatChatMessages = (messages: Message[]) => {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

export const validateMessages = (messages: any[]): boolean => {
  return (
    Array.isArray(messages) &&
    messages.every(
      (msg) =>
        typeof msg === "object" &&
        "role" in msg &&
        "content" in msg &&
        typeof msg.role === "string" &&
        typeof msg.content === "string",
    )
  )
}

