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

// Função para formatar a data da última execução
function formatLastExecution(date: Date | undefined) {
  if (!date) return 'Nunca executado';
  
  // Verificar se a data é inválida (como 1970-01-01, que indica timestamp 0 ou erro)
  // ou é uma data muito antiga (usada como valor padrão em algumas implementações)
  if (date.getFullYear() < 2020) {
    return 'Data indisponível';
  }
  
  // Usar o formatDistanceToNow para formatar a data relativa
  try {
    return `Há ${formatDistanceToNow(date, { locale: ptBR, addSuffix: false })}`;
  } catch (error) {
    console.error("Erro ao formatar data:", error, date);
    return 'Data indisponível';
  }
}

function AgentCard({ agent }: { agent: N8NAgent }) {
  const statusColors = {
    online: 'bg-[#58E877]',
    offline: 'bg-red-500',
    error: 'bg-orange-500'
  }

  // Verificar se o número de execuções hoje está definido
  const executionsToday = agent.executionsToday !== undefined 
    ? agent.executionsToday 
    : 0;

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
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-[#58E877]" />
              <span className="text-[#E8F3ED]/60">Última execução:</span>
              <span className="font-medium text-white">
                {formatLastExecution(agent.lastExecution)}
              </span>
            </div>
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
      
      console.log('Iniciando busca de agentes...')
      
      // Get workflows with agent tags specifically
      console.log('Buscando workflows com tag "agent"...')
      const agentWorkflows = await n8nService.getAgentWorkflows()
      
      if (!agentWorkflows || !agentWorkflows.length) {
        console.warn('⚠️ Nenhum workflow com tag "agent" encontrado!')
        setLoading(false)
        setError('Nenhum agente encontrado. Verifique se seus workflows estão marcados com a tag "agent".')
        return
      }
      
      console.log(`Recebidos ${agentWorkflows.length} workflows com tag "agent"`)
      
      // Obter o status e as execuções dos agentes
      console.log('Obtendo status dos agentes...')
      const agentsData = await n8nService.getAgentStatus(agentWorkflows)
      
      if (!agentsData || !agentsData.length) {
        console.warn('⚠️ Nenhum agente processado!')
        setLoading(false)
        setError('Erro ao processar agentes. Verifique o console para mais detalhes.')
        return
      }
      
      console.log(`Processados ${agentsData.length} agentes com sucesso`)
      
      // Verificar novamente se algum workflow perdeu a tag "agent" após a atualização
      // Isso garante que o card Monitoramento em Tempo Real seja atualizado dinamicamente
      const updatedAgentWorkflows = await n8nService.getAgentWorkflows()
      const updatedWorkflowIds = new Set(updatedAgentWorkflows.map(wf => wf.id))
      
      // Filtrar apenas os agentes que ainda possuem a tag "agent"
      const filteredAgents = agentsData.filter(agent => updatedWorkflowIds.has(agent.id))
      
      if (filteredAgents.length < agentsData.length) {
        console.log(`Removidos ${agentsData.length - filteredAgents.length} agentes que não possuem mais a tag "agent"`)
      }
      
      // Atualizar o estado com os agentes processados e filtrados
      setAgents(filteredAgents)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao buscar agentes:', error)
      setError('Erro ao carregar os agentes. Verifique o console para mais detalhes.')
      setLoading(false)
    }
  }

  // Efeito para buscar dados quando o componente montar
  useEffect(() => {
    console.log('Buscando dados de agentes...')
    fetchAgents()
    
    // Atualizar a cada 1 minuto para garantir dados recentes
    const interval = setInterval(() => {
      console.log('Atualizando dados dos agentes automaticamente...')
      fetchAgents()
    }, 60000) // A cada 1 minuto
    
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