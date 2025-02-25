export type AgentStatus = 'online' | 'offline' | 'error'

export interface N8NAgent {
  id: string
  name: string
  status: AgentStatus
  type: string
  lastUpdate: Date
  workflowId?: string
  executionCount?: number
  lastExecution?: Date
  averageExecutionTime?: number
}

export interface N8NWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  tags: string[]
} 