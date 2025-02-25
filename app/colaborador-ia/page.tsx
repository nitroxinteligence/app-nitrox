'use client'

import { motion } from 'framer-motion'
import { Plus, UserCheck, DollarSign, HeadphonesIcon, WrenchIcon, TrendingUp, Phone, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { keyframes } from '@emotion/react'
import { TopNav } from '@/components/navigation/top-nav'
import { TopNavColaborador } from '@/components/navigation/top-nav-colaborador'
import { useRouter } from 'next/navigation'

const pulseKeyframe = keyframes`
0%, 100% { opacity: 0.15; }
50% { opacity: 0.3; }
`

// Custom card component to match the design
function CustomCard({ 
icon: Icon,
title,
benefits,
href 
}: {
  // Add Icon type here
  icon: any
  title: string
  benefits: string[]
  href: string
}) {
const router = useRouter()
return (

  <Link href={href} className="w-full">
    <motion.div 
      className="group relative w-full"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top light effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] overflow-hidden">
        {/* Base line */}
        <div className="absolute top-0 w-full h-[1px] bg-[#58E877] opacity-80" />
        
        {/* Primary glow */}
        <div className="absolute top-0 w-full h-[100px] bg-gradient-radial from-[#58E877] to-transparent opacity-20 blur-[30px]" />
        
        {/* Secondary glow with pulsing animation */}
        <div className="absolute top-0 w-[60%] left-1/2 -translate-x-1/2 h-[50px] bg-gradient-radial from-[#58E877] to-transparent opacity-15 blur-[15px] animate-pulse" />
      </div>

      {/* Card container */}
      <div 
        className="relative rounded-[24px] p-8 overflow-hidden transition-all duration-300
          border border-[#40403E]
          bg-gradient-to-b from-[#0A0A0B] to-black
          shadow-[0_0_40px_-15px_rgba(0,0,0,0.3),inset_0_0_60px_-15px_rgba(88,232,119,0.15)]"
        onClick={() => router.push('/form-colaborador')}
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#58E877]/10 flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#58E877" />
                <stop offset="100%" stopColor="#E8F3ED" />
              </linearGradient>
            </defs>
            <Icon className="w-6 h-6" stroke="url(#iconGradient)" />
          </svg>
        </div>

        {/* Content */}
        <h3 className="text-2xl font-bold text-white group-hover:bg-gradient-to-r group-hover:from-[#58E877] group-hover:to-[#E8F3ED] group-hover:bg-clip-text group-hover:text-transparent mb-4">
          {title}
        </h3>

        {/* Benefits */}
        <div className="space-y-2">
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-[#E8F3ED]/60">
                <div className="w-1.5 h-1.5 rounded-full bg-[#58E877]" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-[#58E877]/5 to-transparent" />
        </div>
      </div>
    </motion.div>
  </Link>
)
}

export default function ColaboradorIAPage() {
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
      <TopNavColaborador />
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
        <div className="space-y-4 text-center mb-12">
          <motion.h1 
            variants={itemVariants}
            className="text-4xl font-regular bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent"
          >
            Função do seu Colaborador IA
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="text-xl text-[#E8F3ED]/60"
          >
            Escolha o tipo de função ideal para o seu Colaborador
          </motion.p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div variants={itemVariants}>
            <CustomCard
              icon={UserCheck}
              title="Colaborador SDR"
              benefits={[
                "Qualificação de leads",
                "Identificação de cliente ideal",
                "Agendamento de reuniões, visitas, consultas",
                "Nutrição de leads",
                "Realiza lembretes e follow-ups"
              ]}
              href="/colaborador-IA/sdr"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <CustomCard
              icon={DollarSign}
              title="Colaborador SDR com Vendas"
              benefits={[
                "Qualificação + Vendas diretas",
                "Negociação e fechamento",
                "Processamento de pagamentos",
                "Acompanhamento pós-venda",
                "Realiza lembretes e follow-ups"
              ]}
              href="/colaborador-IA/sdr-vendas"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <CustomCard
              icon={HeadphonesIcon}
              title="Colaborador para Atendimento"
              benefits={[
                "Suporte ao cliente",
                "Dúvidas frequentes",
                "Direcionamento para setores",
                "Triagem de solicitações"
              ]}
              href="/colaborador-IA/atendimento"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <CustomCard
              icon={WrenchIcon}
              title="Colaborador para Suporte"
              benefits={[
                "Troubleshooting básico",
                "Documentação técnica",
                "Escalação inteligente",
                "Resolução de problemas"
              ]}
              href="/colaborador-IA/suporte-tecnico"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CustomCard
              icon={TrendingUp}
              title="Colaborador para Tráfego Pago"
              benefits={[
                "Gerenciamento de campanhas",
                "Otimização de orçamento",
                "Análise de resultados",
                "Relatórios de performance"
              ]}
              href="/colaborador-IA/trafego-pago"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
              <CustomCard
                icon={Phone}
                title="Colaborador para Ligações"
                benefits={[
                  "Discagem automática",
                  "Gravação de chamadas",
                  "Integração com CRM",
                  "Análise de sentimentos"
                ]}
                href="/colaborador-IA/ligacoes"
              />
            </motion.div>
          <motion.div variants={itemVariants}>
            <CustomCard
              icon={BookOpen}
              title="Colaborador para Artigos Blog"
              benefits={[
                "Geração de Artigos com SEO otimizado",
                "Pesquisa de palavras-chave",
                "Análise de concorrência",
                "Melhora no rankeamento"
              ]}
              href="/colaborador-IA/artigos-blog"
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  </div>
)


}

