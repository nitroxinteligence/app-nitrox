import OpenAI from 'openai';
import { getOpenAITracker, OpenAIUsageSummary } from './openai-tracker';
import { encode } from 'gpt-tokenizer';

// Verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined';

// Tipo para contagem de tokens
interface TokenCount {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Simulador de dados de uso para o ambiente do navegador
function generateSimulatedUsageSummary(): OpenAIUsageSummary {
  const now = new Date();
  const dailyUsage = [];
  const daysInMonth = now.getDate();
  let totalUsage = 0;
  
  // Gerar dados diários simulados dos últimos dias
  for (let i = 0; i < daysInMonth; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
    const cost = 0.5 + Math.random() * 2.5;
    totalUsage += cost;
    
    dailyUsage.push({
      date: date.toISOString().split('T')[0],
      cost,
    });
  }
  
  return {
    dailyUsage,
    totalUsage,
    lastUpdated: new Date().toISOString()
  };
}

// Classe que envolve o cliente OpenAI e adiciona rastreamento de uso
export class TrackedOpenAIClient {
  private client: OpenAI | null = null;
  private apiKey: string;
  private userId?: string;
  private tracker = getOpenAITracker();
  
  constructor(apiKey: string, userId?: string) {
    this.apiKey = apiKey;
    this.userId = userId;
    
    // No servidor, criamos o cliente OpenAI normalmente
    if (!isBrowser) {
      this.client = new OpenAI({ 
        apiKey,
      });
    } else {
      // No navegador, tentamos criar o cliente, mas com a opção de segurança
      // para casos específicos como teste local
      try {
        this.client = new OpenAI({ 
          apiKey,
          dangerouslyAllowBrowser: true
        });
        console.warn('⚠️ Usando cliente OpenAI diretamente no navegador. Isto não é recomendado em produção por questões de segurança.');
      } catch (err) {
        console.warn('Não foi possível criar o cliente OpenAI no navegador. Usando o proxy de API para as chamadas.', err);
        this.client = null;
      }
    }
  }
  
  // Método auxiliar para validar a chave API via proxy quando estiver no navegador
  private async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('/api/openai-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          operation: 'validateKey'
        }),
      });
      
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Erro ao validar chave API via proxy:', error);
      return false;
    }
  }
  
  // Método para estimar a contagem de tokens para texto
  // Este é um método aproximado, você pode querer usar bibliotecas como tiktoken para maior precisão
  private estimateTokenCount(text: string): number {
    // Estimativa simples: ~4 caracteres por token para línguas latinas
    return Math.ceil(text.length / 4);
  }
  
  // Método para rastrear o uso de completions
  private async trackCompletion(
    model: string, 
    endpoint: string,
    tokenCount: TokenCount,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.tracker.trackUsage({
      model,
      endpoint,
      promptTokens: tokenCount.promptTokens,
      completionTokens: tokenCount.completionTokens,
      totalTokens: tokenCount.totalTokens,
      userId: this.userId,
      metadata
    });
  }
  
  // Chat completions com rastreamento
  async createChatCompletion(params: OpenAI.Chat.CompletionCreateParamsNonStreaming): Promise<OpenAI.Chat.Completion> {
    const startTime = Date.now();
    
    try {
      let response;
      
      // No navegador sem cliente, usamos o proxy
      if (isBrowser && !this.client) {
        const proxyResponse = await fetch('/api/openai-proxy/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: this.apiKey,
            params
          }),
        });
        
        if (!proxyResponse.ok) {
          throw new Error(`Erro no proxy: ${proxyResponse.status} ${proxyResponse.statusText}`);
        }
        
        response = await proxyResponse.json();
      } else if (this.client) {
        // Se temos um cliente disponível (servidor ou navegador com dangerouslyAllowBrowser)
        response = await this.client.chat.completions.create(params);
      } else {
        throw new Error('Sem cliente OpenAI disponível e proxy não configurado');
      }
      
      // Extrair contagens de tokens diretamente da resposta
      const tokenCount: TokenCount = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      };
      
      // Cálculo aproximado se a contagem não estiver disponível
      if (tokenCount.totalTokens === 0) {
        let promptTokens = 0;
        params.messages.forEach(msg => {
          promptTokens += this.estimateTokenCount(msg.content || '');
        });
        
        let completionTokens = 0;
        response.choices.forEach(choice => {
          completionTokens += this.estimateTokenCount(choice.message?.content || '');
        });
        
        tokenCount.promptTokens = promptTokens;
        tokenCount.completionTokens = completionTokens;
        tokenCount.totalTokens = promptTokens + completionTokens;
      }
      
      // Rastrear uso
      await this.trackCompletion(
        params.model, 
        'chat.completions', 
        tokenCount, 
        {
          temperature: params.temperature,
          maxTokens: params.max_tokens,
          duration: Date.now() - startTime
        }
      );
      
      return response;
    } catch (error) {
      // Ainda rastreia em caso de erro, mas com tokens estimados
      const promptTokens = params.messages.reduce(
        (sum, msg) => sum + this.estimateTokenCount(msg.content || ''), 
        0
      );
      
      await this.trackCompletion(
        params.model,
        'chat.completions',
        {
          promptTokens,
          completionTokens: 0,
          totalTokens: promptTokens
        },
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          temperature: params.temperature,
          maxTokens: params.max_tokens,
          duration: Date.now() - startTime
        }
      );
      
      throw error;
    }
  }
  
  // Método para criar embeddings com rastreamento
  async createEmbedding(params: OpenAI.EmbeddingCreateParams): Promise<OpenAI.Embeddings> {
    const startTime = Date.now();
    
    try {
      let response;
      
      // No navegador sem cliente, usamos o proxy
      if (isBrowser && !this.client) {
        const proxyResponse = await fetch('/api/openai-proxy/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: this.apiKey,
            params
          }),
        });
        
        if (!proxyResponse.ok) {
          throw new Error(`Erro no proxy: ${proxyResponse.status} ${proxyResponse.statusText}`);
        }
        
        response = await proxyResponse.json();
      } else if (this.client) {
        // Se temos um cliente disponível (servidor ou navegador com dangerouslyAllowBrowser)
        response = await this.client.embeddings.create(params);
      } else {
        throw new Error('Sem cliente OpenAI disponível e proxy não configurado');
      }
      
      // Extrair contagem de tokens da resposta
      const tokenCount: TokenCount = {
        promptTokens: response.usage.total_tokens,
        completionTokens: 0, // Embeddings não têm tokens de conclusão
        totalTokens: response.usage.total_tokens
      };
      
      // Rastrear uso
      await this.trackCompletion(
        params.model,
        'embeddings',
        tokenCount,
        {
          duration: Date.now() - startTime
        }
      );
      
      return response;
    } catch (error) {
      // Ainda rastreia em caso de erro
      let promptTokens = 0;
      
      if (typeof params.input === 'string') {
        promptTokens = this.estimateTokenCount(params.input);
      } else if (Array.isArray(params.input)) {
        params.input.forEach(text => {
          if (typeof text === 'string') {
            promptTokens += this.estimateTokenCount(text);
          }
        });
      }
      
      await this.trackCompletion(
        params.model,
        'embeddings',
        {
          promptTokens,
          completionTokens: 0,
          totalTokens: promptTokens
        },
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        }
      );
      
      throw error;
    }
  }
  
  // Validar se a chave API é válida usando o proxy se estiver no navegador
  async isValidApiKey(): Promise<boolean> {
    try {
      if (isBrowser && !this.client) {
        return await this.validateApiKey();
      } else if (this.client) {
        await this.client.models.list();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao validar chave API:', error);
      return false;
    }
  }
  
  // Acessor para o cliente OpenAI original
  // Usado quando precisamos acessar métodos que ainda não foram implementados no wrapper
  get rawClient(): OpenAI {
    if (!this.client) {
      throw new Error('Cliente OpenAI não disponível no ambiente atual. Use os métodos do TrackedOpenAIClient.');
    }
    return this.client;
  }
  
  // Método para obter o resumo de uso
  async getUsageSummary() {
    // No navegador sem cliente, usamos o proxy para obter dados simulados
    if (isBrowser && !this.client) {
      try {
        const response = await fetch('/api/openai-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: this.apiKey,
            operation: 'getUsageSummary'
          }),
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        // Se falhar, retornamos os dados locais
        return this.tracker.getUsageSummary(this.userId);
      } catch (error) {
        console.error('Erro ao obter dados de uso via proxy:', error);
        return this.tracker.getUsageSummary(this.userId);
      }
    }
    
    // Caso contrário, usamos os dados do rastreador local
    return this.tracker.getUsageSummary(this.userId);
  }
}

// Função de fábrica para criar um cliente rastreado da OpenAI
export function createTrackedOpenAIClient(apiKey: string, userId?: string): TrackedOpenAIClient {
  return new TrackedOpenAIClient(apiKey, userId);
} 