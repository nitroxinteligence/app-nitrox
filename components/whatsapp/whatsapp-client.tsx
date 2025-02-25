"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, WifiOff } from "lucide-react"
import { useWhatsAppSocket } from "@/hooks/use-whatsapp-socket"
import QRCode from "qrcode.react"

interface WhatsAppConnectionProps {
  onConnected: () => void
}

export function WhatsAppConnection({ onConnected }: WhatsAppConnectionProps) {
  const { state, qrCode, error, initialize } = useWhatsAppSocket()

  useEffect(() => {
    if (state === "connected") {
      onConnected()
    }
  }, [state, onConnected])

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-[#121214]/80 backdrop-blur-sm rounded-2xl border border-[#272727]">
      <h1 className="text-2xl font-semibold text-white mb-4 text-center">Conectar ao WhatsApp</h1>
      <p className="text-gray-400 text-sm mb-6 text-center">
        Use o WhatsApp no seu navegador conectando com o QR Code.
      </p>

      {state === "disconnected" && (
        <div className="flex flex-col items-center">
          <WifiOff className="w-16 h-16 text-yellow-500 mb-4" />
          <p className="text-yellow-500 text-sm text-center mb-4">Desconectado</p>
          <Button onClick={initialize} className="bg-[#5EEC92] text-[#121214] hover:bg-[#4EDB82]">
            Conectar
          </Button>
        </div>
      )}

      {state === "connecting" && (
        <div className="flex flex-col items-center">
          {qrCode ? (
            <QRCode value={qrCode} size={256} />
          ) : (
            <Loader2 className="w-16 h-16 text-[#5EEC92] animate-spin mb-4" />
          )}
          <p className="text-[#5EEC92] text-sm text-center mt-4">{qrCode ? "Escaneie o QR Code" : "Conectando..."}</p>
        </div>
      )}

      {state === "connected" && (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-[#5EEC92] rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-[#121214]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[#5EEC92] text-sm text-center mb-4">Conectado com sucesso!</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-500 text-center">
        Suas mensagens pessoais são protegidas com criptografia de ponta a ponta
      </p>
    </div>
  )
}

