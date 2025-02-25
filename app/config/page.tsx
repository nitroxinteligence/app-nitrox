'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Zap, Settings2 } from 'lucide-react'
import Link from 'next/link'

export default function ConfigPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B]">
      {/* Gradient Orbs */}
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-[#58E877] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-[20%] -z-10 h-[600px] w-[600px] rounded-full bg-[#FFFBA1] opacity-10 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-12"
        >
          {/* Header */}
          <div className="space-y-4">
            <motion.h1 
              variants={itemVariants}
              className="text-4xl font-bold bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent"
            >
              Configuração do seu Colaborador IA
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              className="text-xl text-[#E8F3ED]/60"
            >
              Escolha a opção que melhor atende suas necessidades.
            </motion.p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Setup Card */}
            <motion.div variants={itemVariants}>
              <Link href="/config/quick">
                <Card className="h-full bg-black/40 border-white/[0.05] backdrop-blur-xl hover:border-[#58E877]/20 transition-all duration-300 cursor-pointer group">
                  <CardHeader className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-[#58E877]/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#58E877]" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white group-hover:text-[#58E877] transition-colors">
                      Configuração Rápida com Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-2 text-[#E8F3ED]/60">
                      <Clock className="w-4 h-4" />
                      <span>Tempo estimado: 5-10 minutos</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[#E8F3ED]/60 font-medium">Ideal para quem:</p>
                      <ul className="space-y-2 text-[#E8F3ED]/60">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                          Precisa de um agente funcionando rapidamente
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                          Quer usar configurações pré-testadas
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                          Prefere um processo mais simples
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Custom Setup Card */}
            <motion.div variants={itemVariants}>
              <Link href="/config/custom">
                <Card className="h-full bg-black/40 border-white/[0.05] backdrop-blur-xl hover:border-[#58E877]/20 transition-all duration-300 cursor-pointer group">
                  <CardHeader className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-[#58E877]/10 flex items-center justify-center">
                      <Settings2 className="w-6 h-6 text-[#58E877]" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white group-hover:text-[#58E877] transition-colors">
                      Configuração Personalizada Completa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-2 text-[#E8F3ED]/60">
                      <Clock className="w-4 h-4" />
                      <span>Tempo estimado: 20-30 minutos</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[#E8F3ED]/60 font-medium">Ideal para quem:</p>
                      <ul className="space-y-2 text-[#E8F3ED]/60">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                          Quer um agente totalmente personalizado
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                          Tem necessidades específicas
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                          Precisa de maior controle sobre todo o agente
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

