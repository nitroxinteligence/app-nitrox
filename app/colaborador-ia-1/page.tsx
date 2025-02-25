'use client'

import { motion } from 'framer-motion'
import { Clock, Zap, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { keyframes } from '@emotion/react'
import { TopNav } from '@/components/navigation/top-nav'

const pulseKeyframe = keyframes`
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.3; }
`

// Custom card component to match the design
function CustomCard({ 
  icon: Icon,
  title,
  description,
  estimatedTime,
  benefits,
  href,
  isHidden = false
}: {
  icon: any
  title: string
  description: string
  estimatedTime: string
  benefits: string[]
  href: string
  isHidden?: boolean
}) {
  return (
    <Link href={href}>
      <motion.div
        className={`group relative w-full ${isHidden ? 'hidden' : ''}`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] overflow-hidden">
          <div className="absolute top-0 w-full h-[1px] bg-[#58E877] opacity-80" />
          <div className="absolute top-0 w-full h-[100px] bg-gradient-radial from-[#58E877] to-transparent opacity-20 blur-[30px]" />
          <div className="absolute top-0 w-[60%] left-1/2 -translate-x-1/2 h-[50px] bg-gradient-radial from-[#58E877] to-transparent opacity-15 blur-[15px] animate-pulse" />
        </div>

        <div className="relative rounded-[24px] p-8 overflow-hidden transition-all duration-300
          border border-[#40403E]
          bg-gradient-to-b from-[#0A0A0B] to-black
          shadow-[0_0_40px_-15px_rgba(0,0,0,0.3),inset_0_0_60px_-15px_rgba(88,232,119,0.15)]
          hover:border-[#58E877]"
        >
          <motion.div 
            className="w-12 h-12 rounded-xl bg-[#58E877]/10 flex items-center justify-center mb-6"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            <Icon className="w-6 h-6 text-[#58E877]" />
          </motion.div>

          <div className="relative mb-4">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#58E877] to-[#E8F3ED] bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {title}
            </h3>
            <span className="text-2xl font-bold text-white absolute inset-0 group-hover:opacity-0 transition-opacity duration-300">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[#E8F3ED]/60 mb-6">
            <Clock className="w-4 h-4" />
            <span>Tempo estimado: {estimatedTime}</span>
          </div>

          <div className="space-y-2">
            <p className="text-[#E8F3ED]/60 font-medium">Ideal para quem:</p>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-[#E8F3ED]/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-[#58E877]/5 to-transparent" />
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export default function ColaboradorConfigPage() {
  const globalStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.3; }
  }
`

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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] flex flex-col items-center justify-center pt-14">
      <div className="fixed top-0 left-0 right-0 z-50">
        <TopNav />
      </div>
      <style jsx global>{globalStyles}</style>
      {/* Gradient Orbs */}
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-[#58E877] opacity-20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-[20%] -z-10 h-[600px] w-[600px] rounded-full bg-[#FFFBA1] opacity-10 blur-[120px]" />

      <div className="w-full max-w-[1200px] px-4 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-12"
        >
          {/* Header */}
          <div className="space-y-4 text-center">
            <motion.h1 
              variants={itemVariants}
              className="text-4xl font-regular bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent"
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
          <div className="grid grid-cols-1 gap-8 place-items-center">
            <motion.div variants={itemVariants}>
              <CustomCard
                icon={Zap}
                title="Configuração Rápida com Template"
                description="Configure seu agente rapidamente usando templates pré-definidos"
                estimatedTime="5-10 minutos"
                benefits={[
                  "Precisa de um agente funcionando rapidamente",
                  "Quer usar configurações pré-testadas",
                  "Prefere um processo mais simples"
                ]}
                href="/colaborador-IA"
                isHidden={true}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <CustomCard
                icon={Settings2}
                title="Configuração Personalizada Completa"
                description="Configure seu agente com total controle sobre todas as opções"
                estimatedTime="20-30 minutos"
                benefits={[
                  "Quer um agente totalmente personalizado",
                  "Tem necessidades específicas",
                  "Precisa de maior controle sobre todo o agente"
                ]}
                href="/colaborador-IA"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

