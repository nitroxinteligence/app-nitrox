/**
 * Função auxiliar para fazer fetch com timeout
 * @param url URL para busca
 * @param options Opções do fetch
 * @param timeout Timeout em ms (padrão: 10000ms)
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Timeout ao conectar com a API após ${timeout}ms`);
    }
    throw error;
  }
}

export interface OpenAICompletionUsage {
  start_time: number;
  end_time: number;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  input_audio_tokens: number;
  output_audio_tokens: number;
  num_model_requests: number;
  project_id: string | null;
  user_id: string | null;
  api_key_id: string | null;
  model: string | null;
  batch: any | null;
}

export interface OpenAICompletionResult {
  date: string;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  input_audio_tokens: number;
  output_audio_tokens: number;
  num_model_requests: number;
  model: string | null;
  efficiency: number;
}

/**
 * Busca dados de uso de completions da API da OpenAI
 * @param days Número de dias para buscar (máximo efetivo de 31)
 * @returns Array com os dados de uso
 */
export async function fetchOpenAICompletionsUsage(days = 31): Promise<OpenAICompletionUsage[]> {
  // Verificar se está tentando buscar mais do que 31 dias
  if (days > 31) {
    console.warn(`Solicitados ${days} dias, mas a API da OpenAI limita a 31 dias por requisição com bucket_width=1d. Buscando apenas os últimos 31 dias.`);
  }
  
  // Limitar dias a 31, que é o máximo permitido para bucket_width=1d
  const limitedDays = Math.min(days, 31);
  
  console.log(`Buscando dados de completions para os últimos ${limitedDays} dias, incluindo o dia atual (${new Date().toISOString().split('T')[0]})`);
  
  // Verificar se a chave de API está definida
  if (!process.env.OPENAI_ADMIN_KEY) {
    console.error('OPENAI_ADMIN_KEY não está definida nas variáveis de ambiente');
    throw new Error('Chave de API da OpenAI não configurada (OPENAI_ADMIN_KEY)');
  }
  
  // Usar UTC para alinhamento com o dashboard da OpenAI
  const now = new Date();
  
  // Data de fim: final do dia atual em UTC (23:59:59)
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  
  // Data de início: o início do dia limitedDays para trás em UTC (00:00:00)
  // Isto é exatamente como o dashboard da OpenAI calcula o intervalo de datas
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - limitedDays + 1, 0, 0, 0));
  
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  console.log(`Período da consulta em UTC: ${startDate.toISOString()} até ${endDate.toISOString()}`);
  console.log(`Timestamps: ${startTimestamp} até ${endTimestamp} (diferença de ${endTimestamp - startTimestamp} segundos)`);
  console.log(`Número de dias abrangidos: ${limitedDays}`);
  
  // Configurar parâmetros da requisição para máxima compatibilidade com o dashboard da OpenAI
  // Parâmetros baseados na documentação da API: https://cookbook.openai.com/examples/completions_usage_api
  const usageData: OpenAICompletionUsage[] = [];
  let pageToken = null;
  
  try {
    // Implementar suporte a paginação para obter todos os dados
    while (true) {
      const url = new URL('https://api.openai.com/v1/organization/usage/completions');
      url.searchParams.append('start_time', startTimestamp.toString());
      url.searchParams.append('end_time', endTimestamp.toString());
      url.searchParams.append('bucket_width', '1d'); // Definir granularidade diária
      url.searchParams.append('group_by', 'model'); // Agrupar por modelo para identificar o modelo utilizado
      
      // Adicionar token de paginação se disponível
      if (pageToken) {
        url.searchParams.append('page', pageToken);
      }
      
      // Log da URL sem token
      console.log(`URL da requisição${pageToken ? ' (página '+pageToken+')' : ''}: ${url.toString()} (sem token de autenticação)`);
      
      // Fazer a requisição
      const response = await fetchWithTimeout(url.toString(), {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
          'Content-Type': 'application/json'
        }
      }, 15000); // 15 segundos de timeout
      
      if (!response.ok) {
        let errorText = '';
        try {
          const error = await response.json();
          console.error('Resposta da API com erro:', error);
          errorText = error.error?.message || response.statusText;
        } catch (jsonError) {
          errorText = await response.text();
          console.error('Erro ao parsear resposta como JSON:', errorText);
        }
        
        throw new Error(`Erro ao buscar dados de uso: ${errorText} (Status ${response.status})`);
      }
      
      // Processar resposta
      const data = await response.json();
      
      // Para depuração: verificar a estrutura dos dados retornados
      if (data.data && data.data.length > 0) {
        console.log(`Dados recebidos nesta página: ${data.data.length} buckets`);
      } else {
        console.log('Nenhum dado retornado ou estrutura de dados diferente do esperado nesta página:', data);
      }
      
      // Processar cada "bucket" (período) de dados
      if (data.data && Array.isArray(data.data)) {
        for (const bucket of data.data) {
          if (bucket.results && Array.isArray(bucket.results)) {
            for (const result of bucket.results) {
              usageData.push({
                start_time: bucket.start_time,
                end_time: bucket.end_time,
                input_tokens: result.input_tokens || 0,
                output_tokens: result.output_tokens || 0,
                input_cached_tokens: result.input_cached_tokens || 0,
                input_audio_tokens: result.input_audio_tokens || 0,
                output_audio_tokens: result.output_audio_tokens || 0,
                num_model_requests: result.num_model_requests || 0,
                project_id: result.project_id,
                user_id: result.user_id,
                api_key_id: result.api_key_id,
                model: result.model,
                batch: result.batch
              });
            }
          }
        }
      }
      
      // Verificar se há mais páginas
      pageToken = data.next_page;
      if (!pageToken) {
        break; // Finalizar loop se não houver mais páginas
      }
      
      console.log(`Obtendo próxima página de dados: ${pageToken}`);
    }
    
    console.log(`Total de registros processados: ${usageData.length}`);
    
    // Retornar dados normalizados
    return usageData;
  } catch (error) {
    console.error('Erro ao fazer requisição para a API da OpenAI:', error);
    throw error;
  }
}

/**
 * Interface para dados de custo da OpenAI
 */
export interface OpenAICostResult {
  bucket: {
    start_time: number;
    end_time: number;
  };
  amount: {
    value: number;
    currency: string;
  };
  line_item: string | null;
  project_id: string | null;
  organization_id: string | null;
}

/**
 * Busca dados de custos da API da OpenAI
 * @param days Número de dias para buscar (máximo 30)
 * @returns Array com os dados de custo
 */
export async function fetchOpenAICosts(days = 30): Promise<OpenAICostResult[]> {
  // Verificar se está tentando buscar mais do que 30 dias
  if (days > 30) {
    console.warn(`Solicitados ${days} dias, mas a API da OpenAI limita a 30 dias. Buscando apenas os últimos 30 dias.`);
  }
  
  // Limitar dias a 30
  const limitedDays = Math.min(days, 30);
  
  console.log(`Buscando dados de custos para os últimos ${limitedDays} dias, incluindo o dia atual (${new Date().toISOString().split('T')[0]})`);
  
  // Verificar se a chave de API de admin está configurada
  if (!process.env.OPENAI_ADMIN_KEY) {
    throw new Error('Chave de API de administrador da OpenAI não configurada. Esta chave é necessária para acessar os dados de custos.');
  }
  
  // Usar a mesma abordagem robusta para datas em UTC para alinhamento com o dashboard da OpenAI
  const now = new Date();
  
  // Data de fim: final do dia atual em UTC (23:59:59)
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  
  // CORREÇÃO: Ajustar o cálculo do início do período para corresponder exatamente ao dashboard da OpenAI
  // Para períodos como "últimos 7 dias", o dashboard da OpenAI inclui o dia atual e vai 6 dias para trás
  // Portanto, para days = 7, precisamos ir para (7-1) = 6 dias atrás a partir do início do dia atual
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (limitedDays - 1), 0, 0, 0));
  
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  console.log(`Período da consulta para custos em UTC: ${startDate.toISOString()} até ${endDate.toISOString()}`);
  console.log(`Timestamps: ${startTimestamp} até ${endTimestamp} (diferença de ${endTimestamp - startTimestamp} segundos)`);
  console.log(`Número real de dias abrangidos: ${limitedDays}`);
  
  // Dados normalizados
  const costResults: OpenAICostResult[] = [];
  let pageToken = null;
  
  try {
    // Implementar suporte a paginação para obter todos os dados de custos
    while (true) {
      // Configurar parâmetros da requisição
      const url = new URL('https://api.openai.com/v1/organization/costs');
      url.searchParams.append('start_time', startTimestamp.toString());
      url.searchParams.append('end_time', endTimestamp.toString());
      url.searchParams.append('bucket_width', '1d'); // Definir granularidade diária
      
      // Adicionar token de paginação se disponível
      if (pageToken) {
        url.searchParams.append('page', pageToken);
      }
      
      // Log da URL sem token
      console.log(`URL da requisição de custos${pageToken ? ' (página '+pageToken+')' : ''}: ${url.toString()} (sem token de autenticação)`);
      
      // Fazer a requisição
      const response = await fetchWithTimeout(url.toString(), {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
          'Content-Type': 'application/json'
        }
      }, 15000);
      
      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const error = await response.json();
          console.error('Resposta da API de custos com erro:', error);
          
          // Fornecer mensagem de erro mais detalhada
          if (error.error?.message) {
            errorMessage = error.error.message;
            
            if (errorMessage.includes('insufficient permissions')) {
              errorMessage += '. É necessário utilizar uma API key com permissões de administrador (api.usage.read).';
            }
          }
        } catch (e) {
          // Se não conseguir analisar o JSON, usa a mensagem padrão
          console.error('Não foi possível analisar o erro da API:', e);
        }
        
        throw new Error(`Erro ao buscar dados de custos: ${errorMessage}`);
      }
      
      // Processar resposta
      const data = await response.json();
      
      // Para depuração: verificar a estrutura dos dados retornados
      if (!data.data || !Array.isArray(data.data)) {
        console.warn('Formato de dados de custos inesperado:', data);
        throw new Error('A API da OpenAI retornou dados em um formato inesperado. Verifique os logs para mais detalhes.');
      }
      
      if (data.data.length > 0) {
        console.log(`Dados de custos recebidos nesta página: ${data.data.length} buckets`);
      } else {
        console.log('Nenhum dado de custo retornado para o período solicitado nesta página');
      }
      
      // Processamento melhorado para evitar duplicação
      // Use um mapa para rastrear timestamps já processados
      const processedBuckets = new Map<string, boolean>();
      
      // Processar cada "bucket" (período) de dados
      for (const bucket of data.data) {
        // Verificar se este bucket de tempo já foi processado
        const bucketKey = `${bucket.start_time}`;
        if (processedBuckets.has(bucketKey)) {
          console.log(`Pulando bucket já processado: ${bucketKey}`);
          continue;
        }
        
        // Marcar este bucket como processado
        processedBuckets.set(bucketKey, true);
        
        if (bucket.results && Array.isArray(bucket.results)) {
          for (const result of bucket.results) {
            // Aplicar arredondamento consistente para os valores de custo
            if (result.amount && typeof result.amount.value === 'number') {
              // Arredondar para 2 casas decimais, mesmo padrão do dashboard da OpenAI
              result.amount.value = Math.round(result.amount.value * 100) / 100;
            }
            
            costResults.push({
              bucket: {
                start_time: bucket.start_time,
                end_time: bucket.end_time
              },
              amount: result.amount,
              line_item: result.line_item,
              project_id: result.project_id,
              organization_id: result.organization_id
            });
          }
        }
      }
      
      // Verificar se há mais páginas
      pageToken = data.next_page;
      if (!pageToken) {
        break; // Finalizar loop se não houver mais páginas
      }
      
      console.log(`Obtendo próxima página de dados de custos: ${pageToken}`);
    }
    
    console.log(`Total de registros de custos processados: ${costResults.length}`);
    
    // Ordenar por data (mais recente primeiro)
    costResults.sort((a, b) => b.bucket.start_time - a.bucket.start_time);
    
    // Log para depuração: mostrar o total de custos
    const totalCost = costResults.reduce((sum, item) => {
      if (item.amount && item.amount.value) {
        const value = typeof item.amount.value === 'number' 
          ? item.amount.value 
          : parseFloat(item.amount.value || '0');
        return sum + (isNaN(value) ? 0 : value);
      }
      return sum;
    }, 0);
    
    console.log(`Total de custos para os últimos ${limitedDays} dias: $${totalCost.toFixed(2)}`);
    
    // Retornar dados normalizados
    return costResults;
  } catch (error) {
    console.error('Erro ao buscar dados de custos da OpenAI:', error);
    throw error;
  }
}

/**
 * Calcula a taxa de eficiência (saída / entrada) de tokens
 */
function calculateEfficiency(inputTokens: number, outputTokens: number): number {
  if (!inputTokens) return 0;
  return outputTokens / inputTokens;
}

/**
 * Processa dados do Supabase para formato adequado para visualização
 */
export function processCompletionsData(data: any[]): {
  byDate: any[];
  byModel: any[];
  total: {
    input_tokens: number;
    output_tokens: number;
    input_cached_tokens: number;
    input_audio_tokens: number;
    output_audio_tokens: number;
    requests: number;
    efficiency: number;
  };
} {
  // Verificar se temos dados válidos
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log('Nenhum dado de completions para processar');
    return {
      byDate: [],
      byModel: [],
      total: {
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        input_audio_tokens: 0,
        output_audio_tokens: 0,
        requests: 0,
        efficiency: 0
      }
    };
  }
  
  console.log(`Processando ${data.length} registros da API da OpenAI`);
  
  // Verificando registros únicos por data e bucket de tempo
  const uniqueBuckets = new Map<string, boolean>();
  let duplicateCount = 0;
  
  // Primeiro passo: verificar e registrar possíveis duplicações
  data.forEach(item => {
    const bucketKey = `${item.start_time}-${item.model || 'unknown'}`;
    if (uniqueBuckets.has(bucketKey)) {
      duplicateCount++;
    } else {
      uniqueBuckets.set(bucketKey, true);
    }
  });
  
  if (duplicateCount > 0) {
    console.warn(`⚠️ Detectadas ${duplicateCount} possíveis duplicações nos dados brutos. Processando com cuidado para evitar dupla contagem.`);
  }
  
  // Processar dados por data usando Map para garantir unicidade
  const dateMap = new Map<string, any>();
  
  // Mapa para rastrear buckets já processados por data
  const processedDateBuckets = new Map<string, Set<string>>();
  
  data.forEach(item => {
    // Obter data a partir do timestamp ou do campo date
    const date = item.date || new Date(item.start_time * 1000).toISOString().split('T')[0];
    const bucketKey = `${item.start_time}-${item.model || 'unknown'}`;
    
    // Inicializar o conjunto de buckets processados para esta data, se necessário
    if (!processedDateBuckets.has(date)) {
      processedDateBuckets.set(date, new Set<string>());
    }
    
    // Verificar se este bucket já foi processado para esta data
    const processedBuckets = processedDateBuckets.get(date)!;
    if (processedBuckets.has(bucketKey)) {
      // Já processamos este bucket para esta data, pular
      return;
    }
    
    // Marcar este bucket como processado para esta data
    processedBuckets.add(bucketKey);
    
    // Inicializar o objeto para esta data, se necessário
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        requests: 0
      });
    }
    
    // Atualizar os dados para esta data
    const dateEntry = dateMap.get(date);
    dateEntry.input_tokens += item.input_tokens || 0;
    dateEntry.output_tokens += item.output_tokens || 0;
    dateEntry.input_cached_tokens += item.input_cached_tokens || 0;
    dateEntry.requests += item.num_model_requests || 0;
  });
  
  // Processar dados por modelo usando Map para garantir unicidade
  const modelMap = new Map<string, any>();
  
  // Mapa para rastrear buckets já processados por modelo
  const processedModelBuckets = new Map<string, Set<string>>();
  
  data.forEach(item => {
    const model = item.model || 'desconhecido';
    const bucketKey = `${item.start_time}-${item.model || 'unknown'}`;
    
    // Inicializar o conjunto de buckets processados para este modelo, se necessário
    if (!processedModelBuckets.has(model)) {
      processedModelBuckets.set(model, new Set<string>());
    }
    
    // Verificar se este bucket já foi processado para este modelo
    const processedBuckets = processedModelBuckets.get(model)!;
    if (processedBuckets.has(bucketKey)) {
      // Já processamos este bucket para este modelo, pular
      return;
    }
    
    // Marcar este bucket como processado para este modelo
    processedBuckets.add(bucketKey);
    
    // Inicializar o objeto para este modelo, se necessário
    if (!modelMap.has(model)) {
      modelMap.set(model, {
        name: model,
        input_tokens: 0,
        output_tokens: 0,
        input_cached_tokens: 0,
        requests: 0,
        efficiency: 0
      });
    }
    
    // Atualizar os dados para este modelo
    const modelEntry = modelMap.get(model);
    modelEntry.input_tokens += item.input_tokens || 0;
    modelEntry.output_tokens += item.output_tokens || 0;
    modelEntry.input_cached_tokens += item.input_cached_tokens || 0;
    modelEntry.requests += item.num_model_requests || 0;
  });
  
  // Calcular eficiência para cada modelo
  modelMap.forEach(model => {
    model.efficiency = calculateEfficiency(model.input_tokens, model.output_tokens);
  });
  
  // Calcular totais exatamente como a OpenAI Dashboard
  // Importante: usar os dados já agregados para evitar dupla contagem
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalInputCachedTokens = 0;
  let totalRequests = 0;
  
  // Usar os dados agregados por data
  dateMap.forEach(dateEntry => {
    totalInputTokens += dateEntry.input_tokens;
    totalOutputTokens += dateEntry.output_tokens;
    totalInputCachedTokens += dateEntry.input_cached_tokens;
    totalRequests += dateEntry.requests;
  });
  
  // Verificação cruzada com os dados agregados por modelo
  let modelTotalInputTokens = 0;
  let modelTotalOutputTokens = 0;
  let modelTotalRequests = 0;
  
  modelMap.forEach(modelEntry => {
    modelTotalInputTokens += modelEntry.input_tokens;
    modelTotalOutputTokens += modelEntry.output_tokens;
    modelTotalRequests += modelEntry.requests;
  });
  
  // Se houver discrepância, logar para diagnóstico
  if (
    totalInputTokens !== modelTotalInputTokens || 
    totalOutputTokens !== modelTotalOutputTokens ||
    totalRequests !== modelTotalRequests
  ) {
    console.warn('⚠️ Discrepância nos totais calculados:');
    console.warn(`- Agregados por data: ${totalInputTokens} input, ${totalOutputTokens} output, ${totalRequests} requisições`);
    console.warn(`- Agregados por modelo: ${modelTotalInputTokens} input, ${modelTotalOutputTokens} output, ${modelTotalRequests} requisições`);
    console.warn('Usando os valores agregados por data para correspondência com o dashboard da OpenAI');
  }
  
  const totalEfficiency = calculateEfficiency(totalInputTokens, totalOutputTokens);
  
  // Log para depuração
  console.log(`Totais calculados após eliminação de duplicações: ${totalInputTokens + totalOutputTokens} tokens totais (${totalInputTokens} input, ${totalOutputTokens} output), ${totalRequests} requisições`);
  
  // Ordenar dados por data (mais recente primeiro)
  const byDateArray = Array.from(dateMap.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  // Ordenar dados por modelo (mais usado primeiro)
  const byModelArray = Array.from(modelMap.values()).sort((a, b) => {
    return (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens);
  });
  
  return {
    byDate: byDateArray,
    byModel: byModelArray,
    total: {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      input_cached_tokens: totalInputCachedTokens,
      input_audio_tokens: 0, // Não calculamos explicitamente, mas incluímos no retorno
      output_audio_tokens: 0, // Não calculamos explicitamente, mas incluímos no retorno
      requests: totalRequests,
      efficiency: totalEfficiency
    }
  };
}

/**
 * Busca dados de uso de completions para o dia atual especificamente
 * Isso garante que os dados do dia atual estejam sempre atualizados
 * @returns Dados de uso do dia atual
 */
export async function fetchTodayCompletionsUsage(): Promise<{
  usage: OpenAICompletionUsage[];
  costs: OpenAICostResult[];
}> {
  console.log('Buscando dados específicos do dia atual da API OpenAI');
  
  // Verificar se a chave de API está definida
  if (!process.env.OPENAI_ADMIN_KEY) {
    console.error('OPENAI_ADMIN_KEY não está definida nas variáveis de ambiente');
    throw new Error('Chave de API da OpenAI não configurada (OPENAI_ADMIN_KEY)');
  }
  
  // Usar UTC para garantir alinhamento com a API da OpenAI
  const now = new Date();
  
  // Obter a data em UTC para garantir que estamos buscando o dia correto
  const utcNow = new Date(now.getTime());
  
  // Informar data em UTC e local para diagnóstico
  console.log(`Data atual (local): ${now.toISOString()} / ${now.toString()}`);
  console.log(`Data atual (UTC): ${utcNow.toUTCString()}`);
  
  // CORREÇÃO: Garantir que estamos buscando os dados com a mesma granularidade da OpenAI Dashboard
  // O dashboard da OpenAI mostra dados em UTC com corte à meia-noite
  
  // Timestamps em UTC: início do dia atual (00:00:00) até o momento atual + 1 minuto
  const startOfTodayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 0, 0, 0));
  
  // Adicionamos 1 minuto ao tempo atual para garantir que dados recentes sejam incluídos
  const nowPlusBuffer = new Date(utcNow.getTime() + 60000);
  const endTimestampUTC = Math.floor(nowPlusBuffer.getTime() / 1000);
  
  // Data de hoje em formato ISO para logs e filtragem
  const todayISODate = startOfTodayUTC.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const startTimestamp = Math.floor(startOfTodayUTC.getTime() / 1000);
  
  console.log(`Período da consulta direto: ${startOfTodayUTC.toISOString()} até ${new Date(endTimestampUTC * 1000).toISOString()}`);
  console.log(`Timestamps: ${startTimestamp} até ${endTimestampUTC} (diferença de ${endTimestampUTC - startTimestamp} segundos)`);
  console.log(`Buscando apenas para o dia atual: ${todayISODate}`);
  
  // 1. Buscar dados de uso de completions para hoje
  let usageResponse;
  try {
    const usageUrl = new URL('https://api.openai.com/v1/organization/usage/completions');
    usageUrl.searchParams.append('start_time', startTimestamp.toString());
    usageUrl.searchParams.append('end_time', endTimestampUTC.toString());
    usageUrl.searchParams.append('bucket_width', '1d');
    usageUrl.searchParams.append('group_by', 'model');
    
    console.log(`Buscando dados de completions para hoje: ${todayISODate}`);
    console.log(`URL da requisição: ${usageUrl.toString()} (sem token de autenticação)`);
    
    usageResponse = await fetchWithTimeout(usageUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
        'Content-Type': 'application/json'
      }
    }, 15000);
    
    if (!usageResponse.ok) {
      const errorText = await usageResponse.text();
      console.error(`Resposta da API de uso com erro (${usageResponse.status}): ${errorText}`);
      throw new Error(`Erro ao buscar dados de uso de hoje: ${errorText}`);
    }
  } catch (error) {
    console.error('Erro ao buscar dados de completions do dia atual:', error);
    throw error;
  }
  
  // 2. Buscar dados de custos para hoje
  let costResponse;
  try {
    const costUrl = new URL('https://api.openai.com/v1/organization/costs');
    costUrl.searchParams.append('start_time', startTimestamp.toString());
    costUrl.searchParams.append('end_time', endTimestampUTC.toString());
    costUrl.searchParams.append('bucket_width', '1d');
    
    console.log(`Buscando dados de custos para hoje: ${todayISODate}`);
    console.log(`URL da requisição de custos: ${costUrl.toString()} (sem token de autenticação)`);
    
    costResponse = await fetchWithTimeout(costUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
        'Content-Type': 'application/json'
      }
    }, 15000);
    
    if (!costResponse.ok) {
      const errorText = await costResponse.text();
      console.error(`Resposta da API de custos com erro (${costResponse.status}): ${errorText}`);
      throw new Error(`Erro ao buscar dados de custos de hoje: ${errorText}`);
    }
  } catch (error) {
    console.error('Erro ao buscar dados de custos do dia atual:', error);
    throw error;
  }
  
  // Processar dados de uso
  const usageData = await usageResponse.json();
  const usageResults: OpenAICompletionUsage[] = [];
  
  if (usageData.data && Array.isArray(usageData.data)) {
    for (const bucket of usageData.data) {
      if (bucket.results && Array.isArray(bucket.results)) {
        for (const result of bucket.results) {
          usageResults.push({
            start_time: bucket.start_time,
            end_time: bucket.end_time,
            input_tokens: result.input_tokens || 0,
            output_tokens: result.output_tokens || 0,
            input_cached_tokens: result.input_cached_tokens || 0,
            input_audio_tokens: result.input_audio_tokens || 0,
            output_audio_tokens: result.output_audio_tokens || 0,
            num_model_requests: result.num_model_requests || 0,
            project_id: result.project_id,
            user_id: result.user_id,
            api_key_id: result.api_key_id,
            model: result.model,
            batch: result.batch
          });
        }
      }
    }
  }
  
  // Processar dados de custos
  const costData = await costResponse.json();
  const costResults: OpenAICostResult[] = [];
  
  if (costData.data && Array.isArray(costData.data)) {
    for (const bucket of costData.data) {
      if (bucket.results && Array.isArray(bucket.results)) {
        for (const result of bucket.results) {
          costResults.push({
            bucket: {
              start_time: bucket.start_time,
              end_time: bucket.end_time
            },
            amount: result.amount,
            line_item: result.line_item,
            project_id: result.project_id,
            organization_id: result.organization_id
          });
        }
      }
    }
  }
  
  console.log(`Obtidos ${usageResults.length} registros de uso e ${costResults.length} registros de custos para hoje`);
  
  return {
    usage: usageResults,
    costs: costResults
  };
}

/**
 * Estima a quantidade de tokens com base no custo
 * Usado quando a API retorna custos mas não retorna dados de uso
 * @param cost Valor do custo em dólares
 * @param modelType Tipo do modelo (padrão: gpt-4)
 * @returns Estimativa de tokens de entrada e saída
 */
export function estimateTokensFromCost(cost: number, modelType: string = 'gpt-4'): {
  input_tokens: number;
  output_tokens: number;
} {
  // Preços aproximados por 1000 tokens (em USD)
  // Fonte: https://openai.com/pricing
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },           // GPT-4 Turbo
    'gpt-4-turbo': { input: 0.01, output: 0.03 },     // GPT-4 Turbo
    'gpt-4-vision': { input: 0.01, output: 0.03 },    // GPT-4 Vision
    'gpt-4-32k': { input: 0.06, output: 0.12 },       // GPT-4 32k
    'gpt-3.5': { input: 0.001, output: 0.002 },       // GPT-3.5 Turbo
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 }, // GPT-3.5 Turbo
    'text-embedding': { input: 0.0001, output: 0 },   // Embedding models
    'dall-e': { input: 0.02, output: 0 },             // DALL-E (por imagem, estimativa)
    'whisper': { input: 0.006, output: 0 },           // Whisper (por minuto, estimativa)
  };
  
  // Determinar qual modelo usar para a estimativa
  let model = 'gpt-4';
  
  // Verificar se o tipo de modelo está na lista de preços
  if (modelType) {
    const lowerModelType = modelType.toLowerCase();
    for (const key of Object.keys(pricing)) {
      if (lowerModelType.includes(key.toLowerCase())) {
        model = key;
        break;
      }
    }
  }
  
  // Usar os preços do modelo correspondente
  const { input: inputPrice, output: outputPrice } = pricing[model];
  
  // Assumir uma distribuição de 50/50 entre tokens de entrada e saída se ambos tiverem preço
  // Se apenas entrada tiver preço (como embedding), atribuir 100% à entrada
  let inputTokens = 0;
  let outputTokens = 0;
  
  if (inputPrice > 0 && outputPrice > 0) {
    // Distribuição 50/50 do custo total entre entrada e saída
    const inputCost = cost * 0.5;
    const outputCost = cost * 0.5;
    
    // Calcular tokens com base nos preços por 1000 tokens
    inputTokens = Math.round((inputCost / inputPrice) * 1000);
    outputTokens = Math.round((outputCost / outputPrice) * 1000);
  } else if (inputPrice > 0) {
    // Tudo para entrada (modelos como embedding)
    inputTokens = Math.round((cost / inputPrice) * 1000);
  } else if (outputPrice > 0) {
    // Caso improvável mas possível
    outputTokens = Math.round((cost / outputPrice) * 1000);
  }
  
  console.log(`Estimativa de tokens baseada em custo $${cost.toFixed(4)} para modelo ${model}: ${inputTokens} entrada, ${outputTokens} saída`);
  
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens
  };
}

/**
 * Extrai os dados específicos do dia atual a partir dos dados brutos da API
 * @param usageData Dados brutos de uso
 * @param costData Dados brutos de custos
 * @returns Dados processados para o dia atual
 */
export function extractTodayData(usageData: OpenAICompletionUsage[], costData: OpenAICostResult[]) {
  // Usar UTC para alinhamento com a API da OpenAI
  const now = new Date();
  const utcNow = new Date(now.getTime());
  
  // Criar data de hoje em UTC - início do dia UTC
  const todayUTC = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 0, 0, 0));
  
  // Timestamp do início do dia atual em UTC
  const todayTimestamp = Math.floor(todayUTC.getTime() / 1000);
  const todayISODate = todayUTC.toISOString().split('T')[0]; // YYYY-MM-DD
  
  console.log(`Extraindo dados para hoje em UTC (${todayISODate}, timestamp: ${todayTimestamp})`);
  console.log(`Data atual (local): ${now.toISOString().split('T')[0]} / Data UTC: ${todayISODate}`);
  
  // Garantir que os dados de entrada sejam arrays e nunca undefined
  const safeUsageData = Array.isArray(usageData) ? usageData : [];
  const safeCostData = Array.isArray(costData) ? costData : [];
  
  if (safeUsageData.length === 0) {
    console.warn('⚠️ Não há dados de uso disponíveis para extrair');
  }
  
  if (safeCostData.length === 0) {
    console.warn('⚠️ Não há dados de custo disponíveis para extrair');
  }
  
  // Depurar dados recebidos para diagnóstico
  safeUsageData.forEach((item, index) => {
    const itemDate = new Date(item.start_time * 1000).toISOString().split('T')[0];
    console.log(`Registro de uso ${index}: data=${itemDate}, requests=${item.num_model_requests || 0}, model=${item.model || 'unknown'}`);
  });
  
  // Usar todos os dados recebidos, eles já devem estar filtrados para hoje pela API
  console.log(`Processando ${safeUsageData.length} registros de uso e ${safeCostData.length} registros de custo`);
  
  // Calcular totais de uso com verificações de segurança
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalInputCachedTokens = 0;
  let totalRequests = 0;
  
  // Se há dados de uso, calcular a partir deles
  if (safeUsageData.length > 0) {
    safeUsageData.forEach(item => {
      totalInputTokens += typeof item.input_tokens === 'number' ? item.input_tokens : 0;
      totalOutputTokens += typeof item.output_tokens === 'number' ? item.output_tokens : 0;
      totalInputCachedTokens += typeof item.input_cached_tokens === 'number' ? item.input_cached_tokens : 0;
      totalRequests += typeof item.num_model_requests === 'number' ? item.num_model_requests : 0;
    });
  }
  
  // Calcular custos totais com verificações de segurança
  let totalCost = 0;
  let modelHint = ''; // Para detectar qual modelo está sendo usado
  
  safeCostData.forEach((item, index) => {
    const itemDate = new Date(item.bucket.start_time * 1000).toISOString().split('T')[0];
    console.log(`Registro de custo ${index}: data=${itemDate}, valor=${item.amount?.value || 0} ${item.amount?.currency || 'USD'}`);
    
    if (item.amount) {
      if (typeof item.amount.value === 'number') {
        totalCost += item.amount.value;
      } else if (typeof item.amount.value === 'string') {
        const parsedValue = parseFloat(item.amount.value);
        if (!isNaN(parsedValue)) {
          totalCost += parsedValue;
        }
      }
      
      // Tentar identificar o modelo a partir do line_item
      if (item.line_item) {
        modelHint = item.line_item;
      }
    }
  });
  
  // Arredondar custo para dois decimais como no dashboard da OpenAI
  totalCost = Math.round(totalCost * 100) / 100;
  
  console.log(`Totais para hoje: ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens, ${totalRequests} requisições, $${totalCost.toFixed(2)} custo`);
  
  return {
    date: todayISODate,
    usage: {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      input_cached_tokens: totalInputCachedTokens,
      requests: totalRequests,
      efficiency: calculateEfficiency(totalInputTokens, totalOutputTokens)
    },
    cost: totalCost
  };
}