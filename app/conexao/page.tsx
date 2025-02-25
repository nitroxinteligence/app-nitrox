'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ConnectionCard } from '@/components/whatsapp/connection-card'
import { WhatsAppConnection } from '@/components/whatsapp/whatsapp-connection'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface WhatsAppConnection {
 id: string
 title: string
 status: 'conectado' | 'desconectado' | 'conectando'
 phoneNumber: string
 contacts: number
 messages: number
 avatar?: string
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function WhatsAppPage() {
 const [connections, setConnections] = useState<WhatsAppConnection[]>([
   {
     id: '1',
     title: 'Colaborador IA SDR',
     status: 'desconectado',
     phoneNumber: '5581987654321',
     contacts: 1238,
     messages: 95,
     avatar: '/placeholder.svg'
   },
   {
     id: '2',
     title: 'Colaborador IA Suporte',
     status: 'conectando',
     phoneNumber: '5581987654322',
     contacts: 0,
     messages: 0,
     avatar: '/placeholder.svg'
   }
 ])

 const [showConnection, setShowConnection] = useState(false)

 const handleDelete = (id: string) => {
   setConnections(prev => prev.filter(conn => conn.id !== id))
 }

 const handleNewConnection = () => {
   setShowConnection(true)
 }

 const handleConnectionSuccess = (newConnection: WhatsAppConnection) => {
   setConnections(prev => [...prev, newConnection])
   setShowConnection(false)
 }

 return (
   <motion.div
     initial="hidden"
     animate="visible"
     variants={containerVariants}
     className="relative min-h-screen w-full overflow-hidden"
   >
     <div className="relative min-h-screen w-full overflow-hidden">
       {/* Background color */}
       <div className="fixed inset-0 w-full h-full bg-[#0A0A0B] -z-10" />
       <div className="mx-auto max-w-7xl px-4 pt-0 pb-0">
         <div
           className="relative rounded-2xl bg-black/40 backdrop-blur-xl"
         >
           <div className="space-y-12 p-8">
             {/* Header Section */}
             <div className="space-y-4">
               <h1 
                 className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-4xl font-regular text-transparent tracking-[-0.02em]"
               >
                 WhatsApp
               </h1>
               <p 
                 className="max-w-2xl text-[#E8F3ED]/60 text-lg font-normal"
               >
                 Gerencie todas as conversas do seu Colaborador IA de forma eficiente.
               </p>
             </div>

             {/* Connection Cards */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {connections.map((connection) => (
                 <ConnectionCard
                   key={connection.id}
                   {...connection}
                   onDelete={() => handleDelete(connection.id)}
                 />
               ))}
               <Button onClick={handleNewConnection} className="bg-[#121214]/80 border border-dashed border-[#272727] rounded-lg hover:border-[#58E877]/50 transition-colors flex items-center justify-center h-full w-full">
                 <Plus className="mr-2 h-4 w-4" />
                 <span className="text-[#58E877]">Adicionar nova conexão</span>
               </Button>
             </div>
           </div>
         </div>
       </div>

       {showConnection && (
         <WhatsAppConnection
           onClose={() => setShowConnection(false)}
           onSuccess={handleConnectionSuccess}
         />
       )}
     </div>
   </motion.div>
 )
}

