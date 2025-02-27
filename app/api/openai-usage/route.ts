import { NextResponse } from "next/server"
import OpenAI from "openai"

// Função para gerar dados simulados de uso da OpenAI
function generateMockUsageData(apiKey: string) {
  // Verificar se a API Key tem um formato válido (simplificado)
  const isValidKey = apiKey.startsWith('sk-') && apiKey.length > 20

  if (!isValidKey) {
    throw new Error('API Key inválida ou mal formatada')
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  
  // Gerar dados diários simulados
  const dailyUsage = []
  const daysInMonth = now.getDate()
  let totalUsage = 0
  
  for (let i = 0; i < daysInMonth; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), i + 1)
    // Gerar um valor aleatório entre 0.5 e 3.5 dólares por dia
    const cost = 0.5 + Math.random() * 3
    totalUsage += cost
    
    dailyUsage.push({
      timestamp: date.toISOString().split('T')[0],
      line_items: [{ cost: cost * 100 }] // Convertendo para centavos como na API real
    })
  }
  
  // Gerar um valor para o mês anterior (cerca de 80-120% do atual)
  const previousMonthMultiplier = 0.8 + Math.random() * 0.4
  const previousMonthTotal = totalUsage * previousMonthMultiplier
  
  return {
    currentMonthUsage: {
      total_usage: totalUsage * 100, // Convertendo para centavos como na API real
      daily_costs: dailyUsage
    },
    previousMonthUsage: {
      total_usage: previousMonthTotal * 100 // Convertendo para centavos
    },
    subscription: {
      plan: { id: "pay_as_you_go" },
      hard_limit_usd: 120,
      soft_limit_usd: 100,
      system_hard_limit_usd: 120,
      has_payment_method: true
    }
  }
}

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key da OpenAI é obrigatória" },
        { status: 400 }
      )
    }

    // Verificar se a API Key é válida fazendo uma chamada simples
    try {
      const openai = new OpenAI({ apiKey })
      // Tentar fazer uma chamada simples para verificar se a API Key é válida
      await openai.models.list({ limit: 1 })
    } catch (error) {
      console.error("Erro ao validar API Key")
      return NextResponse.json(
        { 
          success: false, 
          error: "API Key inválida ou expirada",
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        },
        { status: 401 }
      )
    }

    // Gerar dados simulados
    const mockData = generateMockUsageData(apiKey)
    const { currentMonthUsage, previousMonthUsage, subscription } = mockData

    // Formata os dados para retornar ao cliente
    const usageData = {
      currentMonth: {
        total: currentMonthUsage.total_usage / 100, // Converte de centavos para dólares
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        dailyUsage: currentMonthUsage.daily_costs.map(day => ({
          date: day.timestamp,
          cost: day.line_items.reduce((acc, item) => acc + item.cost, 0) / 100
        }))
      },
      previousMonth: {
        total: previousMonthUsage.total_usage / 100,
        startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
      },
      subscription: {
        plan: subscription.plan.id,
        hardLimit: subscription.hard_limit_usd,
        softLimit: subscription.soft_limit_usd,
        systemHardLimit: subscription.system_hard_limit_usd,
        hasPaymentMethod: subscription.has_payment_method
      }
    }

    return NextResponse.json({
      success: true,
      data: usageData
    })
  } catch (error) {
    console.error('Erro ao gerar dados de uso simulados')
    
    // Verifica se é um erro de autenticação
    if (error instanceof Error && error.message.includes('API Key inválida')) {
      return NextResponse.json(
        { 
          success: false, 
          error: "API Key inválida ou expirada",
          details: error.message
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Falha ao buscar dados de uso da OpenAI",
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 