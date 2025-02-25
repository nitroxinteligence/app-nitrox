import type { N8NAgent, N8NWorkflow } from '@/types/n8n'

class N8NService {
  async getWorkflows(): Promise<N8NWorkflow[]> {
    try {
      console.log('Fetching workflows from API...')
      const response = await fetch('/api/n8n/workflows')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseData = await response.json()
      console.log('Raw API response:', responseData)

      if (!responseData.data || !Array.isArray(responseData.data)) {
        throw new Error('Invalid data format received')
      }

      const workflows = responseData.data.map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        tags: Array.isArray(workflow.tags) 
          ? workflow.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name || '')
          : [],
      }))

      // Filtra apenas workflows com a tag "agent"
      const agentWorkflows = workflows.filter(workflow => workflow.tags.includes('agent'))
      console.log('Filtered agent workflows:', agentWorkflows)
      
      return agentWorkflows
    } catch (error) {
      console.error('Error fetching workflows:', error)
      return []
    }
  }

  async getWorkflowExecutions(workflowId: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/n8n/executions?workflowId=${workflowId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error(`Error fetching executions for workflow ${workflowId}:`, error)
      return []
    }
  }

  async getAgentStatus(workflows: N8NWorkflow[]): Promise<N8NAgent[]> {
    console.log('Processing workflows for agent status...')
    const agents: N8NAgent[] = []

    for (const workflow of workflows) {
      console.log(`Processing workflow: ${workflow.name}`)
      console.log('Workflow tags:', workflow.tags)

      const executions = await this.getWorkflowExecutions(workflow.id)
      const lastExecution = executions[0]

      // Procura por uma tag que começa com "type:"
      const typeTag = workflow.tags.find(tag => typeof tag === 'string' && tag.startsWith('type:'))
      const type = typeTag ? typeTag.replace('type:', '') : 'ai'

      const agent: N8NAgent = {
        id: workflow.id,
        name: workflow.name,
        status: workflow.active ? 'online' : 'offline',
        type,
        lastUpdate: new Date(workflow.updatedAt),
        workflowId: workflow.id,
        executionCount: executions.length,
        lastExecution: lastExecution ? new Date(lastExecution.startedAt) : undefined,
        averageExecutionTime: this.calculateAverageExecutionTime(executions),
      }

      console.log('Created agent object:', agent)
      agents.push(agent)
    }

    console.log('Final agents list:', agents)
    return agents
  }

  private calculateAverageExecutionTime(executions: any[]): number {
    if (!executions.length) return 0

    const times = executions.map(execution => {
      const start = new Date(execution.startedAt).getTime()
      const end = new Date(execution.stoppedAt).getTime()
      return end - start
    })

    return times.reduce((acc, time) => acc + time, 0) / times.length
  }
}

export const n8nService = new N8NService() 