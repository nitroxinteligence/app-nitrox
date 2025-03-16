import { NextResponse } from 'next/server';
import { fetchOpenAICompletionsUsage, fetchTodayCompletionsUsage, extractTodayData } from '@/lib/openai-completions-service';

/**
 * API para sincronizar dados de uso de completions da OpenAI para o dia atual
 * Método: POST
 */
export async function POST(req: Request) {
  try {
    console.log('Iniciando sincronização de dados de completions do dia atual (API)');
    
    // Obter a data de hoje em UTC para garantir alinhamento com a OpenAI
    const now = new Date();
    const utcNow = new Date(now.getTime());
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    console.log(`Data de hoje para sincronização (Local): ${now.toISOString().split('T')[0]}`);
    console.log(`Data de hoje para sincronização (UTC): ${todayString}`);
    
    // Preparar estrutura para retornar dados do dia atual
    let todayData = {
      date: todayString,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        requests: 0,
        efficiency: 0
      },
      cost: 0
    };
    
    let usageData = [];
    let costsData = [];
    
    try {
      // Buscar dados diretamente da OpenAI
      const { usage, costs } = await fetchTodayCompletionsUsage();
      console.log(`Recebidos ${usage.length} registros de uso e ${costs.length} registros de custos da API da OpenAI`);
      
      // Guardar dados brutos
      usageData = usage;
      costsData = costs;
      
      // Processar os dados da API para extrair informações do dia atual
      const extractedData = extractTodayData(usage, costs);
      if (extractedData) {
        console.log('Dados processados para hoje extraídos com sucesso:', extractedData);
        todayData = extractedData;
      } else {
        console.warn('Não foi possível extrair dados formatados para hoje a partir do uso/completions');
        
        // Mesmo sem poder extrair dados de uso, podemos tentar extrair algum custo
        if (costs.length > 0) {
          // Tentar encontrar um custo para hoje em UTC
          const todayCost = costs.find(cost => {
            const costDate = new Date(cost.bucket.start_time * 1000).toISOString().split('T')[0];
            return costDate === todayString;
          });
          
          if (todayCost) {
            console.log('Encontrado custo para hoje sem dados de uso associados:', todayCost);
            todayData.cost = todayCost.amount.value || 0;
          }
        }
      }
    } catch (openaiError) {
      console.error('Erro ao buscar dados da API da OpenAI:', openaiError);
      // Não lançar exceção, apenas logar o erro e continuar com dados vazios
    }
    
    // Garantir que a data no todayData é a de hoje em UTC
    todayData.date = todayString;
    
    // Calcular estatísticas para o relatório usando os dados brutos
    const totalInputTokens = usageData.reduce((sum, item) => sum + (item.input_tokens || 0), 0);
    const totalOutputTokens = usageData.reduce((sum, item) => sum + (item.output_tokens || 0), 0);
    const totalRequests = usageData.reduce((sum, item) => sum + (item.num_model_requests || 0), 0);
    
    // Calcular custo total dos dados brutos
    const totalCost = costsData.reduce((sum, item) => {
      if (item.amount) {
        const value = typeof item.amount.value === 'number' 
          ? item.amount.value 
          : parseFloat(item.amount.value || '0');
        return sum + (isNaN(value) ? 0 : value);
      }
      return sum;
    }, 0);
    
    // Log para diagnóstico
    console.log('Dados finais para retorno da API:');
    console.log('- Dados de hoje:', todayData);
    console.log('- Custo total calculado:', totalCost);
    
    // Retornar resultados com os dados processados para hoje
    return NextResponse.json({
      success: true,
      message: `Dados para hoje (${todayString}) obtidos com sucesso`,
      stats: {
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_requests: totalRequests,
        total_cost: totalCost
      },
      data: usageData,
      costs: costsData, // Incluir também os dados brutos de custos
      todayData: todayData // Incluir os dados processados específicos de hoje
    });
  } catch (error) {
    console.error('Erro na sincronização de dados de completions:', error);
    
    // Mesmo em caso de erro geral, retornar dados vazios para hoje
    const now = new Date();
    const utcNow = new Date(now.getTime());
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    return NextResponse.json({
      success: true, // Indicar sucesso mesmo em caso de erro para não quebrar o fluxo
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: "Dados padrão para hoje retornados devido a um erro",
      todayData: {
        date: todayString,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          input_cached_tokens: 0,
          requests: 0,
          efficiency: 0
        },
        cost: 0
      },
      data: []
    });
  }
}

/**
 * API para buscar dados de uso de completions da OpenAI para o dia atual
 * Método: GET
 */
export async function GET(req: Request) {
  try {
    console.log('Buscando dados de completions do dia atual (API)');
    
    // Obter a data de hoje em UTC para garantir alinhamento com a OpenAI
    const now = new Date();
    const utcNow = new Date(now.getTime());
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    console.log(`Data de hoje para consulta (Local): ${now.toISOString().split('T')[0]}`);
    console.log(`Data de hoje para consulta (UTC): ${todayString}`);
    
    // Preparar estrutura para retornar dados do dia atual
    let todayData = {
      date: todayString,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        requests: 0,
        efficiency: 0
      },
      cost: 0
    };
    
    let usageData = [];
    let costsData = [];
    
    try {
      // Buscar dados diretamente da OpenAI
      const { usage, costs } = await fetchTodayCompletionsUsage();
      console.log(`Recebidos ${usage.length} registros de uso e ${costs.length} registros de custos da API da OpenAI`);
      
      // Guardar dados brutos
      usageData = usage;
      costsData = costs;
      
      // Processar os dados da API para extrair informações do dia atual
      const extractedData = extractTodayData(usage, costs);
      if (extractedData) {
        console.log('Dados processados para hoje extraídos com sucesso:', extractedData);
        todayData = extractedData;
      } else {
        console.warn('Não foi possível extrair dados formatados para hoje a partir do uso/completions');
        
        // Mesmo sem poder extrair dados de uso, podemos tentar extrair algum custo
        if (costs.length > 0) {
          // Tentar encontrar um custo para hoje em UTC
          const todayCost = costs.find(cost => {
            const costDate = new Date(cost.bucket.start_time * 1000).toISOString().split('T')[0];
            return costDate === todayString;
          });
          
          if (todayCost) {
            console.log('Encontrado custo para hoje sem dados de uso associados:', todayCost);
            todayData.cost = todayCost.amount.value || 0;
          }
        }
      }
    } catch (openaiError) {
      console.error('Erro ao buscar dados da API da OpenAI:', openaiError);
      // Não lançar exceção, apenas logar o erro e continuar com dados vazios
    }
    
    // Garantir que a data no todayData é a de hoje em UTC
    todayData.date = todayString;
    
    // Calcular estatísticas básicas
    const totalInputTokens = usageData.reduce((sum, item) => sum + (item.input_tokens || 0), 0);
    const totalOutputTokens = usageData.reduce((sum, item) => sum + (item.output_tokens || 0), 0);
    const totalRequests = usageData.reduce((sum, item) => sum + (item.num_model_requests || 0), 0);
    
    // Calcular custo total dos dados brutos
    const totalCost = costsData.reduce((sum, item) => {
      if (item.amount) {
        const value = typeof item.amount.value === 'number' 
          ? item.amount.value 
          : parseFloat(item.amount.value || '0');
        return sum + (isNaN(value) ? 0 : value);
      }
      return sum;
    }, 0);
    
    // Log para diagnóstico
    console.log('Dados finais para retorno da API:');
    console.log('- Dados de hoje:', todayData);
    console.log('- Custo total calculado:', totalCost);
    
    // Retornar resultados com os dados processados para hoje
    return NextResponse.json({
      success: true,
      message: `Dados para hoje (${todayString}) obtidos com sucesso`,
      stats: {
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_requests: totalRequests,
        total_cost: totalCost
      },
      data: usageData,
      costs: costsData, // Incluir também os dados brutos de custos
      todayData: todayData // Incluir os dados processados específicos de hoje
    });
  } catch (error) {
    console.error('Erro ao buscar dados de completions:', error);
    
    // Mesmo em caso de erro, retornar dados vazios para hoje
    const now = new Date();
    const utcNow = new Date(now.getTime());
    const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    
    return NextResponse.json({
      success: true, // Indicar sucesso mesmo com erro para não quebrar o fluxo
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: "Dados padrão para hoje retornados devido a um erro",
      todayData: {
        date: todayString,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          input_cached_tokens: 0,
          requests: 0,
          efficiency: 0
        },
        cost: 0
      },
      data: []
    });
  }
} 