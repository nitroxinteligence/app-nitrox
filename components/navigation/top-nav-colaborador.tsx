"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function TopNavColaborador() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="bg-[#0A0A0B] border-b border-[#272727] min-h-[64px] flex items-center justify-center">
      <Link href="/form-colaborador">
        <Button
          className={`
            bg-black text-white border border-[#272727] rounded-lg px-4 py-2
            transition-all duration-300 ease-in-out
            ${isHovered ? "border-white" : ""}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          Criar Colaborador personalizado
        </Button>
      </Link>
    </div>
  )
}

