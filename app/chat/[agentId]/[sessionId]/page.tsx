"use client"

import { ChatProvider } from "@/hooks/useChatContext"
import { ChatInterface } from "@/components/chat/chat-interface"

interface ChatPageProps {
  params: {
    agentId: string
    sessionId: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  const { agentId, sessionId } = params

  if (!agentId || !sessionId) {
    return <div>Invalid agent or session ID</div>
  }

  return (
    <ChatProvider agentId={agentId} sessionId={sessionId}>
      <ChatInterface />
    </ChatProvider>
  )
}

