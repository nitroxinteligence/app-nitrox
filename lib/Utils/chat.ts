import type { Message } from "@/types/chat"

export function formatChatMessages(messages: Message[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))
}

export function validateMessages(messages: any[]): messages is Message[] {
  return (
    Array.isArray(messages) &&
    messages.every(
      (message) =>
        typeof message === "object" &&
        typeof message.content === "string" &&
        ["system", "user", "assistant"].includes(message.role),
    )
  )
}

