import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos para o rastreador de uso
export interface OpenAIUsageRecord {
  timestamp: string;
  model: string;
  endpoint: string; // completions, chat, embeddings, etc.
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  userId?: string;
  requestId: string;
  metadata?: Record<string, any>;
}

export interface OpenAIUsageSummary {
  currentMonthTotal: number;
  previousMonthTotal: number;
  subscription: {
    usageLimit: number;
    remainingCredits: number;
  };
  currentMonth: {
    startDate: string;
    endDate: string;
    percentChange: number;
  };
  dailyAverage: {
    amount: number;
    percentOfLimit: number;
  };
  dailyUsage: Array<{
    date: string;
    amount: number;
    totalTokens?: number;
  }>;
  modelUsage: Array<{
    model: string;
    cost: number;
    tokens: number;
    requests: number;
  }>;
  usageByModel?: Record<string, {
    cost: number;
    tokens: number;
    calls: number;
  }>;
  costByAgent?: Record<string, {
    cost: number;
    tokens: number;
  }>;
}

// Preços estimados por 1K tokens (em USD)
// Esses valores podem precisar ser atualizados com os preços mais recentes da OpenAI
const MODEL_PRICING = {
  'gpt-4o': { prompt: 0.01, completion: 0.03 },
  'gpt-4': { prompt: 0.03, completion: 0.06 },
  'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
  'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
  'text-embedding-ada-002': { prompt: 0.0001, completion: 0 },
  'dall-e-3': { prompt: 0.04, completion: 0 }, // por imagem, não por token
  'whisper-1': { prompt: 0.006, completion: 0 } // por minuto
};

// Fallback para modelos não listados explicitamente
const DEFAULT_PRICING = { prompt: 0.002, completion: 0.002 };

export class OpenAIUsageTracker {
  private supabase;
  private localRecords: OpenAIUsageRecord[] = [];
  private useSupabase: boolean;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.useSupabase = !!(supabaseUrl && supabaseKey);
    
    if (this.useSupabase) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Registra o uso da API OpenAI
   */
  async trackUsage(record: Omit<OpenAIUsageRecord, 'timestamp' | 'estimatedCost' | 'requestId'>): Promise<void> {
    const timestamp = new Date().toISOString();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Calcula o custo estimado
    const modelPricing = MODEL_PRICING[record.model as keyof typeof MODEL_PRICING] || DEFAULT_PRICING;
    const promptCost = (record.promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (record.completionTokens / 1000) * modelPricing.completion;
    const estimatedCost = promptCost + completionCost;
    
    const fullRecord: OpenAIUsageRecord = {
      ...record,
      timestamp,
      estimatedCost,
      requestId
    };
    
    // Armazena localmente
    this.localRecords.push(fullRecord);
    
    // Armazena no Supabase se configurado
    if (this.useSupabase) {
      try {
        await this.supabase.from('openai_usage').insert(fullRecord);
      } catch (error) {
        console.error('Erro ao salvar registro de uso da OpenAI:', error);
      }
    }
    
    // Limita o tamanho dos registros locais (mantém apenas os últimos 1000)
    if (this.localRecords.length > 1000) {
      this.localRecords = this.localRecords.slice(-1000);
    }
  }

  /**
   * Obtém um resumo do uso da OpenAI
   */
  async getUsageSummary(userId?: string): Promise<OpenAIUsageSummary> {
    let records: OpenAIUsageRecord[] = [];
    
    // Tenta obter os registros do Supabase primeiro
    if (this.useSupabase) {
      try {
        const query = this.supabase
          .from('openai_usage')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1000);
          
        if (userId) {
          query.eq('userId', userId);
        }
        
        const { data, error } = await query;
        
        if (!error && data) {
          records = data;
        } else {
          console.error('Erro ao buscar registros do Supabase:', error);
          records = this.localRecords;
        }
      } catch (error) {
        console.error('Erro ao buscar registros de uso da OpenAI:', error);
        records = this.localRecords;
      }
    } else {
      records = this.localRecords;
    }
    
    // Calcula as datas para filtrar os registros
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Filtrar registros por mês
    const currentMonthRecords = records.filter(record => 
      new Date(record.timestamp) >= currentMonthStart);
    
    const previousMonthRecords = records.filter(record => 
      new Date(record.timestamp) >= previousMonthStart && 
      new Date(record.timestamp) < currentMonthStart);
    
    // Calcula os totais mensais
    const currentMonthTotal = currentMonthRecords.reduce(
      (sum, record) => sum + record.estimatedCost, 0);
    
    const previousMonthTotal = previousMonthRecords.reduce(
      (sum, record) => sum + record.estimatedCost, 0);
    
    // Cria o resumo diário
    const dailyUsageMap = new Map<string, { cost: number, totalTokens: number }>();
    
    currentMonthRecords.forEach(record => {
      const date = record.timestamp.split('T')[0];
      const current = dailyUsageMap.get(date) || { cost: 0, totalTokens: 0 };
      
      dailyUsageMap.set(date, {
        cost: current.cost + record.estimatedCost,
        totalTokens: current.totalTokens + record.totalTokens
      });
    });
    
    const dailyUsage = Array.from(dailyUsageMap.entries())
      .map(([date, data]) => ({
        date: format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }),
        amount: parseFloat(data.cost.toFixed(4)),
        cost: parseFloat(data.cost.toFixed(4)),
        totalTokens: data.totalTokens
      }))
      .sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return dateA.localeCompare(dateB);
      });
    
    // Calcula o uso por modelo
    const modelUsageMap = new Map<string, { cost: number, totalTokens: number, requests: number }>();
    
    currentMonthRecords.forEach(record => {
      const current = modelUsageMap.get(record.model) || { cost: 0, totalTokens: 0, requests: 0 };
      
      modelUsageMap.set(record.model, {
        cost: current.cost + record.estimatedCost,
        totalTokens: current.totalTokens + record.totalTokens,
        requests: current.requests + 1
      });
    });
    
    const modelUsage = Array.from(modelUsageMap.entries())
      .map(([model, data]) => ({
        model,
        cost: parseFloat(data.cost.toFixed(4)),
        tokens: data.totalTokens,
        requests: data.requests
      }))
      .sort((a, b) => b.cost - a.cost);
    
    // Configurações de assinatura baseadas em dados reais
    // Esses valores deveriam vir de alguma configuração ou banco de dados na implementação real
    const subscription = {
      tier: 'Plano Padrão',
      usageLimit: 120,
      remainingCredits: 120 - currentMonthTotal
    };
    
    // Calcular média diária
    const daysPassed = Math.max(1, Math.ceil((now.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)));
    const averageDaily = currentMonthTotal / daysPassed;
    const projectedMonthTotal = averageDaily * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Calcular percentual de mudança
    const percentChange = previousMonthTotal > 0 
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 
      : 0;
    
    return {
      dailyUsage,
      currentMonthTotal: parseFloat(currentMonthTotal.toFixed(2)),
      previousMonthTotal: parseFloat(previousMonthTotal.toFixed(2)),
      subscription,
      modelUsage,
      // Adicionar os campos que estavam faltando
      currentMonth: {
        startDate: currentMonthStart.toISOString(),
        endDate: currentMonthEnd.toISOString(),
        percentChange: parseFloat(percentChange.toFixed(2))
      },
      dailyAverage: {
        amount: parseFloat(averageDaily.toFixed(2)),
        percentOfLimit: subscription.usageLimit > 0 
          ? parseFloat(((projectedMonthTotal / subscription.usageLimit) * 100).toFixed(2)) 
          : 0
      }
    };
  }
}

// Exporta uma instância singleton para uso em toda a aplicação
let tracker: OpenAIUsageTracker;

export function getOpenAITracker(supabaseUrl?: string, supabaseKey?: string): OpenAIUsageTracker {
  if (!tracker) {
    tracker = new OpenAIUsageTracker(supabaseUrl, supabaseKey);
  }
  return tracker;
} 