import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface ConnectionTabProps {
  connectionDetails: {
    status: string
  }
}

export function ConnectionTab({ connectionDetails }: ConnectionTabProps) {
  const handleReconnect = () => {
    // Aqui você implementaria a lógica para reconectar
    console.log("Tentando reconectar...")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-semibold text-white">Conexão</h2>
      <div className="bg-[#1a1a1c] p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Status da Conexão</h3>
        <p className="text-[#E8F3ED]/60 mb-4">{connectionDetails.status}</p>
        <div className="relative group">
          <button
            onClick={handleReconnect}
            className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white to-[#E8F3ED] p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>

            <span className="relative z-10 block px-5 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#272727] text-sm">
              <div className="relative z-10 flex items-center justify-center">
                <span className="transition-all duration-500 text-sm text-white">Reconectar</span>
              </div>
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

