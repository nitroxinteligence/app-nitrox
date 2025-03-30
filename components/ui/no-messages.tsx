"use client"

import { WelcomeScreen } from "@/components/ui/welcome-screen"
import { AgentInfo } from "@/types"

interface NoMessagesProps {
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>
  isLoading: boolean
  agentInfo?: AgentInfo
  briefingData?: {
    title: string
    description: string
  }
  userName?: string
  onOpenHistory?: () => void
}

export function NoMessages({ 
  onSendMessage, 
  isLoading, 
  agentInfo, 
  briefingData,
  userName,
  onOpenHistory
}: NoMessagesProps) {
  return (
    <div className="flex w-full h-full flex-col items-center justify-center">
      <WelcomeScreen 
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        userName={userName}
        onOpenHistory={onOpenHistory}
      />
    </div>
  )
} 