import type { N8NAgent, N8NWorkflow } from '@/types/n8n'

// Determine if we're running in a server or browser context
const isServer = typeof window === 'undefined'

// Definição da interface para custos da OpenAI
export interface OpenAICost {
  timestamp: string;
  model: string;
  tokens: number;
  cost: number;
}

class N8NService {
  // Get the base URL for API calls, automatically detecting client vs server context
  private getApiBaseUrl(): string {
    // Retornar uma string vazia para usar a API local do Next.js
    // com URLs relativas como /api/n8n/...
    return '';
  }

  async getWorkflows(): Promise<N8NWorkflow[]> {
    try {
      console.log("Buscando workflows via API do Next.js");
      const n8nApiUrl = process.env.NEXT_PUBLIC_N8N_API_URL;
      console.log("N8N API URL:", n8nApiUrl || "NÃO CONFIGURADO");
      
      // Constrói a URL relativa para a API do Next.js
      const url = `/api/n8n/workflows`;
      console.log("URL da requisição:", url);
      
      // Não precisamos adicionar headers pois a API do Next.js lida com isso
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.data) {
        console.error("Formato de dados inválido:", data);
        throw new Error("Formato de dados inválido recebido da API");
      }
      
      console.log(`Encontrados ${data.data.length} workflows`);
      return data.data;
    } catch (error) {
      console.error("Error fetching workflows:", error);
      throw error;
    }
  }

  async getWorkflowExecutions(workflowId: string): Promise<any[]> {
    try {
      console.log(`Buscando execuções para o workflow ${workflowId}`);
      
      // Aumentar significativamente o limite para obter todas as execuções possíveis
      // URL relativa para a API do Next.js
      const url = `/api/n8n/executions?workflowId=${workflowId}&limit=100`;
      console.log("URL da requisição:", url);
      
      // Não precisamos adicionar headers de autenticação pois a API do Next.js lida com isso
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.data) {
        console.error("Formato de dados inválido:", data);
        throw new Error("Formato de dados inválido recebido da API");
      }
      
      // Garantir que todos os itens têm timestamps válidos
      const validatedData = data.data.map((item: any) => {
        // Se não tiver startedAt definido, tentar usar outros campos de data ou um valor padrão
        if (!item.startedAt) {
          item.startedAt = item.stoppedAt || item.updatedAt || item.createdAt || new Date().toISOString();
        }
        return item;
      });
      
      console.log(`Encontradas ${validatedData.length} execuções para o workflow ${workflowId}`);
      return validatedData;
    } catch (error) {
      console.error(`Error fetching executions for workflow ${workflowId}:`, error);
      return [];
    }
  }

  // Método dedicado para contar execuções diárias precisamente
  async getWorkflowDailyExecutions(workflowId: string): Promise<number> {
    try {
      console.log(`Buscando contagem precisa de execuções diárias para ${workflowId}`);
      
      // Primeiro, tentar usar a API de contagem com filtro de data
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const countUrl = `/api/n8n/executions/count?workflowId=${workflowId}&date=${today}`;
      
      console.log(`Tentando API de contagem: ${countUrl}`);
      
      try {
        const countResponse = await fetch(countUrl, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (countResponse.ok) {
          const countData = await countResponse.json();
          if (countData && typeof countData.count === 'number') {
            console.log(`API de contagem retornou ${countData.count} execuções hoje para ${workflowId}`);
            return countData.count;
          }
        }
      } catch (countError) {
        console.error('Erro ao usar API de contagem:', countError);
        // Continuar para o método alternativo
      }
      
      console.log('API de contagem não disponível ou retornou erro, usando método alternativo');
      
      // Método alternativo: buscar execuções e filtrar
      const url = `/api/n8n/executions?workflowId=${workflowId}&limit=250`;
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        console.error(`Erro ao buscar execuções para contagem: ${response.status}`);
        return 0;
      }
      
      const data = await response.json();
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error("Formato de dados inválido na resposta");
        return 0;
      }
      
      // Filtrar para execuções de hoje
      const todayExecutions = data.data.filter((exec: any) => {
        if (!exec || !exec.startedAt) return false;
        const execDate = new Date(exec.startedAt).toISOString().split('T')[0];
        return execDate === today;
      });
      
      console.log(`Método alternativo: ${todayExecutions.length} execuções hoje para ${workflowId}`);
      return todayExecutions.length;
      
    } catch (error) {
      console.error(`Erro na contagem precisa:`, error);
      return 0;
    }
  }

  // Extrai dados de uso da OpenAI das execuções do n8n
  async extractOpenAICosts(executions: any[] = []): Promise<OpenAICost[]> {
    console.log(`Analisando ${executions.length} execuções para extrair custos da OpenAI`);
    
    if (!executions || executions.length === 0) {
      console.log('Nenhuma execução para analisar');
      return [];
    }

    const costs: OpenAICost[] = [];
    let openaiCounter = 0;

    // Para cada execução
    for (const execution of executions) {
      try {
        console.log(`\n----- Analisando execução ID: ${execution.id} -----`);
        
        // Verificar se temos data
        if (!execution.data) {
          console.log(`Execução ${execution.id} não possui campo 'data'`);
          continue;
        }

        // Verificar a estrutura da execução
        if (execution.data.resultData && execution.data.resultData.runData) {
          const runData = execution.data.resultData.runData;
          console.log(`Execução ${execution.id} possui runData com ${Object.keys(runData).length} nós`);
          
          // Itera sobre cada nó na execução
          for (const nodeName in runData) {
            if (!runData[nodeName] || !Array.isArray(runData[nodeName])) continue;
            
            console.log(`\nAnalisando nó '${nodeName}' que possui ${runData[nodeName].length} execuções de nó`);
            
            // Itera sobre cada execução do nó
            for (let i = 0; i < runData[nodeName].length; i++) {
              const nodeExecution = runData[nodeName][i];
              
              // Verifica se temos dados de resultado para o nó
              if (!nodeExecution.data || !nodeExecution.data.hasOwnProperty('json')) {
                console.log(`Execução ${i} do nó '${nodeName}' não tem dados JSON válidos`);
                continue;
              }
              
              // Processa o JSON para verificar se é uma chamada à OpenAI
              const jsonData = nodeExecution.data.json;
              
              // Logs para debugging
              console.log(`Analisando JSON do nó '${nodeName}', execução ${i}:`);
              console.log('Keys no JSON:', Object.keys(jsonData).join(', '));
              
              // Verifica se estamos lidando com uma resposta da API da OpenAI
              if (this.isOpenAIResponse(jsonData)) {
                openaiCounter++;
                console.log(`\n>>> Encontrada chamada OpenAI #${openaiCounter} no nó '${nodeName}', execução ${i}`);
                
                // Extrai informações do modelo e tokens
                const { model, tokens } = this.extractModelInfo(jsonData);
                if (!model || tokens === 0) {
                  console.log('Modelo ou tokens não encontrados, pulando...');
                  continue;
                }
                
                // Calcula o custo
                const cost = tokens * this.modelCostPerToken(model);
                
                // Extrai timestamp (ou usa o da execução se não disponível)
                const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
                
                // Adiciona aos custos
                costs.push({
                  timestamp,
                  model,
                  tokens,
                  cost
                });
                
                console.log(`Adicionado custo: ${model}, ${tokens} tokens, $${cost.toFixed(6)}`);
              } else {
                // Verificações mais profundas em campos específicos
                if (jsonData.request) {
                  console.log('Verificando campo request:', Object.keys(jsonData.request).join(', '));
                  if (this.isOpenAIResponse(jsonData.request)) {
                    openaiCounter++;
                    console.log(`\n>>> Encontrada chamada OpenAI #${openaiCounter} em 'request' do nó '${nodeName}', execução ${i}`);
                    const { model, tokens } = this.extractModelInfo(jsonData.request);
                    if (model && tokens > 0) {
                      const cost = tokens * this.modelCostPerToken(model);
                      const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
                      costs.push({ timestamp, model, tokens, cost });
                      console.log(`Adicionado custo: ${model}, ${tokens} tokens, $${cost.toFixed(6)}`);
                    }
                  }
                }
                
                if (jsonData.response) {
                  console.log('Verificando campo response:', Object.keys(jsonData.response || {}).join(', '));
                  if (this.isOpenAIResponse(jsonData.response)) {
                    openaiCounter++;
                    console.log(`\n>>> Encontrada chamada OpenAI #${openaiCounter} em 'response' do nó '${nodeName}', execução ${i}`);
                    const { model, tokens } = this.extractModelInfo(jsonData.response);
                    if (model && tokens > 0) {
                      const cost = tokens * this.modelCostPerToken(model);
                      const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
                      costs.push({ timestamp, model, tokens, cost });
                      console.log(`Adicionado custo: ${model}, ${tokens} tokens, $${cost.toFixed(6)}`);
                    }
                  }
                }
                
                // Verificar em campos de dados aninhados ou arrays
                if (jsonData.data && typeof jsonData.data === 'object') {
                  console.log('Verificando campo data');
                  if (Array.isArray(jsonData.data)) {
                    console.log(`data é um array com ${jsonData.data.length} itens`);
                    for (let j = 0; j < jsonData.data.length; j++) {
                      if (this.isOpenAIResponse(jsonData.data[j])) {
                        openaiCounter++;
                        console.log(`\n>>> Encontrada chamada OpenAI #${openaiCounter} em 'data[${j}]' do nó '${nodeName}', execução ${i}`);
                        const { model, tokens } = this.extractModelInfo(jsonData.data[j]);
                        if (model && tokens > 0) {
                          const cost = tokens * this.modelCostPerToken(model);
                          const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
                          costs.push({ timestamp, model, tokens, cost });
                          console.log(`Adicionado custo: ${model}, ${tokens} tokens, $${cost.toFixed(6)}`);
                        }
                      }
                    }
                  } else {
                    if (this.isOpenAIResponse(jsonData.data)) {
                      openaiCounter++;
                      console.log(`\n>>> Encontrada chamada OpenAI #${openaiCounter} em 'data' do nó '${nodeName}', execução ${i}`);
                      const { model, tokens } = this.extractModelInfo(jsonData.data);
                      if (model && tokens > 0) {
                        const cost = tokens * this.modelCostPerToken(model);
                        const timestamp = execution.startedAt || execution.stoppedAt || execution.createdAt || new Date().toISOString();
                        costs.push({ timestamp, model, tokens, cost });
                        console.log(`Adicionado custo: ${model}, ${tokens} tokens, $${cost.toFixed(6)}`);
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          console.log(`Execução ${execution.id} não possui estrutura de resultData.runData esperada`);
          console.log('Keys disponíveis na execução:', Object.keys(execution).join(', '));
          if (execution.data) {
            console.log('Keys disponíveis em execution.data:', Object.keys(execution.data).join(', '));
          }
        }
      } catch (error) {
        console.error(`Erro ao processar execução:`, error);
      }
    }

    console.log(`\n===== Resumo: Encontradas ${openaiCounter} chamadas OpenAI, extraídos ${costs.length} registros de custo =====`);
    return costs;
  }

  // Verifica se um objeto resposta é de uma chamada à OpenAI
  private isOpenAIResponse(json: any): boolean {
    if (!json) return false;
    
    // Log de debugging para ver o que estamos analisando
    const hasChoices = json.choices !== undefined;
    const hasUsage = json.usage !== undefined;
    const hasModel = json.model !== undefined;
    const hasEmbeddingData = json.data !== undefined && Array.isArray(json.data) && json.data.length > 0 && json.data[0].embedding !== undefined;
    const hasOpenAIUrl = json.url && typeof json.url === 'string' && json.url.includes('openai');
    const hasApiUrl = json.api_url && typeof json.api_url === 'string' && json.api_url.includes('openai');
    const hasOpenAIHeader = json.headers && 
                          (json.headers['authorization']?.toLowerCase().includes('openai') || 
                           json.headers['Authorization']?.toLowerCase().includes('openai'));
    
    // Verifica pelos padrões comuns nas respostas da OpenAI
    const isOpenAI = (
      // Para respostas de completions/chat
      hasChoices ||
      // Para embeddings
      hasEmbeddingData ||
      // Para usage explícito
      hasUsage ||
      // Outros indicadores de uso da OpenAI
      hasModel ||
      // Verifica URL em parâmetros de requisição
      hasOpenAIUrl ||
      hasApiUrl ||
      // Verifica headers que possam indicar uso da OpenAI
      hasOpenAIHeader
    );
    
    if (isOpenAI) {
      console.log('Detectada chamada OpenAI com os seguintes indicadores:', {
        hasChoices,
        hasEmbeddingData,
        hasUsage,
        hasModel,
        hasOpenAIUrl,
        hasApiUrl,
        hasOpenAIHeader
      });
    }
    
    return isOpenAI;
  }

  // Extrai informações do modelo e tokens da resposta
  private extractModelInfo(json: any): { model: string, tokens: number } {
    const result = { model: '', tokens: 0 };
    
    try {
      // Tenta extrair o modelo
      if (json.model) {
        result.model = json.model;
        console.log('Modelo encontrado diretamente:', result.model);
      } else if (json.request && json.request.model) {
        result.model = json.request.model;
        console.log('Modelo encontrado em request:', result.model);
      } else if (json.data && json.data.model) {
        result.model = json.data.model;
        console.log('Modelo encontrado em data:', result.model);
      } else if (json.body && typeof json.body === 'string' && json.body.includes('model')) {
        try {
          // Tenta extrair o modelo do corpo da requisição
          const bodyJson = JSON.parse(json.body);
          if (bodyJson.model) {
            result.model = bodyJson.model;
            console.log('Modelo encontrado no body JSON:', result.model);
          }
        } catch (e) {
          // Ignora erro de parsing
          console.log('Erro ao analisar body como JSON');
        }
      }
      
      // Tenta extrair tokens
      if (json.usage) {
        // Soma tokens de entrada e saída
        result.tokens = (json.usage.prompt_tokens || 0) + (json.usage.completion_tokens || 0);
        // Se não houver detalhamento, usa o total
        if (result.tokens === 0 && json.usage.total_tokens) {
          result.tokens = json.usage.total_tokens;
        }
        console.log('Tokens encontrados em usage:', result.tokens);
      } else if (json.data && json.data.usage) {
        result.tokens = (json.data.usage.prompt_tokens || 0) + (json.data.usage.completion_tokens || 0);
        if (result.tokens === 0 && json.data.usage.total_tokens) {
          result.tokens = json.data.usage.total_tokens;
        }
        console.log('Tokens encontrados em data.usage:', result.tokens);
      }
      
      // Se não encontrou o modelo, usa um valor padrão
      if (!result.model && result.tokens > 0) {
        result.model = 'gpt-3.5-turbo'; // Modelo padrão como fallback
        console.log('Usando modelo padrão:', result.model);
      } else if (!result.model && (json.choices || (json.data && Array.isArray(json.data) && json.data.length > 0))) {
        // Se tem choices ou data array, provavelmente é um modelo de texto
        result.model = 'gpt-3.5-turbo';
        
        // Estima tokens pelo tamanho do texto
        if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
          const content = json.choices[0].message.content;
          result.tokens = Math.ceil(content.length / 4); // Estimativa aproximada
          console.log('Tokens estimados do conteúdo:', result.tokens);
        }
      }
      
    } catch (error) {
      console.error('Error extracting model info:', error);
    }
    
    return result;
  }

  // Calcula o custo por token para um modelo específico
  private modelCostPerToken(model: string): number {
    // Normaliza o nome do modelo para comparação (remove versões específicas)
    const normalizedModel = model.toLowerCase()
      .replace(/^gpt-4-turbo.*/, 'gpt-4-turbo')
      .replace(/^gpt-4-[0-9]+-preview.*/, 'gpt-4-turbo')
      .replace(/^gpt-4-vision.*/, 'gpt-4-vision')
      .replace(/^gpt-4-[0-9]+k.*/, 'gpt-4')
      .replace(/^gpt-3.5-turbo-[0-9]+k.*/, 'gpt-3.5-turbo')
      .replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}.*/, ''); // Remove datas como -0613
    
    console.log(`Calculando custo para modelo: ${model} (normalizado para: ${normalizedModel})`);
    
    // Custos por 1000 tokens (dividimos por 1000 para obter custo por token)
    // Valores atualizados em maio de 2024 (preços podem mudar)
    switch (normalizedModel) {
      // GPT-4 Turbo
      case 'gpt-4-turbo':
        return 0.01 / 1000; // $0.01 por 1K tokens
      
      // GPT-4 Vision
      case 'gpt-4-vision':
        return 0.01 / 1000; // $0.01 por 1K tokens
        
      // GPT-4
      case 'gpt-4':
        return 0.03 / 1000; // $0.03 por 1K tokens
      
      // GPT-3.5 Turbo
      case 'gpt-3.5-turbo':
      case 'gpt-3.5-turbo-instruct':
        return 0.0015 / 1000; // $0.0015 por 1K tokens
        
      // Text Embedding Models
      case 'text-embedding-ada-002':
      case 'text-embedding-3-small':
        return 0.0001 / 1000; // $0.0001 por 1K tokens
      
      // Text Embedding Large
      case 'text-embedding-3-large':
        return 0.00013 / 1000; // $0.00013 por 1K tokens
        
      // DALL-E Models
      case 'dall-e-2':
      case 'dall-e-3':
        return 0.02; // Aproximação, já que DALL-E é por imagem e não por token
      
      // Whisper (transcrição)
      case 'whisper-1':
        return 0.006 / 60; // $0.006 por minuto (aproximação)
        
      // Fallback para outros modelos
      default:
        console.log(`Modelo desconhecido: ${model}, usando custo padrão de GPT-3.5 Turbo`);
        return 0.0015 / 1000; // Usa GPT-3.5 como fallback
    }
  }

  /**
   * Gets workflows that have the "agent" tag
   * @returns Promise with an array of agent workflows
   */
  async getAgentWorkflows(): Promise<N8NWorkflow[]> {
    try {
      const workflows = await this.getWorkflows()
      console.log('Searching for agent workflows...')

      // Filtrar workflows com as tags necessárias
      const agentWorkflows = workflows.filter(workflow => {
        // Garantir que workflow.tags é um array
        if (!workflow.tags || !Array.isArray(workflow.tags)) {
          console.log(`Workflow ${workflow.id} não tem tags ou tags não são um array`)
          return false
        }
        
        // Verificar se alguma tag corresponde a "agent" (case insensitive)
        const hasAgentTag = workflow.tags.some((tag: any) => {
          // Se a tag é uma string
          if (typeof tag === 'string') {
            return tag.toLowerCase() === 'agent'
          }
          // Se a tag é um objeto com propriedade name
          else if (tag && typeof tag === 'object' && 'name' in tag) {
            const tagName = (tag as any).name
            return typeof tagName === 'string' && tagName.toLowerCase() === 'agent'
          }
          return false
        })

        return hasAgentTag
      })
    
    console.log(`Found ${agentWorkflows.length} workflows with "agent" tag`)
    return agentWorkflows
    } catch (error) {
      console.error('Error fetching agent workflows:', error)
      return []
    }
  }

  async getAgentStatus(workflows: N8NWorkflow[]): Promise<N8NAgent[]> {
    console.log('Processing workflows for agent status...')
    const agents: N8NAgent[] = []

    for (const workflow of workflows) {
      console.log(`Processing workflow: ${workflow.name}`)
      console.log('Workflow tags:', workflow.tags)

      try {
        // Buscar execuções com mais detalhes
        const executions = await this.getWorkflowExecutions(workflow.id)
        console.log(`Fetched ${executions.length} executions for workflow ${workflow.name}`)
        
        // Garantir que temos objetos de execução válidos
        const validExecutions = executions.filter(exec => 
          exec && typeof exec === 'object' && exec.startedAt
        )
        
        // Ordenar execuções da mais recente para a mais antiga
        const sortedExecutions = validExecutions.sort((a, b) => {
          const dateA = new Date(a.startedAt).getTime()
          const dateB = new Date(b.startedAt).getTime()
          return dateB - dateA // ordem decrescente (mais recente primeiro)
        })
        
        const lastExecution = sortedExecutions.length > 0 ? sortedExecutions[0] : null
        console.log(`Last execution for ${workflow.name}:`, lastExecution ? 
          new Date(lastExecution.startedAt).toISOString() : 'None')
        
        // Usar o método específico para contar execuções diárias
        // Este método faz uma busca dedicada e mais abrangente
        console.log(`Buscando contagem precisa de execuções diárias para ${workflow.name}...`)
        const executionsToday = await this.getWorkflowDailyExecutions(workflow.id)
        console.log(`Contagem final: ${executionsToday} execuções hoje para ${workflow.name}`)
        
        // Extrair informações de custos da OpenAI
        const openAICosts = await this.extractOpenAICosts(sortedExecutions)

        // Procura por uma tag que começa com "type:"
        const typeTag = workflow.tags.find(tag => typeof tag === 'string' && tag.startsWith('type:'))
        const type = typeTag ? typeTag.replace('type:', '') : 'ai'

        // Criar o objeto do agente com as informações processadas
        const agent: N8NAgent = {
          id: workflow.id,
          name: workflow.name,
          status: workflow.active ? 'online' : 'offline',
          type,
          lastUpdate: new Date(workflow.updatedAt),
          workflowId: workflow.id,
          executionCount: sortedExecutions.length,
          executions: sortedExecutions,
          executionsToday: executionsToday,
          lastExecution: lastExecution ? new Date(lastExecution.startedAt) : undefined,
          averageExecutionTime: this.calculateAverageExecutionTime(sortedExecutions),
          // Adiciona informações de custo da OpenAI
          openAI: {
            totalCost: openAICosts.reduce((acc, cost) => acc + cost.cost, 0),
            totalTokens: openAICosts.reduce((acc, cost) => acc + cost.tokens, 0),
            modelUsage: openAICosts.reduce((acc, cost) => {
              if (!acc[cost.model]) {
                acc[cost.model] = {
                  cost: 0,
                  tokens: 0,
                  calls: 0
                };
              }
              acc[cost.model].cost += cost.cost;
              acc[cost.model].tokens += cost.tokens;
              acc[cost.model].calls += 1;
              return acc;
            }, {} as Record<string, { cost: number; tokens: number; calls: number }>)
          }
        }

        console.log(`Created agent object for ${workflow.name}`)
        agents.push(agent)
      } catch (error) {
        console.error(`Error processing workflow ${workflow.name}:`, error)
        // Criar um objeto de agente mesmo com erro, para mostrar o status
        const agent: N8NAgent = {
          id: workflow.id,
          name: workflow.name,
          status: 'error',
          type: 'unknown',
          lastUpdate: new Date(workflow.updatedAt),
          workflowId: workflow.id,
          executionCount: 0,
          executionsToday: 0
        }
        agents.push(agent)
      }
    }

    console.log(`Processed ${agents.length} agents`)
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

  // Obtém informações de uso de um workflow específico, incluindo custos da OpenAI
  async getWorkflowUsage(workflowId: string): Promise<any> {
    try {
      console.log(`Obtendo informações de uso para workflow: ${workflowId}`);
      
      // Buscar execuções do workflow
      const executions = await this.getWorkflowExecutions(workflowId);
      console.log(`Encontradas ${executions.length} execuções para análise`);
      
      // Extrair informações de custos da OpenAI
      const openAICosts = await this.extractOpenAICosts(executions)
      console.log(`Extraídos ${openAICosts.length} registros de custos da OpenAI`);

      // Procura por uma tag que começa com "type:"
      const workflowInfo = await this.getWorkflow(workflowId);
      const typeTag = workflowInfo.tags?.find((tag: string) => tag.toLowerCase().startsWith('type:'));
      const type = typeTag ? typeTag.split(':')[1]?.trim() : 'unknown';
      
      // Processa os dados de custo para agrupar por modelo
      const modelUsage: Record<string, { cost: number; tokens: number; calls: number }> = {};
      
      // Agrupa os custos por modelo
      openAICosts.forEach(cost => {
        if (!modelUsage[cost.model]) {
          modelUsage[cost.model] = {
            cost: 0,
            tokens: 0,
            calls: 0
          };
        }
        
        modelUsage[cost.model].cost += cost.cost;
        modelUsage[cost.model].tokens += cost.tokens;
        modelUsage[cost.model].calls += 1;
      });
      
      // Calcula totais
      const totalCost = openAICosts.reduce((acc, cost) => acc + cost.cost, 0);
      const totalTokens = openAICosts.reduce((acc, cost) => acc + cost.tokens, 0);
      
      // Formata os custos para exibição
      Object.keys(modelUsage).forEach(model => {
        modelUsage[model].cost = parseFloat(modelUsage[model].cost.toFixed(6));
      });

      return {
        workflowId,
        name: workflowInfo.name,
        type,
        executionCount: executions.length,
        // Adiciona informações de custo da OpenAI
        openAI: {
          totalCost: parseFloat(totalCost.toFixed(6)),
          totalTokens,
          modelUsage,
          // Retorna os dados detalhados de custo para análise temporal
          details: openAICosts.map(cost => ({
            ...cost,
            cost: parseFloat(cost.cost.toFixed(6))
          }))
        }
      };
    } catch (error) {
      console.error('Error getting workflow usage:', error);
      return {
        workflowId,
        name: 'Unknown',
        type: 'unknown',
        executionCount: 0,
        openAI: {
          totalCost: 0,
          totalTokens: 0,
          modelUsage: {},
          details: []
        }
      };
    }
  }

  // Obtém informações de um workflow específico
  async getWorkflow(workflowId: string): Promise<any> {
    try {
      console.log(`Buscando detalhes do workflow ${workflowId}`);
      
      // URL relativa para a API do Next.js
      const url = `/api/n8n/workflow/${workflowId}`;
      console.log("URL da requisição:", url);
      
      // Não precisamos adicionar headers de autenticação pois a API do Next.js lida com isso
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      // Se a API retornar 404, pode ser que a API ainda não esteja implementada
      if (response.status === 404) {
        console.warn(`API para buscar workflow específico não implementada. Usando dados de workflows gerais.`);
        
        // Buscar todos os workflows e filtrar o que precisamos
        const workflows = await this.getWorkflows();
        const workflow = workflows.find(w => w.id === workflowId);
        
        if (!workflow) {
          throw new Error(`Workflow com ID ${workflowId} não encontrado`);
        }
        
        return workflow;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        console.error("Formato de dados inválido:", data);
        throw new Error("Formato de dados inválido recebido da API");
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Extrai dados de uso da OpenAI das execuções do N8N e salva no Supabase
   * @param workflowId Optional workflow ID to process. If not provided, all workflows will be processed.
   * @param supabaseClient Optional Supabase client. If not provided, no data will be saved to Supabase.
   * @returns Statistics about the execution and processed data
   */
  async extractAndSaveOpenAIUsage(workflowId?: string, supabaseClient?: any): Promise<any> {
    try {
      console.log(`Iniciando extração de dados de uso da OpenAI ${workflowId ? `para workflow ${workflowId}` : 'para todos workflows'}`);
      
      // Estatísticas
      const stats = {
        workflows_processed: 0,
        executions_processed: 0,
        total_records: 0,
        total_tokens: 0,
        total_cost: 0
      };
      
      // 1. Buscar workflows (todos ou um específico)
      const workflows = workflowId 
        ? [await this.getWorkflow(workflowId)]
        : await this.getWorkflows();
      
      console.log(`Processando ${workflows.length} workflows`);
      
      // 2. Filtrar workflows relevantes (com tags de IA/OpenAI)
      const relevantWorkflows = workflows.filter(wf => {
        // Verificar se as tags são um array
        const tags = Array.isArray(wf.tags) 
          ? wf.tags.map((tag: any) => {
              if (typeof tag === 'string') return tag.toLowerCase();
              if (tag && typeof tag === 'object' && tag.name) return tag.name.toLowerCase();
              return '';
            })
          : [];
        
        // Incluir workflows com tags relacionadas a IA ou sem filtragem se for um workflow específico
        return workflowId ? true : tags.some(tag => 
          ['agent', 'openai', 'llm', 'ai', 'chatbot', 'gpt'].includes(tag)
        );
      });
      
      console.log(`Encontrados ${relevantWorkflows.length} workflows relevantes`);
      stats.workflows_processed = relevantWorkflows.length;
      
      // 3. Para cada workflow, buscar execuções e extrair dados
      for (const workflow of relevantWorkflows) {
        try {
          console.log(`Processando workflow: ${workflow.name} (${workflow.id})`);
          
          // Buscar execuções (limitar a 100 para evitar sobrecarga)
          const executions = await this.getWorkflowExecutions(workflow.id);
          console.log(`Encontradas ${executions.length} execuções para o workflow ${workflow.name}`);
          
          stats.executions_processed += executions.length;
          
          // Extrair custos da OpenAI
          const costs = await this.extractOpenAICosts(executions);
          console.log(`Extraídos ${costs.length} registros de custos para o workflow ${workflow.name}`);
          
          // Atualizar estatísticas
          stats.total_records += costs.length;
          stats.total_tokens += costs.reduce((sum, cost) => sum + cost.tokens, 0);
          stats.total_cost += costs.reduce((sum, cost) => sum + cost.cost, 0);
          
          // Salvar no Supabase se o cliente foi fornecido
          if (supabaseClient && costs.length > 0) {
            console.log(`Salvando ${costs.length} registros no Supabase para o workflow ${workflow.name}`);
            
            for (const cost of costs) {
              try {
                // Preparar registro para inserção no Supabase
                const record = {
                  timestamp: cost.timestamp,
                  workflow_id: workflow.id,
                  workflow_name: workflow.name,
                  Model: cost.model,
                  endpoint: 'chat',
                  prompt_tokens: Math.floor(cost.tokens * 0.7),
                  completion_tokens: Math.floor(cost.tokens * 0.3),
                  total_tokens: cost.tokens,
                  estimated_cost: cost.cost,
                  tags: workflow.tags || [],
                  request_id: `extract_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  metadata: {
                    source: 'n8n_extract',
                    extracted_at: new Date().toISOString(),
                    workflow_active: workflow.active
                  },
                  user_id: null
                };
                
                // Inserir no Supabase
                const { error } = await supabaseClient
                  .from('openai_usage')
                  .insert(record);
                  
                if (error) {
                  console.error(`Erro ao inserir registro no Supabase: ${error.message}`);
                }
              } catch (insertError) {
                console.error('Erro ao inserir registro:', insertError);
              }
            }
          }
        } catch (workflowError) {
          console.error(`Erro ao processar workflow ${workflow.name}:`, workflowError);
        }
      }
      
      console.log('Extração de dados de uso concluída');
      console.log('Estatísticas:', stats);
      
      return {
        success: true,
        message: 'Dados de uso extraídos com sucesso',
        stats
      };
    } catch (error) {
      console.error('Erro ao extrair dados de uso:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stats: {
          workflows_processed: 0,
          executions_processed: 0,
          total_records: 0
        }
      };
    }
  }
}

export const n8nService = new N8NService() 