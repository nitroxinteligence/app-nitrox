import { motion } from "framer-motion"
import { Users, MessageSquare, PhoneCall } from "lucide-react"

interface OverviewTabProps {
  connectionDetails: {
    phoneNumber: string
    status: string
    contacts: number
    messages: number
  }
}

export function OverviewTab({ connectionDetails }: OverviewTabProps) {
  const variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-semibold text-white">Visão Geral</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1c] p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-[#E8F3ED]/60">Número</span>
            <PhoneCall className="h-5 w-5 text-[#58E877]" />
          </div>
          <p className="text-xl font-semibold text-white mt-2">{connectionDetails.phoneNumber}</p>
        </div>
        <div className="bg-[#1a1a1c] p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-[#E8F3ED]/60">Contatos</span>
            <Users className="h-5 w-5 text-[#58E877]" />
          </div>
          <p className="text-xl font-semibold text-white mt-2">{connectionDetails.contacts}</p>
        </div>
        <div className="bg-[#1a1a1c] p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-[#E8F3ED]/60">Mensagens</span>
            <MessageSquare className="h-5 w-5 text-[#58E877]" />
          </div>
          <p className="text-xl font-semibold text-white mt-2">{connectionDetails.messages}</p>
        </div>
      </div>
      <div className="bg-[#1a1a1c] p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Status da Conexão</h3>
        <p className="text-[#E8F3ED]/60">{connectionDetails.status}</p>
      </div>
    </motion.div>
  )
}

