"use client"

import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

interface BriefingButtonProps {
  onClick: () => void
}

export function BriefingButton({ onClick }: BriefingButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="bg-transparent border-[#272727] text-white hover:bg-[#272727] transition-colors gap-2"
    >
      <FileText className="w-4 h-4" />
      Briefing
    </Button>
  )
} 