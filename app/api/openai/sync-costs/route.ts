import { NextResponse } from 'next/server';
import { fetchOpenAICosts } from '@/lib/openai-completions-service';

/**
 * Endpoint para obter dados de custos diretamente da OpenAI
 */
export async function POST(request: Request) {
  try {
    // Verificar se a chave de administrador da OpenAI está configurada
    if (!process.env.OPENAI_ADMIN_KEY) {
      console.error('Chave de API de administrador da OpenAI não configurada');
      return NextResponse.json(
        { 
          error: 'Chave de API de administrador da OpenAI não configurada',
          success: false
        },
        { status: 500 }
      );
    }
    
    // Extrair parâmetros da requisição
    let params = { 
      days: 30,
      forceRefresh: false 
    }; // Valor padrão
    
    try {
      const body = await request.json();
      params = { ...params, ...body };
    } catch (e) {
      // Ignorar erros de parsing e usar valores padrão
      console.warn('Não foi possível extrair parâmetros do corpo da requisição, usando valores padrão');
    }
    
    console.log(`Obtendo dados de custos para os últimos ${params.days} dias ${params.forceRefresh ? '(forçando atualização)' : ''}`);
    
    // Buscar dados de custos da OpenAI
    const costData = await fetchOpenAICosts(params.days);
    console.log(`Obtidos ${costData.length} registros de custos da OpenAI`);
    
    // Verificar se obtivemos dados
    if (!costData.length) {
      return NextResponse.json(
        { 
          message: 'Nenhum dado de custo retornado pela API da OpenAI', 
          success: true,
          data: [],
          stats: {
            records_processed: 0
          }
        },
        { status: 200 }
      );
    }
    
    // Processar os dados de custos para um formato mais amigável à UI
    const processedData = processCostsData(costData);
    
    // Log adicional para debug
    console.log("=== SUMÁRIO DE DADOS PROCESSADOS ===");
    console.log(`Total de registros: ${processedData.byDate.length}`);
    console.log(`Custo total: $${processedData.total}`);
    console.log(`Custo últimos 7 dias: $${processedData.last7days}`);
    console.log(`Custo últimos 30 dias: $${processedData.last30days}`);
    
    // Responder com sucesso
    return NextResponse.json({
      message: 'Dados de custos obtidos com sucesso',
      success: true,
      data: processedData,
      raw_data: costData,
      stats: {
        records_processed: costData.length
      }
    });
  } catch (error) {
    console.error('Erro ao obter dados de custos:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao obter dados de custos',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * Processa os dados de custos para um formato adequado para a UI
 */
function processCostsData(costData) {
  if (!costData || !Array.isArray(costData) || costData.length === 0) {
    return {
      byDate: [],
      total: 0,
      last7days: 0,
      last30days: 0
    };
  }
  
  // Diagnóstico detalhado para identificar o problema de fuso horário
  console.log("=== DIAGNÓSTICO DE DADOS DE CUSTO BRUTOS ===");
  costData.forEach(cost => {
    const rawTimestamp = cost.bucket.start_time * 1000;
    const rawDate = new Date(rawTimestamp);
    console.log(`
      Timestamp bruto: ${cost.bucket.start_time}
      Data UTC: ${rawDate.toUTCString()}
      Data Local: ${rawDate.toString()}
      Valor: $${cost.amount.value}
    `);
  });
  
  // Formatar dados para uso na interface
  const byDate = costData.map(cost => {
    // A OpenAI fornece timestamps em UTC, mas os buckets de faturamento podem ter
    // limites diferentes do que esperamos devido a como eles calculam dias de uso
    
    // 1. Obter o timestamp em milissegundos
    const timestamp = cost.bucket.start_time * 1000;
    
    // 2. Criar uma data a partir do timestamp
    const utcDate = new Date(timestamp);
    
    // 3. IMPORTANTE: Ajustar o fuso horário - CORRIGINDO O DESALINHAMENTO
    // A OpenAI registra uso no UTC e o dia de cobrança pode não alinhar com as datas locais
    // Ajustar a data para corresponder ao período de uso real
    const adjustedDate = new Date(utcDate);
    adjustedDate.setDate(adjustedDate.getDate() + 1); // Corrigindo o deslocamento de 1 dia
    
    // 4. Formatar a data no formato YYYY-MM-DD
    const normalizedDate = adjustedDate.toISOString().split('T')[0];
    
    // 5. Log para diagnóstico
    console.log(`Custo processado: timestamp=${timestamp}, data original=${utcDate.toISOString()}, data ajustada=${normalizedDate}, valor=$${cost.amount.value}`);
    
    return {
      date: normalizedDate,
      amount_value: cost.amount.value,
      amount_currency: cost.amount.currency,
      // Adicionar timestamps para diagnóstico
      original_timestamp: timestamp,
      original_date: utcDate.toISOString()
    };
  });
  
  // Log final mostrando o mapeamento claro entre datas e valores
  console.log("=== MAPEAMENTO FINAL DE DATAS E CUSTOS ===");
  const dateValueMap = {};
  byDate.forEach(item => {
    dateValueMap[item.date] = `$${item.amount_value}`;
  });
  console.log(JSON.stringify(dateValueMap, null, 2));
  
  // Calcular custos para diferentes períodos
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0];
  
  let totalCost = 0;
  let last7daysCost = 0;
  let last30daysCost = 0;
  
  byDate.forEach(item => {
    totalCost += parseFloat(item.amount_value);
    
    if (item.date >= sevenDaysAgo) {
      last7daysCost += parseFloat(item.amount_value);
    }
    
    if (item.date >= thirtyDaysAgo) {
      last30daysCost += parseFloat(item.amount_value);
    }
  });
  
  // Arredondar para 2 casas decimais
  totalCost = Math.round(totalCost * 100) / 100;
  last7daysCost = Math.round(last7daysCost * 100) / 100;
  last30daysCost = Math.round(last30daysCost * 100) / 100;
  
  return {
    byDate,
    total: totalCost,
    last7days: last7daysCost,
    last30days: last30daysCost
  };
}

/**
 * Endpoint GET para verificar status
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Use POST para obter dados de custos da OpenAI'
  });
} 