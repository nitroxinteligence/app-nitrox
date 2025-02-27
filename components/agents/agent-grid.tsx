"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Clock, Hash, AlertCircle, DollarSign, Zap } from 'lucide-react'
import type { N8NAgent } from '@/types/n8n'
import { n8nService } from '@/lib/n8n-service'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function formatAgentName(name: string): string {
  // Remove emojis e caracteres especiais
  const cleanName = name.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[🤖]/gu, '').trim()

  // Remove caracteres extras e espaços múltiplos
  const normalizedName = cleanName
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .trim()

  // Extrai o nome base do agente
  const baseName = normalizedName.split('-')[0].trim()
  
  // Extrai qualquer identificador adicional
  const identifier = normalizedName.includes('-') ? 
    normalizedName.split('-')[1].trim() : ''

  // Formata o nome final
  if (identifier) {
    if (identifier.toLowerCase().includes('ia') || identifier.toLowerCase().includes('ai')) {
      return `Agente IA - ${baseName}`
    }
    return `Agente ${identifier} - ${baseName}`
  }
  
  return `Agente IA - ${baseName}`
}

// Função para formatar valores monetários
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Função para formatar número de tokens
function formatTokens(tokens: number): string {
  return new Intl.NumberFormat('pt-BR').format(tokens);
}

function AgentCard({ agent }: { agent: N8NAgent }) {
  const statusColors = {
    online: 'bg-[#58E877]',
    offline: 'bg-red-500',
    error: 'bg-orange-500'
  }

  const formatLastExecution = (date: Date | undefined) => {
    if (!date) return 'Nunca executado'
    return `Há ${formatDistanceToNow(date, { locale: ptBR, addSuffix: false })}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-[#121214]/80 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">{formatAgentName(agent.name)}</h3>
            <div className={cn(
              "h-2 w-2 rounded-full",
              statusColors[agent.status]
            )} />
          </div>
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-[#58E877]" />
              <span className="text-[#E8F3ED]/60">Status:</span>
              <span className="font-medium text-white capitalize">{agent.status}</span>
            </div>
            {agent.executionCount !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-[#58E877]" />
                <span className="text-[#E8F3ED]/60">Execuções:</span>
                <span className="font-medium text-white">{agent.executionCount}</span>
              </div>
            )}
            {agent.lastExecution && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-[#58E877]" />
                <span className="text-[#E8F3ED]/60">Última execução:</span>
                <span className="font-medium text-white">
                  {formatLastExecution(agent.lastExecution)}
                </span>
              </div>
            )}
            {agent.openAI && agent.openAI.totalCost > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-[#58E877]" />
                  <span className="text-[#E8F3ED]/60">Custo OpenAI:</span>
                  <span className="font-medium text-white">
                    {formatCurrency(agent.openAI.totalCost)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-[#58E877]" />
                  <span className="text-[#E8F3ED]/60">Tokens:</span>
                  <span className="font-medium text-white">
                    {formatTokens(agent.openAI.totalTokens)}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function AgentGrid() {
  const [agents, setAgents] = useState<N8NAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching workflows...')
      const workflows = await n8nService.getWorkflows()
      console.log('Workflows received:', workflows)
      
      console.log('Getting agent status...')
      const agentsData = await n8nService.getAgentStatus(workflows)
      console.log('Agents data:', agentsData)
      
      setAgents(agentsData)
    } catch (error) {
      console.error('Error fetching agents:', error)
      setError('Erro ao carregar os agentes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchAgents, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-[#121214]/80 border-white/10 animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 w-1/2 bg-[#272727] rounded mb-4" />
              <div className="space-y-3">
                <div className="h-3 w-3/4 bg-[#272727] rounded" />
                <div className="h-3 w-2/3 bg-[#272727] rounded" />
                <div className="h-3 w-1/2 bg-[#272727] rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-[#121214]/80 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (agents.length === 0) {
    return (
      <Card className="bg-[#121214]/80 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-[#E8F3ED]/60">
            <AlertCircle className="h-5 w-5" />
            <span>Nenhum agente encontrado. Verifique se seus workflows estão marcados com a tag "agent".</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
} 