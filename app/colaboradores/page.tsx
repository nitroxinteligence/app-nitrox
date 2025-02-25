'use client'

import { useState } from 'react'
import { Plus, MessageSquare, MoreVertical, Users, Settings, Copy, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion } from 'framer-motion'

interface Collaborator {
 id: string
 name: string
 description: string
 type: 'opt-in' | 'all' | 'non-opt-in'
 status: 'active' | 'inactive'
}

const mockCollaborators: Collaborator[] = [
 {
   id: '1',
   name: 'Clara da Clínica DLeon - Lucas Firmino',
   description: 'Colaborador IA para SDR',
   type: 'opt-in',
   status: 'active'
 },
 {
   id: '2',
   name: 'Sofia da Brazilian Brain',
   description: 'Colaborador IA para Suporte Técnico',
   type: 'all',
   status: 'active'
 }
]

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function ColaboradoresPage() {
 const [collaborators] = useState<Collaborator[]>(mockCollaborators)
 const [currentPlan, setCurrentPlan] = useState(2) // Assuming the user is on plan 2
 const [additionalCollaborators, setAdditionalCollaborators] = useState(1) // Assuming the user has purchased 1 additional collaborator

 const totalAvailableCollaborators = currentPlan + additionalCollaborators
 const usedCollaborators = collaborators.length
 const remainingCollaborators = totalAvailableCollaborators - usedCollaborators

 return (
   <motion.div
     initial="hidden"
     animate="visible"
     variants={containerVariants}
     className="relative min-h-screen w-full overflow-hidden"
   >
     {/* Background color */}
     <div className="fixed inset-0 w-full h-full bg-[#0A0A0B] -z-10" />
     <div className="mx-auto max-w-7xl px-4 pt-0 pb-0"> {/* Updated outer container padding */}
       <div
         className="relative rounded-2xl bg-black/40 backdrop-blur-xl"
       >
         <div className="space-y-12 p-8"> {/* Increased padding for more internal spacing */}
         {/* Header Section */}
         <div className="mb-8">
           <div className="flex items-center justify-between mb-4">
             <h1 className="text-3xl font-regular">
               <span className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent">
                 Colaboradores
               </span>
             </h1>
             <div className="flex items-center gap-2 bg-[#121214] rounded-full px-4 py-2">
               <span className="text-white font-regular">
                 {usedCollaborators}/{totalAvailableCollaborators} Colaboradores IA
               </span>
             </div>
           </div>
           <p className="text-[#E8F3ED]/60 text-lg">
             Gerencie seus colaboradores IA para automatizar tarefas de forma inteligente
           </p>
         </div>


         {/* New Collaborator Button */}
         <div
           className="mb-8"
         >
           <Link href="/colaborador-IA">
             <Card className="bg-[#121214]/80 border-white/[0.05] hover:border-[#58E877]/20 transition-all duration-300 cursor-pointer group">
               <CardContent className="p-4">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-lg bg-[#58E877]/10 flex items-center justify-center group-hover:bg-[#58E877]/20 transition-colors duration-300">
                     <Plus className="w-6 h-6 text-[#58E877]" />
                   </div>
                   <div className="flex-1">
                     <h3 className="text-white text-lg font-medium">Novo colaborador IA</h3>
                     <p className="text-[#E8F3ED]/60">Criar um novo colaborador IA para sua equipe</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </Link>
         </div>

         {/* Collaborators Grid */}
         <div className="grid gap-4">
           {collaborators.map((collaborator, index) => (
             <div
               key={collaborator.id}
             >
               <CollaboratorCard {...collaborator} />
             </div>
           ))}
         </div>
         </div> {/* Close the new inner div */}
       </div>
     </div>
   </motion.div>
 )
}

function CollaboratorCard({ id, name, description, type, status }: Collaborator) {
 return (
   <Card className="bg-[#121214]/80 border-white/[0.05] hover:border-[#58E877]/20 transition-all duration-300 group">
     <CardContent className="p-6">
       <div className="flex items-start justify-between">
         <div className="flex items-start gap-4">
           <div className="w-12 h-12 rounded-full bg-[#1a1a1c] flex items-center justify-center">
             <MessageSquare className="w-6 h-6 text-[#58E877]" />
           </div>
           <div>
             <h3 className="text-white text-lg font-medium mb-1">{name}</h3>
             <p className="text-[#E8F3ED]/60">{description}</p>
           </div>
         </div>
         <CollaboratorActions id={id} />
       </div>
       <CollaboratorStatus status={status} type={type} />
     </CardContent>
   </Card>
 )
}

function CollaboratorStatus({ status, type }: { status: string, type: string }) {
 return (
   <div className="mt-4 flex items-center gap-2">
     <div className="flex items-center gap-1.5">
       <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-[#58E877]' : 'bg-gray-500'}`} />
       <span className="text-[#E8F3ED]/60 text-sm">{status === 'active' ? 'Ativo' : 'Inativo'}</span>
     </div>
     <div className="w-1 h-1 rounded-full bg-[#E8F3ED]/20" />
     <span className="text-[#E8F3ED]/60 text-sm">
       {type === 'opt-in' && 'Apenas opt-ins'}
       {type === 'all' && 'Todos os usuários'}
       {type === 'non-opt-in' && 'Apenas não opt-ins'}
     </span>
   </div>
 )
}

function CollaboratorActions({ id }: { id: string }) {
 return (
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <Button 
         variant="ghost" 
         size="icon" 
         className="text-white/40 hover:text-black hover:bg-[#58E877]"
       >
         <MoreVertical className="w-5 h-5" />
       </Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1c] border-[#272727] text-white">
       <DropdownMenuItem 
         className="hover:bg-[#58E877] hover:text-black cursor-pointer"
         onClick={() => console.log('Configurações clicked for', id)}
       >
         <Settings className="mr-2 h-4 w-4" />
         <span>Configurações</span>
       </DropdownMenuItem>
       <DropdownMenuItem 
         className="hover:bg-[#58E877] hover:text-black cursor-pointer"
         onClick={() => console.log('Duplicar clicked for', id)}
       >
         <Copy className="mr-2 h-4 w-4" />
         <span>Duplicar</span>
       </DropdownMenuItem>
       <DropdownMenuItem 
         className="hover:bg-[#58E877] hover:text-black cursor-pointer"
         onClick={() => console.log('Excluir clicked for', id)}
       >
         <Trash2 className="mr-2 h-4 w-4" />
         <span>Excluir</span>
       </DropdownMenuItem>
     </DropdownMenuContent>
   </DropdownMenu>
 )
}

