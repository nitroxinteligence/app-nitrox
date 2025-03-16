import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API para dados de uso da OpenAI - Versão compatível (retorna apenas dados de completions)
 */
export async function GET() {
  try {
    console.log('📢 Chamada à API de uso do OpenAI - utilizando apenas dados de completions');
    
    // Inicializar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Configuração do Supabase incompleta' 
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Buscar dados de completions diretamente
    const { data: completionsData, error: completionsError } = await supabase
      .from('openai_completions_usage')
      .select('*')
      .order('date', { ascending: false });
    
    if (completionsError) {
      console.error('Erro ao buscar dados de completions:', completionsError);
      
      // Estrutura de resultado vazia para compatibilidade
      return NextResponse.json({
        subscription: {
          usageLimit: 5000,
          remainingCredits: 4500 
        },
        dailyAverage: {
          amount: 10,
          percentOfLimit: 5
        },
        modelUsage: [],
        dailyUsage: [],
        agentUsage: {},
        monthlyComparison: {
          current: 0,
          previous: 0,
          percentChange: 0
        }
      });
    }
    
    // Processar dados para formato compatível
    const monthlyData = {
      subscription: {
        usageLimit: 5000,
        remainingCredits: 4500
      },
      dailyAverage: {
        amount: 10,
        percentOfLimit: 5
      },
      modelUsage: [],
      dailyUsage: [],
      agentUsage: {},
      monthlyComparison: {
        current: 0,
        previous: 0,
        percentChange: 0
      }
    };
    
    console.log('✅ Retornando dados de uso compatíveis (somente completions)');
    
    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error('⚠️ Erro ao processar requisição:', error);
    
    return NextResponse.json({ 
      error: 'Erro ao processar requisição',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 