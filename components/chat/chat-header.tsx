"use client"

import { useState } from "react"
import { BriefingDialog } from "@/components/briefing/briefing-dialog"
import { BriefingButton } from "@/components/briefing/briefing-button"

interface ChatHeaderProps {
  title: string
  agentId: string
}

export function ChatHeader({ title, agentId }: ChatHeaderProps) {
  const [isBriefingOpen, setIsBriefingOpen] = useState(false)

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[#272727]">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <BriefingButton onClick={() => setIsBriefingOpen(true)} />
      </div>
      <BriefingDialog
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        agentId={agentId}
      />
    </div>
  )
}

