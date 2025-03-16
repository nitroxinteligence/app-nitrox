import { NextResponse } from 'next/server';
import { fetchOpenAICompletionsUsage } from '@/lib/openai-completions-service';

/**
 * API para sincronizar dados de uso de completions da OpenAI
 * Método: POST
 * Parâmetros: 
 * - days: número de dias para buscar (padrão: 31)
 */
export async function POST(req: Request) {
  try {
    // Extrair parâmetros da requisição (opcional)
    const body = await req.json().catch(() => ({}));
    const days = body.days || 31; // Alterado para 31 dias por padrão (máximo permitido pela API)
    
    console.log(`Iniciando sincronização de dados de completions dos últimos ${days} dias (API)`);
    
    // Buscar dados de uso da OpenAI
    let usageData;
    try {
      usageData = await fetchOpenAICompletionsUsage(days);
      console.log(`Recebidos ${usageData.length} registros da API da OpenAI`);
      
      // Log detalhado de datas disponíveis para diagnóstico
      const dates = new Set();
      usageData.forEach(item => {
        if (item.start_time) {
          const date = new Date(item.start_time * 1000);
          dates.add(date.toISOString().split('T')[0]);
        }
      });
      
      console.log(`Dados recebidos para as seguintes datas (${dates.size}): ${[...dates].sort().join(', ')}`);
      
    } catch (openaiError) {
      console.error('Erro ao buscar dados da API da OpenAI:', openaiError);
      return NextResponse.json({
        success: false,
        error: openaiError instanceof Error 
          ? openaiError.message 
          : 'Erro desconhecido ao buscar dados da API da OpenAI'
      }, { status: 500 });
    }
    
    // Calcular estatísticas para o relatório
    const totalInputTokens = usageData.reduce((sum, item) => sum + (item.input_tokens || 0), 0);
    const totalOutputTokens = usageData.reduce((sum, item) => sum + (item.output_tokens || 0), 0);
    const totalRequests = usageData.reduce((sum, item) => sum + (item.num_model_requests || 0), 0);
    
    // Retornar resultados
    return NextResponse.json({
      success: true,
      message: `Dados de ${usageData.length} registros obtidos com sucesso`,
      stats: {
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_requests: totalRequests,
        records_processed: usageData.length
      },
      data: usageData
    });
  } catch (error) {
    console.error('Erro na sincronização de dados de completions:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * Método GET para verificar status da API
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'API de sincronização de dados de completions da OpenAI está online.',
    usage: 'Envie uma requisição POST para sincronizar os dados.'
  });
} 