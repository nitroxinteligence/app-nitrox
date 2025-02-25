"use client"

import { useEffect, useRef } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import QRCode from "qrcode"

interface WhatsAppQRCodeProps {
  qrCode: string | null
  error: string | null
  onRetry: () => void
}

export function WhatsAppQRCode({ qrCode, error, onRetry }: WhatsAppQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (qrCode && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrCode, {
        width: 256,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }).catch(console.error)
    }
  }, [qrCode])

  if (error) {
    return (
      <div className="w-64 h-64 mx-auto flex flex-col items-center justify-center bg-[#1a1a1c] rounded-lg p-4">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        <Button onClick={onRetry} className="bg-red-500 hover:bg-red-600 text-white">
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!qrCode) {
    return (
      <div className="w-64 h-64 mx-auto flex items-center justify-center bg-[#1a1a1c] rounded-lg">
        <Loader2 className="w-8 h-8 text-[#5EEC92] animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto p-4 bg-white rounded-lg">
      <canvas ref={canvasRef} />
    </div>
  )
}

