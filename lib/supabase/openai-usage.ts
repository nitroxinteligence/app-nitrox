import { createClient } from '@supabase/supabase-js'
import { OpenAIUsageRecord, OpenAIUsageSummary } from '../openai-tracker'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Inicializar cliente Supabase
const initSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('As variáveis de ambiente do Supabase não estão configuradas')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Grava um registro de uso da OpenAI no Supabase
 */
export async function logOpenAIUsage(record: OpenAIUsageRecord) {
  try {
    const supabase = initSupabase()
    
    const { data, error } = await supabase
      .from('openai_usage')
      .insert({
        timestamp: record.timestamp,
        model: record.model,
        endpoint: record.endpoint,
        prompt_tokens: record.promptTokens,
        completion_tokens: record.completionTokens,
        total_tokens: record.totalTokens,
        estimated_cost: record.estimatedCost,
        user_id: record.userId,
        request_id: record.requestId,
        metadata: record.metadata
      })
    
    if (error) {
      console.error('Erro ao gravar uso da OpenAI:', error)
      return { success: false, error }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao gravar uso da OpenAI:', error)
    return { success: false, error }
  }
}

/**
 * Obtém o resumo de uso mensal da OpenAI
 */
export async function getOpenAIUsageSummary(userId?: string): Promise<OpenAIUsageSummary> {
  try {
    const supabase = initSupabase()
    
    // Obter o mês atual e anterior
    const now = new Date()
    const currentMonth = format(now, 'yyyy-MM')
    
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonth = format(prevMonth, 'yyyy-MM')
    
    // Calcular os dados do mês atual
    const { data: currentMonthData, error: currentError } = await supabase
      .rpc('get_monthly_openai_usage', { 
        user_id_param: userId,
        year_month: currentMonth
      })
    
    if (currentError) throw currentError
    
    // Calcular os dados do mês anterior
    const { data: previousMonthData, error: previousError } = await supabase
      .rpc('get_monthly_openai_usage', { 
        user_id_param: userId,
        year_month: previousMonth
      })
    
    if (previousError) throw previousError
    
    // Obter dados diários do mês atual
    const { data: dailyData, error: dailyError } = await supabase
      .from('openai_usage')
      .select('timestamp, total_tokens, estimated_cost')
      .eq('user_id', userId)
      .gte('timestamp', `${currentMonth}-01`)
      .lte('timestamp', `${format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')}`)
      .order('timestamp')
    
    if (dailyError) throw dailyError
    
    // Processar dados diários
    const dailyMap = new Map<string, { cost: number, totalTokens: number }>()
    
    dailyData?.forEach(record => {
      const date = format(new Date(record.timestamp), 'yyyy-MM-dd')
      const current = dailyMap.get(date) || { cost: 0, totalTokens: 0 }
      
      dailyMap.set(date, {
        cost: current.cost + Number(record.estimated_cost),
        totalTokens: current.totalTokens + record.total_tokens
      })
    })
    
    const dailyUsage = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date: format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }),
        cost: parseFloat(data.cost.toFixed(4)),
        totalTokens: data.totalTokens
      }))
      .sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-')
        const dateB = b.date.split('/').reverse().join('-')
        return dateA.localeCompare(dateB)
      })
    
    // Calcular uso por modelo
    const modelUsage = currentMonthData?.filter(item => item.model)
      .map(item => ({
        model: item.model,
        cost: parseFloat(Number(item.model_cost).toFixed(4)),
        totalTokens: Number(item.model_tokens)
      }))
      .sort((a, b) => b.cost - a.cost) || []
    
    // Calcular totais
    const currentMonthTotal = currentMonthData && currentMonthData.length > 0 
      ? parseFloat(Number(currentMonthData[0].total_cost).toFixed(2)) 
      : 0
    
    const previousMonthTotal = previousMonthData && previousMonthData.length > 0 
      ? parseFloat(Number(previousMonthData[0].total_cost).toFixed(2)) 
      : 0
    
    // Dados de assinatura simulados
    const subscription = {
      tier: 'Plano Padrão',
      usageLimit: 120,
      remainingCredits: 120 - currentMonthTotal
    }
    
    return {
      dailyUsage,
      currentMonthTotal,
      previousMonthTotal,
      subscription,
      modelUsage
    }
  } catch (error) {
    console.error('Erro ao obter resumo de uso da OpenAI:', error)
    
    // Retornar dados vazios em caso de erro
    return {
      dailyUsage: [],
      currentMonthTotal: 0,
      previousMonthTotal: 0,
      subscription: {
        tier: 'Plano Padrão',
        usageLimit: 120,
        remainingCredits: 120
      },
      modelUsage: []
    }
  }
} 