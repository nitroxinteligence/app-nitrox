'use client'

import { useState } from 'react'
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
 TooltipProvider
} from '@/components/ui/tooltip'
import { CircleIcon as InformationCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { Cpu } from 'lucide-react'
import { MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const navigationItems = [
 { label: 'Tecnologia', icon: Cpu, href: '/colaborador-config/tecnologia' },
 { label: 'Instruções', icon: Cpu, href: '/colaborador-config/instrucoes' },
 { label: 'Conhecimento', icon: Cpu, href: '/colaborador-config/conhecimento' },
 { label: 'Ferramentas', icon: Cpu, href: '/colaborador-config/ferramentas' },
 { label: 'Ambientes', icon: Cpu, href: '/colaborador-config/ambientes' },
 { label: 'Estágios', icon: Cpu, href: '/colaborador-config/estagios' },
 { label: 'Sub-agentes', icon: Cpu, href: '/colaborador-config/sub-agentes' },
]

export default function ColaboradorConfigPage() {
 const [selectedModel, setSelectedModel] = useState('Llama3.2 90b Vision')
 const [temperature, setTemperature] = useState(0.1)
 const [restricaoConhecimento, setRestricaoConhecimento] = useState(true)
 const [detectorIdioma, setDetectorIdioma] = useState(true)
 const [selectedTimeZone, setSelectedTimeZone] = useState('America/Sao_Paulo (GMT-3)')

 return (
   <div className="bg-[#121214] min-h-screen w-full p-6">
     {/* Profile Header */}
     <div className="flex items-center mb-8">
       <Cpu size={48} className="text-[#FF4747] mr-4" />
       <div className="flex-1">
         <h2 className="text-2xl font-bold text-white">Clara da Clínica DLeon - Lucas Firmino</h2>
         <p className="text-gray-400 text-sm">https://dash.superagentes.ai/agents/cm1s8ijh100ysl23c2i02hacv/...</p>
         <p className="text-gray-400 text-sm">Agente de IA para SDR (atendimento a leads)</p>
       </div>
       <div className="flex items-center gap-2">
         <Button className="bg-[#FF4747] text-white hover:bg-[#FF6B6B]">Conversar</Button>
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="icon">
               <MoreVertical className="h-4 w-4 text-white" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent className="bg-[#1E1E1E] border-[#333] text-white">
             <DropdownMenuItem>Opção 1</DropdownMenuItem>
             <DropdownMenuItem>Opção 2</DropdownMenuItem>
             <DropdownMenuItem>Opção 3</DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       </div>
     </div>

     {/* Navigation */}
     <nav className="mb-8">
       <ul className="flex items-center gap-4">
         {navigationItems.map((item, index) => (
           <li key={index}>
             <Link
               href={item.href}
               className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors
                 ${index === 0 ? 'bg-[#1E1E1E] text-white border-[#333]' : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'}
               `}
             >
               <item.icon className="w-4 h-4" />
               <span>{item.label}</span>
             </Link>
           </li>
         ))}
       </ul>
     </nav>

     {/* Main Area */}
     <TooltipProvider>
     <div className="space-y-8">
       <div className="flex items-center justify-between mb-4">
         <div>
           <h3 className="text-xl font-bold text-white">Configurações do Modelo</h3>
           <p className="text-gray-400 text-sm">Configure o modelo de IA para seu agente</p>
         </div>
         <Button className="bg-[#FF4747] text-white hover:bg-[#FF6B6B]">Salvar</Button>
       </div>

       {/* Model Selection */}
       <Card className="bg-[#1E1E1E] border-[#333]">
         <CardContent className="p-6 space-y-4">
           <div className="flex items-center justify-between">
             <label htmlFor="model" className="text-white">Modelo</label>
             <Tooltip>
               <TooltipTrigger>
                 <InformationCircle className="w-4 h-4 text-gray-400 cursor-pointer" />
                 <TooltipContent className="bg-[#1E1E1E] border-[#333] text-white">
                   Selecione o modelo de IA que você deseja usar.
                 </TooltipContent>
               </TooltipTrigger>
             </Tooltip>
           </div>
           <Select value={selectedModel} onValueChange={setSelectedModel}>
             <SelectTrigger className="bg-[#121214] border-[#333] text-white">
               <SelectValue placeholder="Selecione um modelo" />
             </SelectTrigger>
             <SelectContent className="bg-[#1E1E1E] border-[#333] text-white">
               <SelectItem value="Llama3.2 90b Vision">Llama3.2 90b Vision</SelectItem>
               {/* Add more model options here */}
             </SelectContent>
           </Select>
           <p className="text-gray-400 text-sm">O modelo GPT 40 oferece respostas mais precisas e segue as instruções com mais eficácia.</p>
         </CardContent>
       </Card>

       {/* Temperature Control */}
       <Card className="bg-[#1E1E1E] border-[#333]">
         <CardContent className="p-6 space-y-4">
           <div className="flex items-center justify-between">
             <label htmlFor="temperature" className="text-white">Aleatoriedade da resposta (Temperatura)</label>
             <Tooltip>
               <TooltipTrigger>
                 <InformationCircle className="w-4 h-4 text-gray-400 cursor-pointer" />
                 <TooltipContent className="bg-[#1E1E1E] border-[#333] text-white">
                   Controla a aleatoriedade das respostas. Valores mais baixos resultam em respostas mais previsíveis.
                 </TooltipContent>
               </TooltipTrigger>
             </Tooltip>
           </div>
           <Slider
             id="temperature"
             min={0}
             max={1}
             step={0.1}
             value={[temperature]}
             onValueChange={(value) => setTemperature(value[0])}
           />
           <p className="text-gray-400 text-sm">Mantenha em 0.5 para uma resposta mais consistente.</p>
         </CardContent>
       </Card>

       {/* Behavior Section */}
       <Card className="bg-[#1E1E1E] border-[#333]">
         <CardHeader>
           <CardTitle className="text-white">Comportamento</CardTitle>
         </CardHeader>
         <CardContent className="p-6 space-y-4">
           <div className="flex items-center gap-2">
             <Checkbox checked={restricaoConhecimento} onCheckedChange={setRestricaoConhecimento} />
             <div className="flex items-center gap-2">
               <label htmlFor="restricaoConhecimento" className="text-white">Restrição de conhecimento</label>
               <Tooltip>
                 <TooltipTrigger>
                   <InformationCircle className="w-4 h-4 text-gray-400 cursor-pointer" />
                   <TooltipContent className="bg-[#1E1E1E] border-[#333] text-white">
                     Quando ativados, algumas instruções extras serão adicionadas ao prompt do sistema.
                   </TooltipContent>
                 </TooltipTrigger>
               </Tooltip>
             </div>
           </div>
           <p className="text-gray-400 text-sm ml-8">Restringe o conhecimento do modelo a um conjunto específico de informações.</p>

           <div className="flex items-center gap-2">
             <Checkbox checked={detectorIdioma} onCheckedChange={setDetectorIdioma} />
             <div className="flex items-center gap-2">
               <label htmlFor="detectorIdioma" className="text-white">Detector de Idioma automático</label>
               <Tooltip>
                 <TooltipTrigger>
                   <InformationCircle className="w-4 h-4 text-gray-400 cursor-pointer" />
                   <TooltipContent className="bg-[#1E1E1E] border-[#333] text-white">
                     Detecta automaticamente o idioma do usuário e ajusta as respostas de acordo.
                   </TooltipContent>
                 </TooltipTrigger>
               </Tooltip>
             </div>
           </div>
           <p className="text-gray-400 text-sm ml-8">Detecta e responde em diferentes idiomas.</p>
         </CardContent>
       </Card>

       {/* Time Zone */}
       <Card className="bg-[#1E1E1E] border-[#333]">
         <CardContent className="p-6 space-y-4">
           <label htmlFor="timezone" className="text-white">Fuso horário</label>
           <Select value={selectedTimeZone} onValueChange={setSelectedTimeZone}>
             <SelectTrigger className="bg-[#121214] border-[#333] text-white">
               <SelectValue placeholder="Incluir e definir fuso horário" />
             </SelectTrigger>
             <SelectContent className="bg-[#1E1E1E] border-[#333] text-white">
               <SelectItem value="America/Sao_Paulo (GMT-3)">America/Sao_Paulo (GMT-3)</SelectItem>
               {/* Add more time zone options here */}
             </SelectContent>
           </Select>
         </CardContent>
       </Card>
     </div>
     </TooltipProvider>
   </div>
 )
}

