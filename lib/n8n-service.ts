import type { N8NAgent, N8NWorkflow } from '@/types/n8n'
import { createClient } from '@supabase/supabase-js'

// Determine if we're running in a server or browser context
const isServer = typeof window === 'undefined'

// Definição da interface para custos da OpenAI
export interface OpenAICost {
  timestamp: string;
  model: string;
  tokens: number;
  promptTokens?: number;
  completionTokens?: number;
  cost: number;
  workflowId?: string;
  workflowName?: string;
  nodeId?: string;
  nodeName?: string;
  executionId?: string;
}

class N8NService {
  /**
   * Get the N8N API URL
   * @returns {string}
   */
  getN8NApiUrl(): string {
    // Check if we're in a browser (client-side) or server-side
    const isBrowser = typeof window !== 'undefined';
    const apiUrl = process.env.NEXT_PUBLIC_N8N_API_URL;
    
    console.log(`N8N API URL: ${apiUrl || 'NÃO DEFINIDO'}`);
    return apiUrl || '';
  }
  
  /**
   * Get the N8N API Key
   * @returns {string}
   */
  getN8NApiKey(): string {
    const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;
    console.log(`N8N API Key: ${apiKey ? 'CONFIGURADO (não exibido por segurança)' : 'NÃO DEFINIDO'}`);
    return apiKey || '';
  }

  /**
   * Obtém a lista de workflows do N8N
   * @returns {Promise<N8NWorkflow[]>}
   */
  async getWorkflows(): Promise<N8NWorkflow[]> {
    try {
      console.log('Buscando todos os workflows do N8N...');
      
      // Verificar se temos as configurações necessárias
      const baseUrl = this.getN8NApiUrl();
      const apiKey = this.getN8NApiKey();
      
      if (!baseUrl || !apiKey) {
        console.error('N8N API URL ou API Key não configurados:', {
          baseUrl: baseUrl ? 'Configurado' : 'Não configurado',
          apiKey: apiKey ? 'Configurado' : 'Não configurado'
        });
        return [];
      }
      
      console.log(`Fazendo requisição GET para ${baseUrl}/workflows`);
      
      const response = await fetch(`${baseUrl}/workflows`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        const statusText = response.statusText || 'Erro desconhecido';
        console.error(`Erro ao buscar workflows: ${response.status} - ${statusText}`);
        try {
          const errorData = await response.text();
          console.error('Detalhes do erro:', errorData);
        } catch (e) {
          console.error('Não foi possível ler o corpo da resposta de erro');
        }
        return [];
      }
      
      const responseData = await response.json();
      
      // Verificar se a resposta tem o formato esperado (com propriedade 'data')
      if (!responseData) {
        console.error('Resposta vazia da API N8N');
        return [];
      }
      
      // Verificar se a resposta tem o formato { data: [...] }
      const workflows = responseData.data || responseData;
      
      if (!Array.isArray(workflows)) {
        console.error('Resposta não contém um array de workflows:', responseData);
        return [];
      }
      
      console.log(`Obtidos ${workflows.length} workflows`);
      
      return workflows as N8NWorkflow[];
    } catch (error) {
      console.error('Erro ao buscar workflows:', error);
      return [];
    }
  }

  async getWorkflowExecutions(workflowId: string): Promise<any[]> {
    try {
      console.log(`Buscando execuções para o workflow ${workflowId}`);
      
      // Verificar se temos as configurações necessárias
      const baseUrl = this.getN8NApiUrl();
      const apiKey = this.getN8NApiKey();
      
      if (!baseUrl || !apiKey) {
        console.error('N8N API URL ou API Key não configurados:', {
          baseUrl: baseUrl ? 'Configurado' : 'Não configurado',
          apiKey: apiKey ? 'Configurado' : 'Não configurado'
        });
        return [];
      }
      
      // URL da API do N8N para buscar execuções de um workflow específico
      const apiUrl = `${baseUrl}/executions?workflowId=${workflowId}&limit=20&includeData=true`;
      console.log(`Fazendo requisição GET para ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': apiKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const statusText = response.statusText || 'Erro desconhecido';
        console.error(`Erro ao buscar execuções: ${response.status} - ${statusText}`);
        try {
          const errorData = await response.text();
          console.error('Detalhes do erro:', errorData);
        } catch (e) {
          console.error('Não foi possível ler o corpo da resposta de erro');
        }
        return [];
      }
      
      const responseData = await response.json();
      
      // Verificar se a resposta tem o formato esperado
      if (!responseData) {
        console.error("Resposta vazia da API N8N");
        return [];
      }
      
      // Verificar se a resposta tem o formato { data: [...] }
      const executions = responseData.data || responseData;
      
      if (!Array.isArray(executions)) {
        console.error("Formato de dados inválido:", responseData);
        return [];
      }
      
      console.log(`Encontradas ${executions.length} execuções para o workflow ${workflowId}`);
      return executions;
    } catch (error) {
      console.error(`Error fetching executions for workflow ${workflowId}:`, error);
      return [];
    }
  }

  // Extrai dados de uso da OpenAI das execuções do n8n
  async extractOpenAICosts(executions: any[] = []): Promise<OpenAICost[]> {
    const costs: OpenAICost[] = [];

    console.log(`===== Iniciando extração de custos OpenAI - ${executions.length} execuções =====`);
    
    if (executions.length === 0) {
      console.log('Nenhuma execução para processar');
      return costs;
    }
    
    // Log da primeira execução para debug
    if (executions[0]) {
      console.log('Exemplo de estrutura da primeira execução:');
      console.log('ID:', executions[0].id);
      console.log('Workflow ID:', executions[0].workflowId);
      console.log('Workflow Name:', executions[0].workflowName);
      console.log('Tem data?', !!executions[0].data);
      console.log('Tem resultData?', executions[0].data && !!executions[0].data.resultData);
      console.log('Tem runData?', executions[0].data && executions[0].data.resultData && !!executions[0].data.resultData.runData);
      
      // Verificar se temos dados de execução
      if (!executions[0].data || !executions[0].data.resultData || !executions[0].data.resultData.runData) {
        console.log('ALERTA: A primeira execução não possui dados de resultados completos.');
        
        // Verificar se temos o parâmetro includeData
        if (!executions[0].data) {
          console.log('ALERTA: Parâmetro includeData pode não estar sendo passado corretamente na chamada da API.');
        }
      } else {
        // Listar os nós disponíveis na primeira execução
        const runData = executions[0].data.resultData.runData;
        const nodeNames = Object.keys(runData);
        console.log(`Nós disponíveis na primeira execução: ${nodeNames.join(', ')}`);
        
        // Verificar se há nós que parecem ser da OpenAI
        const potentialAINodes = nodeNames.filter(name => this.isLikelyOpenAINode(name));
        if (potentialAINodes.length > 0) {
          console.log(`Nós potencialmente relacionados à OpenAI: ${potentialAINodes.join(', ')}`);
          
          // Adicionar mais detalhes sobre os nós potenciais da OpenAI
          for (const nodeName of potentialAINodes) {
            console.log(`\nDetalhes do nó potencial OpenAI: ${nodeName}`);
            const nodeData = runData[nodeName];
            if (nodeData && Array.isArray(nodeData) && nodeData.length > 0) {
              console.log(`- Número de execuções do nó: ${nodeData.length}`);
              console.log(`- Tem data? ${!!nodeData[0].data}`);
              
              // Tentar encontrar dados OpenAI
              const openAIData = this.findOpenAIData(nodeData[0], 0);
              if (openAIData) {
                console.log('- Dados OpenAI encontrados neste nó!');
                console.log('- Amostra dos dados:', JSON.stringify(openAIData).substring(0, 300) + '...');
              } else {
                console.log('- Nenhum dado OpenAI encontrado neste nó');
                console.log('- Estrutura completa do nó:', JSON.stringify(nodeData[0]).substring(0, 500) + '...');
              }
            }
          }
        } else {
          console.log('Nenhum nó parece estar relacionado à OpenAI');
        }
      }
    }
    
    for (const execution of executions) {
      try {
        const executionId = execution.id;
        const workflowId = execution.workflowId;
        const workflowName = execution.workflowName || 'Unknown Workflow';
        const timestamp = execution.startedAt || execution.stoppedAt || new Date().toISOString();
        
        console.log(`----- Analisando execução ID: ${executionId} (${workflowName}) -----`);
        
        // Verificar se temos dados de execução
        if (!execution.data || !execution.data.resultData || !execution.data.resultData.runData) {
          console.log(`Execução ${executionId} não possui dados de resultados.`);
          continue;
        }

        const runData = execution.data.resultData.runData;
        const nodeNames = Object.keys(runData);
        
        console.log(`Execução ${executionId} possui runData com ${nodeNames.length} nós`);
        
        // Para cada nó no workflow
        for (const nodeName of nodeNames) {
          try {
            // Verificar se o nó parece ser relacionado à OpenAI
            const isLikelyAINode = this.isLikelyOpenAINode(nodeName);
            const nodeData = runData[nodeName];
            
            // Se não tivermos dados ou não for um array, pular
            if (!nodeData || !Array.isArray(nodeData)) {
              continue;
            }
            
            console.log(`Analisando nó '${nodeName}' que possui ${nodeData.length} execuções de nó${isLikelyAINode ? ' (potencial nó OpenAI)' : ''}`);
            
            // Para cada execução deste nó
            for (const nodeExecution of nodeData) {
              try {
                // Verificar se temos dados de saída para analisar
                if (!nodeExecution.data) {
                  continue;
                }
                
                // MELHORIA: Verificar diretamente no objeto nodeExecution
                const directJsonData = this.findOpenAIData(nodeExecution, 0);
                if (directJsonData) {
                  console.log(`>>> Dados OpenAI encontrados diretamente no nó '${nodeName}'`);
                  
                  try {
                    // Extrair informações do modelo
                    const modelInfo = this.extractDetailedModelInfo(directJsonData);
                    const normalizedModel = this.normalizeModelName(modelInfo.model);
                    const cost = this.calculateDetailedCost(normalizedModel, modelInfo.promptTokens, modelInfo.completionTokens);
                    
                    // Criar registro de custo
                    const costRecord: OpenAICost = {
                      timestamp,
                      model: normalizedModel,
                      tokens: modelInfo.totalTokens,
                      promptTokens: modelInfo.promptTokens,
                      completionTokens: modelInfo.completionTokens,
                      cost,
                      workflowId,
                      workflowName,
                      nodeId: nodeExecution.node,
                      nodeName,
                      executionId
                    };
                    
                    costs.push(costRecord);
                    console.log(`✅ Custo extraído: ${normalizedModel}, ${modelInfo.totalTokens} tokens, $${cost.toFixed(6)}`);
                    continue; // Pular para a próxima execução de nó
                  } catch (directError) {
                    console.error(`Erro ao processar dados diretos: ${directError}`);
                  }
                }
                
                // Se não encontramos dados diretamente, verificar em main
                if (!nodeExecution.data.main) {
                  continue;
                }
                
                // Processar cada saída do nó (geralmente temos apenas um item em main[0])
                const outputs = nodeExecution.data.main;
                
                // MELHORIA 1: Procurar em todas as saídas, não apenas a primeira
                for (let outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
                  const outputItems = outputs[outputIndex];
                  
                  if (!outputItems || !Array.isArray(outputItems)) {
                    continue;
                  }
                  
                  // Para cada item de saída nesta ramificação
                  for (let itemIndex = 0; itemIndex < outputItems.length; itemIndex++) {
                    const item = outputItems[itemIndex];
                    
                    // MELHORIA 2: Verificar múltiplos caminhos onde os dados OpenAI podem estar
                    const jsonData = this.findOpenAIData(item, 0);
                    
                    if (jsonData) {
                      console.log(`>>> Dados OpenAI encontrados no nó '${nodeName}', saída ${outputIndex}, item ${itemIndex}`);
                      
                      let model = '';
                      let tokens = 0;
                      let promptTokens = 0;
                      let completionTokens = 0;
                      
                      // MELHORIA 3: Extrair detalhes do modelo de várias maneiras possíveis
                      try {
                        // Verificar formato detalhado primeiro
                        if (this.isOpenAIResponse(jsonData)) {
                          const modelInfo = this.extractDetailedModelInfo(jsonData);
                          model = modelInfo.model;
                          tokens = modelInfo.totalTokens;
                          promptTokens = modelInfo.promptTokens;
                          completionTokens = modelInfo.completionTokens;
                          
                          console.log(`Formato detalhado encontrado: ${model}, ${tokens} tokens (${promptTokens}+${completionTokens})`);
                        } 
                        // MELHORIA 4: Tentar formatos alternativos para o modelo e uso de tokens
                        else if (jsonData.model && (jsonData.usage || jsonData.token_usage)) {
                          const usage = jsonData.usage || jsonData.token_usage || {};
                          model = jsonData.model;
                          tokens = usage.total_tokens || 0;
                          promptTokens = usage.prompt_tokens || 0;
                          completionTokens = usage.completion_tokens || 0;
                          
                          console.log(`Formato alternativo encontrado: ${model}, ${tokens} tokens`);
                        }
                        // MELHORIA 5: Procurar padrões específicos do N8N LangChain
                        else if (jsonData.llmOutput || jsonData.tokenUsage || jsonData.metadata?.tokenUsage) {
                          const tokenData = jsonData.tokenUsage || jsonData.metadata?.tokenUsage || jsonData.llmOutput?.tokenUsage || {};
                          
                          if (tokenData) {
                            // Tentar encontrar o nome do modelo
                            model = jsonData.model || jsonData._modelName || jsonData.metadata?.model || 'unknown';
                            // Obter contagens de tokens
                            promptTokens = tokenData.promptTokens || tokenData.prompt_tokens || 0;
                            completionTokens = tokenData.completionTokens || tokenData.completion_tokens || 0;
                            tokens = tokenData.totalTokens || tokenData.total_tokens || (promptTokens + completionTokens);
                            
                            console.log(`Formato LangChain encontrado: ${model}, ${tokens} tokens`);
                          }
                        }
                        // MELHORIA 6: Verificar formato mais simples
                        else if (jsonData.token_count || jsonData.totalTokens || jsonData.total_tokens) {
                          tokens = jsonData.token_count || jsonData.totalTokens || jsonData.total_tokens || 0;
                          model = jsonData.model_name || jsonData.model || 'unknown';
                          
                          // Muitas integrações não dividem tokens entre prompt/completion
                          promptTokens = jsonData.prompt_tokens || Math.round(tokens * 0.7);
                          completionTokens = jsonData.completion_tokens || (tokens - promptTokens);
                          
                          console.log(`Formato simples encontrado: ${model}, ${tokens} tokens`);
                        }
                        // MELHORIA 7: Última tentativa para nós de serviços personalizados
                        else if (nodeName.toLowerCase().includes('openai') || nodeName.toLowerCase().includes('gpt')) {
                          // Para nós identificados por nome mas sem informações claras
                          // Fazer suposição com base no tipo de nó
                          model = jsonData.model || 'gpt-3.5-turbo';
                          
                          // Estimar tokens com base no tamanho da resposta
                          let inputText = '';
                          let outputText = '';
                          
                          if (typeof jsonData.input === 'string') inputText = jsonData.input;
                          else if (typeof jsonData.prompt === 'string') inputText = jsonData.prompt;
                          else if (typeof jsonData.messages === 'object') {
                            inputText = JSON.stringify(jsonData.messages);
                          }
                          
                          if (typeof jsonData.output === 'string') outputText = jsonData.output;
                          else if (typeof jsonData.content === 'string') outputText = jsonData.content;
                          else if (typeof jsonData.text === 'string') outputText = jsonData.text;
                          else if (typeof jsonData.response === 'string') outputText = jsonData.response;
                          
                          // Estimativa de tokens (aproximado)
                          promptTokens = Math.round(inputText.length / 4) || 0;
                          completionTokens = Math.round(outputText.length / 4) || 0;
                          tokens = promptTokens + completionTokens;
                          
                          console.log(`Usando estimativa de tokens: ${tokens} tokens (${promptTokens}+${completionTokens})`);
                        }
                        else {
                          console.log('Dados incompletos, não foi possível extrair informações de uso');
                          continue;
                        }
                        
                        // Calcular custo com base no modelo e tokens
                        const normalizedModel = this.normalizeModelName(model);
                        const cost = this.calculateDetailedCost(normalizedModel, promptTokens, completionTokens);
                        
                        // Criar registro de custo
                        const costRecord: OpenAICost = {
                          timestamp,
                          model: normalizedModel,
                          tokens,
                          promptTokens,
                          completionTokens,
                          cost,
                          workflowId,
                          workflowName,
                          nodeId: nodeExecution.node,
                          nodeName,
                          executionId
                        };
                        
                        costs.push(costRecord);
                        console.log(`✅ Custo extraído: ${normalizedModel}, ${tokens} tokens, $${cost.toFixed(6)}`);
                      } catch (detailError) {
                        console.error(`Erro ao extrair detalhes do modelo: ${detailError}`);
                      }
                    }
                  }
                }
              } catch (nodeExecutionError) {
                console.error(`Erro ao processar execução do nó ${nodeName}: ${nodeExecutionError}`);
              }
            }
          } catch (nodeError) {
            console.error(`Erro ao processar nó ${nodeName}: ${nodeError}`);
          }
        }
      } catch (executionError) {
        console.error(`Erro ao processar execução ${execution.id}: ${executionError}`);
      }
    }
    
    console.log(`===== Resumo: Encontradas ${costs.length} chamadas OpenAI, extraídos ${costs.length} registros de custo =====`);
    
    return costs;
  }
  
  // Melhore a detecção de nós relacionados ao OpenAI
  private isLikelyOpenAINode(nodeName: string): boolean {
    const lowerName = nodeName.toLowerCase();
    
    // Lista expandida de termos relacionados à OpenAI e LLMs
    const openaiTerms = [
      'openai', 'gpt', 'davinci', 'llm', 'chatgpt', 'completion', 
      'embedding', 'ai agent', 'language model', 'text classifier', 
      'chat model', 'ai model', 'chat completion', 'text completion',
      // Adicionar modelos específicos
      'gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5', 'gpt-3.5-turbo', 
      'gpt-vision', 'vision', 'dall-e', 'dall-e-3', 'dall-e-2',
      'whisper', 'audio', 'ada', 'babbage', 'curie', 'text-embedding',
      'codex', 'claude', 'anthropic', 'mistral', 'gemini', 'llama',
      // Termos genéricos adicionais para capturar mais nós
      'image', 'generate image', 'text to image', 'speech to text',
      'text to speech', 'assistant', 'summarize', 'summarization',
      'translation', 'classification', 'sentiment', 'analyze',
      // Termos específicos do N8N
      'chat', 'model', 'ai', 'ia', 'intelligence', 'artificial', 'language',
      'token', 'prompt', 'completion', 'response', 'message', 'conversation',
      'text', 'content', 'generate', 'generation', 'answer', 'question',
      'chat memory', 'memory', 'context', 'history', 'conversation'
    ];
    
    return openaiTerms.some(term => lowerName.includes(term));
  }
  
  // Melhorar a função de busca para encontrar dados de OpenAI
  private findOpenAIData(obj: any, depth: number = 0): any {
    // Limite de profundidade para evitar loops infinitos ou busca muito profunda
    if (depth > 10) return null;
    
    // Se for null ou indefinido, encerrar
    if (obj === null || obj === undefined) return null;
    
    // Se for string, número ou booleano, não é um objeto OpenAI
    if (typeof obj !== 'object') return null;
    
    // MELHORIA ADICIONAL: Verificar se é uma resposta direta da OpenAI
    if (obj.model && obj.usage && typeof obj.usage === 'object') {
      console.log('Encontrado objeto OpenAI direto:', JSON.stringify(obj).substring(0, 200) + '...');
      return obj;
    }
    
    // Se for um array, verificar cada item
    if (Array.isArray(obj)) {
      // Para cada item do array
      for (let i = 0; i < obj.length; i++) {
        const result = this.findOpenAIData(obj[i], depth + 1);
        if (result) return result;
      }
      return null;
    }
    
    // MELHORIA 1: Verificar padrões de resposta OpenAI diretamente
    if (this.isOpenAIResponse(obj)) {
      console.log('Encontrado objeto OpenAI via isOpenAIResponse:', JSON.stringify(obj).substring(0, 200) + '...');
      return obj;
    }
    
    // MELHORIA 2: Verificar padrões LangChain ou outros formatos comuns
    if (
      (obj.tokenUsage || obj.llmOutput?.tokenUsage || obj.metadata?.tokenUsage) &&
      (obj.model || obj._modelName || obj.metadata?.model)
    ) {
      console.log('Encontrado objeto OpenAI via LangChain:', JSON.stringify(obj).substring(0, 200) + '...');
      return obj;
    }
    
    // MELHORIA 3: Verificar se há campos relacionados a tokens ou modelos
    if (
      (obj.token_count !== undefined || 
       obj.totalTokens !== undefined || 
       obj.total_tokens !== undefined) &&
      (obj.model !== undefined || obj.model_name !== undefined)
    ) {
      console.log('Encontrado objeto OpenAI via tokens/model:', JSON.stringify(obj).substring(0, 200) + '...');
      return obj;
    }
    
    // MELHORIA 4: Verificar AI21, Anthropic, Claude, ou outros formatos semelhantes
    if (
      obj.usage && 
      (obj.model || obj.model_id || obj.model_name) && 
      (obj.completion_id || obj.request_id)
    ) {
      console.log('Encontrado objeto OpenAI via AI21/Anthropic:', JSON.stringify(obj).substring(0, 200) + '...');
      return obj;
    }
    
    // MELHORIA ADICIONAL: Verificar se há campos específicos do N8N LangChain
    if (obj.node && obj.node.includes('openai') && obj.data && typeof obj.data === 'object') {
      console.log('Encontrado nó OpenAI no N8N:', JSON.stringify(obj).substring(0, 200) + '...');
      return obj.data;
    }
    
    // MELHORIA 5: Buscar em campos específicos que podem conter resposta da OpenAI
    const likelyFields = [
      'json', 'data', 'result', 'output', 'response', 'openai', 
      'aiResponse', 'completion', 'message', 'chatCompletion',
      'llmResult', 'llmOutput', 'metadata', 'nodeData', 'ai',
      'content', 'choices', 'parameters', 'request', 'body'
    ];
    
    for (const field of likelyFields) {
      if (obj[field] && typeof obj[field] === 'object') {
        const result = this.findOpenAIData(obj[field], depth + 1);
        if (result) return result;
      }
    }
    
    // MELHORIA 6: Verificar outros campos do objeto
    for (const key in obj) {
      // Pular campos já verificados
      if (likelyFields.includes(key)) continue;
      
      // Verificar se o valor é um objeto
      if (obj[key] && typeof obj[key] === 'object') {
        const result = this.findOpenAIData(obj[key], depth + 1);
        if (result) return result;
      }
    }
    
    return null;
  }
  
  // Melhorar a detecção de resposta da OpenAI
  private isOpenAIResponse(json: any): boolean {
    // Verificar se o objeto é válido
    if (!json || typeof json !== 'object') {
      return false;
    }
    
    // Log para debug
    console.log('Verificando se é resposta OpenAI:', JSON.stringify(json).substring(0, 300) + '...');
    
    // Padrão 1: Resposta de Completions API ou Chat Completions API
    if (
      (json.model || json.model_name) && 
      (
        (json.usage && (
          json.usage.total_tokens !== undefined || 
          (json.usage.prompt_tokens !== undefined && json.usage.completion_tokens !== undefined)
        )) ||
        (json.token_usage && (
          json.token_usage.total_tokens !== undefined ||
          (json.token_usage.prompt_tokens !== undefined && json.token_usage.completion_tokens !== undefined)
        ))
      )
    ) {
      console.log('✅ Detectado padrão 1: Resposta padrão da OpenAI API');
      return true;
    }
    
    // Padrão 2: Resposta LangChain
    if (
      (
        (json.tokenUsage && (json.tokenUsage.totalTokens || json.tokenUsage.total_tokens)) ||
        (json.llmOutput && json.llmOutput.tokenUsage) ||
        (json.metadata && json.metadata.tokenUsage)
      ) &&
      (json.model || json._modelName || json.metadata?.model)
    ) {
      console.log('✅ Detectado padrão 2: Resposta LangChain');
      return true;
    }
    
    // Padrão 3: Resposta personalizada com informações de token
    if (
      (
        json.token_count !== undefined || 
        json.totalTokens !== undefined || 
        json.total_tokens !== undefined
      ) &&
      (
        json.model !== undefined || 
        json.model_name !== undefined
      )
    ) {
      console.log('✅ Detectado padrão 3: Resposta personalizada com tokens');
      return true;
    }
    
    // Padrão 4: Resposta do N8N LangChain
    if (
      json.message &&
      json.message.content &&
      json.modelId &&
      (json.modelId.includes('gpt') || json.modelId.includes('openai'))
    ) {
      console.log('✅ Detectado padrão 4: Resposta N8N LangChain');
      return true;
    }
    
    // Padrão 5: Verificar se há choices com mensagens (formato típico de Chat Completions)
    if (
      json.choices && 
      Array.isArray(json.choices) && 
      json.choices.length > 0 &&
      (
        json.choices[0].message || 
        json.choices[0].text || 
        json.choices[0].content
      )
    ) {
      console.log('✅ Detectado padrão 5: Resposta com choices e mensagens');
      return true;
    }
    
    // Padrão 6: Verificar se há campos específicos de modelos OpenAI
    if (
      json.id && 
      (
        json.id.startsWith('chatcmpl-') || 
        json.id.startsWith('cmpl-') || 
        json.id.startsWith('conv-')
      ) &&
      (
        json.model || 
        json.object === 'chat.completion' || 
        json.object === 'text_completion'
      )
    ) {
      console.log('✅ Detectado padrão 6: Resposta com ID de completion OpenAI');
      return true;
    }
    
    // Padrão 7: Verificar se há campos específicos de embeddings
    if (
      json.model && 
      json.model.includes('embedding') && 
      json.data && 
      Array.isArray(json.data) && 
      json.data.length > 0 && 
      json.data[0].embedding
    ) {
      console.log('✅ Detectado padrão 7: Resposta de embeddings');
      return true;
    }
    
    // Padrão 8: Verificar se há campos específicos de modelos de imagem
    if (
      json.model && 
      (
        json.model.includes('dall-e') || 
        json.model.includes('image')
      ) && 
      json.data && 
      Array.isArray(json.data) && 
      json.data.length > 0 && 
      json.data[0].url
    ) {
      console.log('✅ Detectado padrão 8: Resposta de geração de imagem');
      return true;
    }
    
    // Padrão 9: Verificar se há campos específicos de modelos de áudio
    if (
      json.model && 
      (
        json.model.includes('whisper') || 
        json.model.includes('audio')
      ) && 
      json.text
    ) {
      console.log('✅ Detectado padrão 9: Resposta de transcrição de áudio');
      return true;
    }
    
    // Padrão 10: Verificar se há campos que indicam uso de tokens sem modelo específico
    if (
      (
        json.prompt_tokens !== undefined || 
        json.completion_tokens !== undefined || 
        json.input_tokens !== undefined || 
        json.output_tokens !== undefined
      ) &&
      (
        json.finish_reason !== undefined || 
        json.stop_reason !== undefined
      )
    ) {
      console.log('✅ Detectado padrão 10: Resposta com contagem de tokens sem modelo específico');
      return true;
    }
    
    console.log('❌ Não é uma resposta OpenAI reconhecida');
    return false;
  }
  
  // Extrai informações detalhadas de modelo e tokens
  private extractDetailedModelInfo(json: any): { 
    model: string, 
    promptTokens: number, 
    completionTokens: number, 
    totalTokens: number 
  } {
    let model = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    
    try {
      // Primeiro, tentar encontrar o modelo
      if (json.model) {
        model = json.model;
      } else if (json.data && json.data.model) {
        model = json.data.model;
      } else if (json.response && json.response.model) {
        model = json.response.model;
      } else if (json.request && json.request.model) {
        model = json.request.model;
      }
      
      // Normalizar nome do modelo para formatos conhecidos
      model = this.normalizeModelName(model);
      
      // Agora, tentar encontrar informações de tokens
      if (json.usage) {
        promptTokens = json.usage.prompt_tokens || 0;
        completionTokens = json.usage.completion_tokens || 0;
        totalTokens = json.usage.total_tokens || 0;
      } else if (json.data && json.data.usage) {
        promptTokens = json.data.usage.prompt_tokens || 0;
        completionTokens = json.data.usage.completion_tokens || 0;
        totalTokens = json.data.usage.total_tokens || 0;
      } else if (json.response && json.response.usage) {
        promptTokens = json.response.usage.prompt_tokens || 0;
        completionTokens = json.response.usage.completion_tokens || 0;
        totalTokens = json.response.usage.total_tokens || 0;
      }
      
      // Se temos modelo mas não temos totalTokens, tentar recuperar de outros lugares
      if (model && totalTokens === 0) {
        if (json.tokens) {
          totalTokens = json.tokens;
        } else if (json.token_count) {
          totalTokens = json.token_count;
        }
      }
      
      // Se temos totalTokens mas não temos prompt/completion tokens, fazer uma estimativa
      if (totalTokens > 0 && promptTokens === 0 && completionTokens === 0) {
        // Estimativa aproximada: 70% prompt, 30% completion
        promptTokens = Math.round(totalTokens * 0.7);
        completionTokens = totalTokens - promptTokens;
      }
      
      // Se ainda não temos totalTokens mas temos os componentes
      if (totalTokens === 0 && (promptTokens > 0 || completionTokens > 0)) {
        totalTokens = promptTokens + completionTokens;
      }
      
    } catch (error) {
      console.error('Erro ao extrair informações do modelo:', error);
    }
    
    return { model, promptTokens, completionTokens, totalTokens };
  }
  
  // Melhorar o mapeamento de modelos para garantir consistência
  private normalizeModelName(model: string): string {
    // Converter para minúsculas para facilitar a comparação
    const lowerModel = model.toLowerCase().trim();
    
    // Mapeamento de variações de nomes de modelos para nomes padronizados
    const modelMap: { [key: string]: string } = {
      // GPT-4
      'gpt4': 'gpt-4',
      'gpt-4-0613': 'gpt-4',
      'gpt-4-0125': 'gpt-4',
      'gpt-4-1106-preview': 'gpt-4-turbo',
      'gpt-4-0314': 'gpt-4',
      'gpt-4-32k': 'gpt-4-32k',
      'gpt-4-32k-0613': 'gpt-4-32k',
      'gpt-4-turbo-preview': 'gpt-4-turbo',
      'gpt-4-turbo-2024-04-09': 'gpt-4-turbo',
      
      // GPT-4o
      'gpt4o': 'gpt-4o',
      'gpt-4o-2024-05-13': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o-mini-2024-07-18': 'gpt-4o-mini',
      
      // Vision models
      'gpt-4-vision': 'gpt-4-vision',
      'gpt-4-vision-preview': 'gpt-4-vision',
      'gpt-4-1106-vision-preview': 'gpt-4-vision',
      'gpt-4-turbo-vision': 'gpt-4-vision',
      'gpt-4o-vision': 'gpt-4o',  // GPT-4o inclui capacidades visuais
      
      // GPT-3.5
      'gpt3': 'gpt-3.5-turbo',
      'gpt3.5': 'gpt-3.5-turbo',
      'gpt-3': 'gpt-3.5-turbo',
      'gpt-35-turbo': 'gpt-3.5-turbo',
      'gpt-3.5-turbo-0301': 'gpt-3.5-turbo',
      'gpt-3.5-turbo-0613': 'gpt-3.5-turbo',
      'gpt-3.5-turbo-1106': 'gpt-3.5-turbo',
      'gpt-3.5-turbo-0125': 'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k': 'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-16k-0613': 'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-instruct': 'gpt-3.5-turbo-instruct',
      
      // DALL-E models
      'dall-e': 'dall-e-3',
      'dall-e-2': 'dall-e-2',
      'dall-e-3': 'dall-e-3',
      
      // Whisper models
      'whisper': 'whisper-1',
      'whisper-1': 'whisper-1',
      
      // Text embedding models
      'text-embedding': 'text-embedding-ada-002',
      'text-embedding-ada': 'text-embedding-ada-002',
      'text-embedding-ada-002': 'text-embedding-ada-002',
      'text-embedding-3-small': 'text-embedding-3-small',
      'text-embedding-3-large': 'text-embedding-3-large',
      
      // Moderation models
      'text-moderation': 'text-moderation-latest',
      'text-moderation-latest': 'text-moderation-latest',
      'text-moderation-stable': 'text-moderation-stable',
      
      // Legacy models
      'text-davinci-003': 'text-davinci-003',
      'text-davinci-002': 'text-davinci-002',
      'text-davinci-001': 'text-davinci-001',
      'text-curie-001': 'text-curie-001',
      'text-babbage-001': 'text-babbage-001',
      'text-ada-001': 'text-ada-001',
      'davinci': 'davinci',
      'curie': 'curie',
      'babbage': 'babbage',
      'ada': 'ada'
    };
    
    // Verificar correspondências exatas primeiro
    if (modelMap[lowerModel]) {
      return modelMap[lowerModel];
    }
    
    // Verificar correspondências parciais
    for (const [key, value] of Object.entries(modelMap)) {
      if (lowerModel.includes(key)) {
        return value;
      }
    }
    
    // Verificar padrões de modelo comuns
    if (lowerModel.includes('gpt-4') && lowerModel.includes('vision')) {
      return 'gpt-4-vision';
    } else if (lowerModel.includes('gpt-4o') && lowerModel.includes('mini')) {
      return 'gpt-4o-mini';
    } else if (lowerModel.includes('gpt-4o')) {
      return 'gpt-4o';
    } else if (lowerModel.includes('gpt-4') && lowerModel.includes('turbo')) {
      return 'gpt-4-turbo';
    } else if (lowerModel.includes('gpt-4')) {
      return 'gpt-4';
    } else if (lowerModel.includes('gpt-3.5') || lowerModel.includes('gpt3.5')) {
      return 'gpt-3.5-turbo';
    } else if (lowerModel.includes('dall-e-3') || lowerModel.includes('dalle3')) {
      return 'dall-e-3';
    } else if (lowerModel.includes('embedding')) {
      return 'text-embedding-ada-002';
    }
    
    // Se não conseguimos mapear, retornar o modelo original
    return model;
  }
  
  // Calcular custo detalhado com base no modelo e contagem de tokens
  private calculateDetailedCost(model: string, promptTokens: number, completionTokens: number): number {
    // Preços em dólares por 1000 tokens - atualizados com os modelos mais recentes
    const prices: { [key: string]: { prompt: number, completion: number } } = {
      // GPT-4 e variantes
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-4-vision': { prompt: 0.01, completion: 0.03 },
      
      // GPT-4o e variantes
      'gpt-4o': { prompt: 0.005, completion: 0.015 },
      'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },  // Preços mais baixos do mini
      
      // GPT-3.5 e variantes
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      'gpt-3.5-turbo-16k': { prompt: 0.001, completion: 0.002 },
      'gpt-3.5-turbo-instruct': { prompt: 0.0015, completion: 0.002 },
      
      // DALL-E 3
      'dall-e-3': { prompt: 0.02, completion: 0.02 },  // $0.02 por imagem padrão (simplificado)
      'dall-e-2': { prompt: 0.018, completion: 0.018 },
      
      // Embeddings
      'text-embedding-ada-002': { prompt: 0.0001, completion: 0.0 },
      'text-embedding-3-small': { prompt: 0.00002, completion: 0.0 },
      'text-embedding-3-large': { prompt: 0.00013, completion: 0.0 },
      
      // Whisper (transcrição de áudio)
      'whisper-1': { prompt: 0.006, completion: 0.0 },  // $0.006 por minuto
      
      // Modelos legados
      'text-davinci-003': { prompt: 0.02, completion: 0.02 },
      'text-davinci-002': { prompt: 0.02, completion: 0.02 },
      'text-curie-001': { prompt: 0.002, completion: 0.002 },
      'text-babbage-001': { prompt: 0.0005, completion: 0.0005 },
      'text-ada-001': { prompt: 0.0004, completion: 0.0004 },
      'davinci': { prompt: 0.02, completion: 0.02 },
      'curie': { prompt: 0.002, completion: 0.002 },
      'babbage': { prompt: 0.0005, completion: 0.0005 },
      'ada': { prompt: 0.0004, completion: 0.0004 }
    };
    
    // Usar preços específicos do modelo ou preços default
    const modelPrices = prices[model] || { prompt: 0.002, completion: 0.002 };
    
    // Calcular custo
    const promptCost = (promptTokens / 1000) * modelPrices.prompt;
    const completionCost = (completionTokens / 1000) * modelPrices.completion;
    
    return promptCost + completionCost;
  }

  async getAgentStatus(workflows: N8NWorkflow[]): Promise<N8NAgent[]> {
    console.log('Processing workflows for agent status...')
    const agents: N8NAgent[] = []

    for (const workflow of workflows) {
      console.log(`Processing workflow: ${workflow.name}`)
      console.log('Workflow tags:', workflow.tags)

      const executions = await this.getWorkflowExecutions(workflow.id)
      const lastExecution = executions[0]
      
      // Extrair informações de custos da OpenAI
      const openAICosts = await this.extractOpenAICosts(executions)

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
        // Adiciona informações de custo da OpenAI
        openAI: {
          totalCost: openAICosts.reduce((acc, cost) => acc + cost.cost, 0),
          totalTokens: openAICosts.reduce((acc, cost) => acc + cost.tokens, 0),
          modelUsage: openAICosts.reduce((acc, cost) => {
            acc[cost.model] = {
              cost: cost.cost,
              tokens: cost.tokens,
              calls: 1
            };
            return acc;
          }, {} as Record<string, { cost: number; tokens: number; calls: number }>)
        }
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
      
      // Verificar se temos as configurações necessárias
      const baseUrl = this.getN8NApiUrl();
      const apiKey = this.getN8NApiKey();
      
      if (!baseUrl || !apiKey) {
        console.error('N8N API URL ou API Key não configurados:', {
          baseUrl: baseUrl ? 'Configurado' : 'Não configurado',
          apiKey: apiKey ? 'Configurado' : 'Não configurado'
        });
        throw new Error('N8N API URL ou API Key não configurados');
      }
      
      // URL da API do N8N para buscar um workflow específico
      const apiUrl = `${baseUrl}/workflows/${workflowId}`;
      console.log(`Fazendo requisição GET para ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': apiKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const statusText = response.statusText || 'Erro desconhecido';
        console.error(`Erro ao buscar workflow: ${response.status} - ${statusText}`);
        try {
          const errorData = await response.text();
          console.error('Detalhes do erro:', errorData);
        } catch (e) {
          console.error('Não foi possível ler o corpo da resposta de erro');
        }
        throw new Error(`Erro ao buscar workflow: ${response.status} - ${statusText}`);
      }
      
      const data = await response.json();
      
      // Formatar o retorno para manter compatibilidade com o serviço
      return {
        id: data.id,
        name: data.name,
        active: data.active,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        tags: Array.isArray(data.tags) 
          ? data.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name || '')
          : []
      };
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
    console.log(`Starting OpenAI usage extraction${workflowId ? ` for workflow ${workflowId}` : ''}`);
    
    // Inicializar cliente Supabase se não foi fornecido
    let supabase = supabaseClient;
    let isExternalClient = !!supabaseClient;
    
    if (!supabase) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('Configuração do Supabase não encontrada:',
            { urlDefined: !!supabaseUrl, keyDefined: !!supabaseKey });
          return {
            success: false,
            message: 'Configuração do Supabase não encontrada',
            stats: { total_records: 0 }
          };
        }
        
        console.log('Inicializando cliente Supabase interno');
        
        // Criar o cliente com opções otimizadas para API
        supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          },
          global: {
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Info': 'n8n-service'
            }
          }
        });
      } catch (error) {
        console.error('Erro ao criar cliente Supabase:', error);
        return {
          success: false,
          message: 'Erro ao criar cliente Supabase',
          stats: { total_records: 0 }
        };
      }
    }
    
    try {
      // Testar a conexão com o Supabase
      if (!isExternalClient) {
        console.log('Testando conexão com o Supabase...');
        const { error: testError } = await supabase.from('openai_usage').select('id').limit(1);
        
        if (testError) {
          console.error('Erro na conexão com o Supabase:', testError);
          return {
            success: false,
            message: `Erro na conexão com o Supabase: ${testError.message}`,
            stats: { total_records: 0 }
          };
        }
      }
      
      // Obter workflows - todos ou apenas o especificado
      let workflows: any[] = [];
      
      if (workflowId) {
        console.log(`Obtendo workflow específico: ${workflowId}`);
        const workflow = await this.getWorkflow(workflowId);
        if (workflow) {
          workflows = [workflow];
        } else {
          return {
            success: false,
            message: `Workflow não encontrado: ${workflowId}`,
            stats: { total_records: 0 }
          };
        }
      } else {
        console.log('Obtendo todos os workflows com tag "agent"');
        workflows = await this.getAgentWorkflows();
      }
      
      console.log(`${workflows.length} workflows encontrados para processar`);
      
      if (workflows.length === 0) {
        return {
          success: true,
          message: 'Nenhum workflow encontrado para processar',
          stats: { total_records: 0 }
        };
      }
      
      // Estatísticas para rastrear o progresso
      const stats = {
        workflows_processed: 0,
        executions_processed: 0,
        total_tokens: 0,
        total_records: 0
      };
      
      // Processar cada workflow
      for (const workflow of workflows) {
        try {
          console.log(`\nProcessando workflow: ${workflow.name} (${workflow.id})`);
          
          // Obter as execuções deste workflow
          const executions = await this.getWorkflowExecutions(workflow.id);
          console.log(`${executions.length} execuções encontradas para o workflow ${workflow.name}`);
          
          if (executions.length === 0) {
            console.log(`Nenhuma execução encontrada para o workflow ${workflow.name}, pulando.`);
            continue;
          }
          
          // Extrair custos da OpenAI
          const openAICosts = await this.extractOpenAICosts(executions);
          console.log(`${openAICosts.length} registros de custo extraídos para o workflow ${workflow.name}`);
          
          // Adicionar metadados do workflow a cada registro
          const enhancedCosts = openAICosts.map(cost => ({
            ...cost,
            workflowId: workflow.id,
            workflowName: workflow.name
          }));
          
          // Salvar no Supabase em lotes para evitar sobrecarregar a API
          if (enhancedCosts.length > 0) {
            const BATCH_SIZE = 50;
            let records = 0;
            
            // Processar em lotes
            for (let i = 0; i < enhancedCosts.length; i += BATCH_SIZE) {
              const batch = enhancedCosts.slice(i, i + BATCH_SIZE);
              
              // Preparar dados para inserção
              const recordsToInsert = batch.map(cost => ({
                timestamp: cost.timestamp,
                workflow_id: cost.workflowId,
                workflow_name: cost.workflowName,
                model: cost.model, // Coluna no Supabase com m minúsculo
                "Model": cost.model, // Coluna no Supabase com M maiúsculo para compatibilidade
                endpoint: 'chat', // Padrão para chat completions
                prompt_tokens: cost.promptTokens,
                completion_tokens: cost.completionTokens,
                total_tokens: cost.tokens,
                estimated_cost: cost.cost,
                // Campos obrigatórios para o Supabase
                user_id: null, // Não temos usuário específico
                request_id: `n8n_${cost.executionId}_${cost.nodeId || 'node'}_${new Date().getTime()}`,
                tags: ['agent', 'n8n'],
                metadata: {
                  source: 'n8n',
                  sync_date: new Date().toISOString().split('T')[0],
                  execution_id: cost.executionId,
                  node_id: cost.nodeId,
                  node_name: cost.nodeName
                }
              }));
              
              // Fazer o upsert no Supabase
              try {
                console.log(`Inserindo lote de ${recordsToInsert.length} registros no Supabase...`);
                
                // Log para debug - primeiro registro da requisição
                if (recordsToInsert.length > 0) {
                  console.log('Exemplo de registro para inserção (primeiro do lote):');
                  console.log(JSON.stringify(recordsToInsert[0], null, 2));
                }
                
                const { data, error } = await supabase
                  .from('openai_usage')
                  .upsert(recordsToInsert, {
                    onConflict: 'request_id',
                    ignoreDuplicates: false
                  });
                  
                if (error) {
                  console.error('Erro ao inserir registros no Supabase:', error);
                  console.error('Código do erro:', error.code);
                  console.error('Detalhes:', error.details);
                  console.error('Mensagem:', error.message);
                  console.error('Dica:', error.hint || 'Nenhuma dica disponível');
                  
                  // Tentar obter mais informações sobre a estrutura da tabela
                  try {
                    console.log('Verificando estrutura da tabela openai_usage...');
                    const { data: tableInfo, error: tableError } = await supabase
                      .from('openai_usage')
                      .select('*')
                      .limit(1);
                      
                    if (tableError) {
                      console.error('Erro ao verificar tabela:', tableError);
                    } else if (data && data.length > 0) {
                      console.log('Exemplo de registro existente:');
                      console.log(JSON.stringify(data[0], null, 2));
                    } else {
                      console.log('Tabela openai_usage existe mas não possui registros');
                    }
                  } catch (tableCheckError) {
                    console.error('Erro ao verificar tabela:', tableCheckError);
                  }
                  // Não abortar completamente, continuar com o próximo lote
                } else {
                  records += recordsToInsert.length;
                  console.log(`${recordsToInsert.length} registros inseridos com sucesso`);
                }
              } catch (insertError) {
                console.error('Erro ao inserir lote no Supabase:', insertError);
                if (insertError instanceof Error) {
                  console.error('Detalhes do erro:', insertError.message);
                  console.error('Stack:', insertError.stack);
                }
              }
            }
            
            // Atualizar estatísticas
            stats.total_records += records;
            stats.total_tokens += enhancedCosts.reduce((sum, cost) => sum + cost.tokens, 0);
          }
          
          // Marcar como processado
          stats.workflows_processed++;
          stats.executions_processed += executions.length;
          
        } catch (workflowError) {
          console.error(`Erro ao processar workflow ${workflow.name}:`, workflowError);
          // Continuar com o próximo workflow
        }
      }
      
      console.log('\n===== Resumo da sincronização =====');
      console.log(`Workflows processados: ${stats.workflows_processed}`);
      console.log(`Execuções analisadas: ${stats.executions_processed}`);
      console.log(`Registros inseridos: ${stats.total_records}`);
      console.log(`Total de tokens: ${stats.total_tokens}`);
      
      return {
        success: true,
        message: `Sincronização concluída com sucesso. ${stats.total_records} registros processados.`,
        stats
      };
    } catch (error) {
      console.error('Erro durante a sincronização:', error);
      return {
        success: false,
        message: `Erro durante a sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        stats: { total_records: 0 }
      };
    }
  }

  /**
   * Busca workflows que são agentes de IA
   * @returns {Promise<Array<{id: string, name: string, active: boolean}>>}
   */
  async getAgentWorkflows(): Promise<Array<{ id: string, name: string, active: boolean }>> {
    try {
      console.log('Buscando workflows relacionados a agentes IA...');
      
      const workflows = await this.getWorkflows();
      
      if (!workflows || workflows.length === 0) {
        console.log('Nenhum workflow encontrado na API N8N');
        return [];
      }
      
      console.log(`Obtidos ${workflows.length} workflows totais do N8N`);
      
      // Log para debug - mostrar as tags do primeiro workflow
      if (workflows.length > 0) {
        console.log('Exemplo de workflow:', {
          id: workflows[0].id,
          name: workflows[0].name,
          active: workflows[0].active,
          tags: workflows[0].tags
        });
      }
      
      // Lista expandida de tags relevantes para identificar agentes
      const relevantTags = ['agent', 'ai', 'openai', 'gpt', 'llm', 'chatbot', 'assistant', 'ia', 'bot', 'inteligência artificial'];
      
      // Filtrar workflows que têm tags relevantes ou cujo nome/descrição indica que são agentes
      const agentWorkflows = workflows.filter((wf: N8NWorkflow) => {
        // Verificar se o workflow está ativo
        const isActive = wf.active === true;
        
        // Verificar se existe a propriedade tags e se contém alguma tag relevante
        const hasTags = Array.isArray(wf.tags) && wf.tags.some((tag: any) => {
          // Lidar com tags que podem ser objetos ou strings
          const tagName = typeof tag === 'string' ? tag : (tag && tag.name ? tag.name : '');
          return relevantTags.some(rt => tagName.toLowerCase().includes(rt));
        });
        
        // Verificar se o nome contém termos relevantes
        const nameContainsAgent = typeof wf.name === 'string' && 
          relevantTags.some(tag => wf.name.toLowerCase().includes(tag));
        
        // Verificar se a descrição contém termos relevantes (se existir)
        const descriptionContainsAgent = typeof wf.description === 'string' && wf.description !== undefined && 
          relevantTags.some(tag => wf.description!.toLowerCase().includes(tag));
        
        // Log para debug
        if (hasTags) {
          console.log(`Workflow ${wf.name} tem tags relevantes:`, wf.tags);
        }
        
        // Considerar como agente se tiver tags ou nome/descrição relevantes
        return isActive && (hasTags || nameContainsAgent || descriptionContainsAgent);
      });
      
      console.log(`Identificados ${agentWorkflows.length} workflows relacionados a agentes.`);
      
      // Mapear apenas os dados necessários
      return agentWorkflows.map((wf: N8NWorkflow) => ({
        id: wf.id,
        name: wf.name,
        active: wf.active
      }));
    } catch (error) {
      console.error('Erro ao buscar workflows de agentes:', error);
      return [];
    }
  }
}

export const n8nService = new N8NService() 