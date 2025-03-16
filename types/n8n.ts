export type AgentStatus = 'online' | 'offline' | 'error'

export interface OpenAIModelUsage {
  cost: number
  tokens: number
  calls: number
}

export interface OpenAICost {
  totalCost: number
  totalTokens: number
  modelUsage: Record<string, OpenAIModelUsage>
}

export interface N8NWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  tags: string[]
  description?: string
  lastExecuted?: string
  activeStatus?: boolean
}

export interface N8NAgent {
  id: string
  name: string
  status: AgentStatus
  type: string
  lastUpdate: Date
  workflowId?: string
  executionCount?: number
  executions?: any[] // Execuções brutas do workflow
  executionsToday?: number // Número de execuções do dia atual
  lastExecution?: Date
  averageExecutionTime?: number
  openAI?: OpenAICost
} 