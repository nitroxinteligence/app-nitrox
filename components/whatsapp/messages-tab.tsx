import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function MessagesTab({ connectionId }: MessagesTabProps) {
  const [message, setMessage] = useState("")

  const handleSendMessage = () => {
    // Aqui você implementaria a lógica para enviar a mensagem
    console.log(`Enviando mensagem para a conexão ${connectionId}: ${message}`)
    setMessage("")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-semibold text-white">Mensagens</h2>
      <div className="bg-[#1a1a1c] p-4 rounded-lg h-64 overflow-y-auto">
        {/* Aqui você exibiria as mensagens */}
        <p className="text-[#E8F3ED]/60">Nenhuma mensagem para exibir.</p>
      </div>
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-grow bg-[#1a1a1c] border-[#272727] text-white"
        />
        <Button onClick={handleSendMessage} className="bg-[#58E877] text-black hover:bg-[#4EDB82]">
          Enviar
        </Button>
      </div>
    </motion.div>
  )
}

