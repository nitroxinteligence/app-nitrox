import type { Message } from "@/types/chat"

class ChatCache {
  private cache: Map<string, Message[]>

  constructor() {
    this.cache = new Map()
  }

  getMessages(sessionId: string): Message[] | undefined {
    return this.cache.get(sessionId)
  }

  setMessages(sessionId: string, messages: Message[]) {
    this.cache.set(sessionId, messages)
  }

  addMessage(sessionId: string, message: Message) {
    const messages = this.getMessages(sessionId) || []
    messages.push(message)
    this.setMessages(sessionId, messages)
  }

  clearCache(sessionId: string) {
    this.cache.delete(sessionId)
  }
}

export const chatCache = new ChatCache()

