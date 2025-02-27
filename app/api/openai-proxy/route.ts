import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OpenAITracker, OpenAIUsageSummary } from '@/lib/openai-tracker';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, operation } = await request.json();

    if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
      return NextResponse.json(
        { error: 'Chave API inválida. Deve começar com "sk-" e ter comprimento adequado.' },
        { status: 400 }
      );
    }

    // Cria uma instância do cliente OpenAI no servidor, onde é seguro usar
    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Operação para verificar se a chave API é válida
    if (operation === 'validateKey') {
      try {
        await openai.models.list();
        return NextResponse.json({ valid: true });
      } catch (error) {
        console.error('Erro ao validar chave API:', error);
        return NextResponse.json(
          { error: 'Chave API inválida ou expirada', valid: false },
          { status: 401 }
        );
      }
    }

    // Operação para obter um resumo de uso simulado
    if (operation === 'getUsageSummary') {
      const tracker = new OpenAITracker();
      
      // Gera dados de uso simulados
      const summary: OpenAIUsageSummary = {
        currentMonthTotal: Math.random() * 15 + 5, // $5-$20
        previousMonthTotal: Math.random() * 20 + 10, // $10-$30
        currentMonthPercentChange: Math.random() * 40 - 20, // -20% a +20%
        dailyUsage: generateDailyUsage(),
        topModels: [
          { model: 'gpt-4', cost: Math.random() * 10 + 3, tokens: Math.floor(Math.random() * 50000 + 10000) },
          { model: 'gpt-3.5-turbo', cost: Math.random() * 3 + 1, tokens: Math.floor(Math.random() * 100000 + 50000) },
          { model: 'dall-e-3', cost: Math.random() * 5 + 2, tokens: Math.floor(Math.random() * 20 + 5) }
        ],
        subscription: {
          name: 'Pay-as-you-go',
          usageLimit: 120,
          usageLimitPeriod: 'month'
        }
      };
      
      return NextResponse.json(summary);
    }

    // Operação não reconhecida
    return NextResponse.json({ error: 'Operação não suportada' }, { status: 400 });
  } catch (error) {
    console.error('Erro na API proxy:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}

// Função auxiliar para gerar dados de uso diário simulados
function generateDailyUsage() {
  const dailyUsage = [];
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  for (let i = 1; i <= daysInMonth; i++) {
    // Apenas gera dados até o dia atual
    if (i <= today.getDate()) {
      dailyUsage.push({
        date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        cost: Math.random() * 3 + 0.5, // $0.50-$3.50 por dia
      });
    }
  }
  
  return dailyUsage;
} 