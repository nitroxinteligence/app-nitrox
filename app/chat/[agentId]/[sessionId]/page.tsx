"use client"

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Spinner } from "@/components/ui/spinner"

// Carregamento dinâmico dos componentes com fallback
const ChatProvider = dynamic(() => import('@/hooks/useChatContext').then(mod => mod.ChatProvider), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center w-full h-screen"><Spinner size="lg" /></div>
})

const ChatInterface = dynamic(() => import('@/components/chat/chat-interface').then(mod => ({ default: mod.ChatInterface })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center w-full h-screen"><Spinner size="lg" /></div>
})

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
    <Suspense fallback={<div className="flex items-center justify-center w-full h-screen"><Spinner size="lg" /></div>}>
      <ChatProvider agentId={agentId} sessionId={sessionId}>
        <ChatInterface />
      </ChatProvider>
    </Suspense>
  )
}

