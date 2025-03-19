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
  
  // IMPORTANTE: Para garantir que a data do dia atual seja SEMPRE incluída,
  // vamos definir o final do período para o momento atual com um buffer de 1 hora
  const bufferMs = 60 * 60 * 1000; // 1 hora em milissegundos
  const endDateTime = new Date(now.getTime() + bufferMs);
  
  // Data de fim: timestamp atual + buffer em UTC
  const endDate = new Date(
    Date.UTC(
      endDateTime.getUTCFullYear(),
      endDateTime.getUTCMonth(),
      endDateTime.getUTCDate(),
      endDateTime.getUTCHours(),
      endDateTime.getUTCMinutes(),
      endDateTime.getUTCSeconds()
    )
  );
  
  // Data de início: início do dia a exatos (limitedDays-1) dias atrás do hoje em UTC
  // O dashboard da OpenAI inclui o dia atual e conta (n-1) dias para trás
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (limitedDays - 1), 0, 0, 0));
  
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
      
      // Fazer a requisição com retry automático em caso de falha temporária
      let retries = 0;
      const maxRetries = 3;
      let response: Response | undefined;
      
      while (retries < maxRetries) {
        try {
          response = await fetchWithTimeout(url.toString(), {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
      'Content-Type': 'application/json'
    }
          }, 20000); // 20 segundos de timeout para permitir respostas com muitos dados
          
          if (response.ok) break; // Saímos do loop se a resposta for bem-sucedida
          
          // Se o erro for 429 (Too Many Requests) ou 5xx (erro de servidor), retentamos
          if (response.status === 429 || response.status >= 500) {
            retries++;
            const delay = Math.pow(2, retries) * 1000; // Backoff exponencial
            console.warn(`Erro ${response.status} ao buscar dados da API. Tentativa ${retries}/${maxRetries}. Aguardando ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Para outros erros, não tentamos novamente
            break;
          }
        } catch (error) {
          // Erro de rede ou timeout
          retries++;
          const delay = Math.pow(2, retries) * 1000;
          console.warn(`Erro de rede ao buscar dados. Tentativa ${retries}/${maxRetries}. Aguardando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          if (retries >= maxRetries) {
            throw error; // Propagar o erro após máximo de tentativas
          }
        }
      }
      
      // Se após as tentativas ainda não temos uma resposta válida
      if (!response) {
        throw new Error('Falha na comunicação com a API da OpenAI após múltiplas tentativas');
  }
  
  // Processar resposta
  const data = await response.json();
  
  // Para depuração: verificar a estrutura dos dados retornados
  if (data.data && data.data.length > 0) {
        console.log(`Dados recebidos nesta página: ${data.data.length} buckets`);
        
        // Resumo dos dados para diagnóstico
        let totalInputTokensInPage = 0;
        let totalOutputTokensInPage = 0;
        let totalRequestsInPage = 0;
  
  // Processar cada "bucket" (período) de dados
  if (data.data && Array.isArray(data.data)) {
    for (const bucket of data.data) {
            const bucketDate = new Date(bucket.start_time * 1000);
            const bucketDateStr = bucketDate.toISOString().split('T')[0];
            
            console.log(`Processando bucket para data: ${bucketDateStr} (timestamp: ${bucket.start_time})`);
            
      if (bucket.results && Array.isArray(bucket.results)) {
              console.log(`  Encontrados ${bucket.results.length} resultados neste bucket`);
              
        for (const result of bucket.results) {
                // Log detalhado para diagnóstico
                console.log(`  Modelo: ${result.model || 'N/A'}, Input: ${result.input_tokens || 0}, Output: ${result.output_tokens || 0}, Reqs: ${result.num_model_requests || 0}`);
                
                // Somar para diagnóstico
                totalInputTokensInPage += result.input_tokens || 0;
                totalOutputTokensInPage += result.output_tokens || 0;
                totalRequestsInPage += result.num_model_requests || 0;
                
                // Adicionar ao array de resultados
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
      } else {
              console.log(`  Nenhum resultado encontrado neste bucket`);
      }
    }
        }
        
        // Resumo dos dados na página atual
        console.log(`Resumo desta página: ${totalInputTokensInPage} input tokens, ${totalOutputTokensInPage} output tokens, ${totalRequestsInPage} requisições`);
  } else {
        console.log('Nenhum dado recebido nesta página ou estrutura de dados não suportada');
      }
      
      // Verificar se há mais páginas
      pageToken = data.next_page;
      if (!pageToken) {
        break; // Finalizar loop se não houver mais páginas
      }
      
      console.log(`Obtendo próxima página de dados: ${pageToken}`);
    }
    
    console.log(`Total de registros processados: ${usageData.length}`);
    
    // Resumo dos dados totais para diagnóstico
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalRequests = 0;
    
    usageData.forEach(item => {
      totalInputTokens += item.input_tokens || 0;
      totalOutputTokens += item.output_tokens || 0;
      totalRequests += item.num_model_requests || 0;
    });
    
    console.log(`Resumo final: ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens, ${totalRequests} requisições`);
    
    // Ordenar por data (mais recente primeiro) para facilitar manipulação posterior
    usageData.sort((a, b) => b.start_time - a.start_time);
    
  return usageData;
  } catch (error) {
    console.error('Erro ao buscar dados de uso da OpenAI:', error);
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
  // Campo adicional para facilitar filtragem por data
  date_iso?: string;
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
  
  // Usar UTC para alinhamento com o dashboard da OpenAI
  const now = new Date();
  
  // *** CORREÇÃO: Para evitar o erro "end_date must come after start_date" ***
  // A API de custos da OpenAI com bucket_width=1d exige que os timestamps estejam em dias diferentes
  // Vamos garantir um período mínimo de 2 dias para evitar esse erro
  
  // Data de fim: final do dia atual em UTC (23:59:59)
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  
  // Data de início: Sempre pelo menos 1 dia completo antes do fim
  // Para períodos solicitados de 1 dia, pegamos sempre 2 dias (ontem e hoje)
  // Para períodos maiores, usamos (limitedDays - 1) dias antes do hoje
  const minDays = Math.max(2, limitedDays);
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (minDays - 1), 0, 0, 0));
  
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  console.log(`Período da consulta para custos em UTC: ${startDate.toISOString()} até ${endDate.toISOString()}`);
  console.log(`Timestamps: ${startTimestamp} até ${endTimestamp} (diferença de ${endTimestamp - startTimestamp} segundos)`);
  console.log(`Número real de dias abrangidos: ${minDays}`);
  
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
  
      // Fazer a requisição com retry automático para maior robustez
      let retries = 0;
      const maxRetries = 3;
      let response: Response | undefined;
      
      while (retries < maxRetries) {
        try {
          response = await fetchWithTimeout(url.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
        'Content-Type': 'application/json'
      }
          }, 20000); // 20 segundos de timeout
          
          if (response.ok) break; // Saímos do loop se a resposta for bem-sucedida
          
          // Log detalhado do erro para diagnóstico
          console.warn(`Tentativa ${retries + 1}/${maxRetries}: Erro ${response.status} ao buscar dados de custos`);
          
          // Se o erro for 429 (Too Many Requests) ou 5xx (erro de servidor), retentamos
          if (response.status === 429 || response.status >= 500) {
            retries++;
            const delay = Math.pow(2, retries) * 1000; // Backoff exponencial
            console.warn(`Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Para erros específicos, damos tratamento especial
            if (response.status === 400) {
              const errorBody = await response.text();
              console.error('Erro 400 detalhado:', errorBody);
              
              // Se for o erro de end_date/start_date, ajustamos os parâmetros e retentamos
              if (errorBody.includes('end_date must come after start_date')) {
                console.warn('Detectado erro de end_date/start_date. Ajustando período para garantir diferença entre datas...');
                
                // Modificar a estratégia - usar ontem e anteontem como período
                const yesterdayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999));
                const dayBeforeYesterdayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2, 0, 0, 0));
                
                const newStartTimestamp = Math.floor(dayBeforeYesterdayStart.getTime() / 1000);
                const newEndTimestamp = Math.floor(yesterdayEnd.getTime() / 1000);
                
                console.log(`Ajustando período para: ${dayBeforeYesterdayStart.toISOString()} até ${yesterdayEnd.toISOString()}`);
                console.log(`Novos timestamps: ${newStartTimestamp} até ${newEndTimestamp}`);
                
                // Reconstruir a URL com os novos parâmetros
                url.searchParams.set('start_time', newStartTimestamp.toString());
                url.searchParams.set('end_time', newEndTimestamp.toString());
                
                // Tentar novamente com os novos parâmetros
                retries++;
                continue;
              }
            }
            
            // Para outros erros, não tentamos novamente
            break;
          }
  } catch (error) {
          // Erro de rede ou timeout
          retries++;
          if (retries >= maxRetries) {
            console.error('Erro após todas as tentativas:', error);
            throw error; // Propagar o erro após máximo de tentativas
          }
          
          const delay = Math.pow(2, retries) * 1000;
          console.warn(`Erro de rede/timeout. Tentativa ${retries}/${maxRetries}. Aguardando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Se após as tentativas ainda não temos uma resposta válida
      if (!response) {
        throw new Error('Falha na comunicação com a API da OpenAI após múltiplas tentativas');
  }
  
  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
    
    try {
          // Tentar extrair mensagem de erro detalhada
          const responseText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            // Se não for JSON válido, usamos o texto bruto
            errorData = { error: { message: responseText } };
          }
          
          console.error('Resposta da API de custos com erro:', errorData);
      
      // Fornecer mensagem de erro mais detalhada
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
        
        if (errorMessage.includes('insufficient permissions')) {
          errorMessage += '. É necessário utilizar uma API key com permissões de administrador (api.usage.read).';
        }
      }
    } catch (e) {
          // Se não conseguir analisar o erro, usa a mensagem padrão
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
        
        // Log detalhado para diagnóstico
        let totalCostInPage = 0;
        data.data.forEach((bucket: any, index: number) => {
          const bucketDate = new Date(bucket.start_time * 1000);
          const dateStr = bucketDate.toISOString().split('T')[0];
          
          if (bucket.results && bucket.results.length > 0) {
            let bucketTotal = 0;
            bucket.results.forEach((result: any) => {
              if (result.amount && result.amount.value) {
                const value = typeof result.amount.value === 'number' 
                  ? result.amount.value 
                  : parseFloat(result.amount.value || '0');
                bucketTotal += isNaN(value) ? 0 : value;
              }
            });
            
            console.log(`  Bucket ${index} (${dateStr}): ${bucket.results.length} resultados, total $${bucketTotal.toFixed(4)}`);
            totalCostInPage += bucketTotal;
  } else {
            console.log(`  Bucket ${index} (${dateStr}): sem resultados`);
          }
        });
        
        console.log(`Total de custos nesta página: $${totalCostInPage.toFixed(4)}`);
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
          // Para diagnóstico
          const bucketDate = new Date(bucket.start_time * 1000);
          const dateStr = bucketDate.toISOString().split('T')[0];
          
      for (const result of bucket.results) {
            // Aplicar arredondamento consistente para os valores de custo
            if (result.amount && typeof result.amount.value === 'number') {
              // Armazenar com toda a precisão, arredondar apenas na exibição
              // Isso evita erros de arredondamento nos cálculos agregados
              result.amount.value = result.amount.value;
            }
            
            // Adicionando metadados úteis para filtros posteriores
            const resultWithDate = {
              ...result,
              // Adicionar a data no formato ISO para facilitar filtros posteriores
              date_iso: dateStr
            };
            
        costResults.push({
          bucket: {
            start_time: bucket.start_time,
            end_time: bucket.end_time
          },
          amount: result.amount,
          line_item: result.line_item,
          project_id: result.project_id,
              organization_id: result.organization_id,
              // Incluir o metadado adicional
              date_iso: dateStr
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
    
    // Calcular custos dos últimos 7 dias para referência
    // Usar UTC para consistência com a API da OpenAI
    const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0));
    const sevenDaysAgoTimestamp = Math.floor(sevenDaysAgo.getTime() / 1000);
    
    const last7DaysCost = costResults.reduce((sum, item) => {
      if (item.bucket.start_time >= sevenDaysAgoTimestamp && item.amount && item.amount.value) {
        const value = typeof item.amount.value === 'number' 
          ? item.amount.value 
          : parseFloat(item.amount.value || '0');
        return sum + (isNaN(value) ? 0 : value);
      }
      return sum;
    }, 0);
    
    // Log detalhado dos custos com quebra por período para referência cruzada com o dashboard
    console.log(`Custos por período:`);
    console.log(`- Total de todos os custos recuperados: $${totalCost.toFixed(4)}`);
    console.log(`- Últimos 7 dias (${sevenDaysAgo.toISOString().split('T')[0]} até hoje): $${last7DaysCost.toFixed(4)}`);
  
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
  
  // Passo 1: Identifique buckets únicos para evitar duplicação
  // Para cada bucket (dia), queremos ter certeza de que contamos cada modelo apenas uma vez
  // Criamos um Map onde a chave é uma combinação de timestamp e modelo
  const uniqueData = new Map<string, any>();
  
  data.forEach(item => {
    // Se o item não tiver timestamps, não podemos processar corretamente
    if (typeof item.start_time !== 'number') {
      console.warn('Item sem timestamp válido, ignorando:', item);
      return;
    }
    
    const bucketDate = new Date(item.start_time * 1000);
    const dateKey = bucketDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const modelKey = item.model || 'unknown';
    const uniqueKey = `${dateKey}:${modelKey}`;
    
    // Se já temos este modelo para esta data, vamos verificar e possivelmente atualizar
    if (uniqueData.has(uniqueKey)) {
      const existing = uniqueData.get(uniqueKey);
      
      // Se o item atual tem timestamp mais recente, substituímos o existente
      if (item.end_time > existing.end_time) {
        uniqueData.set(uniqueKey, item);
      }
    } else {
      // Caso contrário, adicionamos este item ao mapa
      uniqueData.set(uniqueKey, item);
    }
  });
  
  console.log(`Após remoção de possíveis duplicações: ${uniqueData.size} registros únicos (de ${data.length} originais)`);
  
  // Passo 2: Processar dados por data com base no conjunto sem duplicação
  const dateMap = new Map<string, any>();
  
  uniqueData.forEach((item, key) => {
    const bucketDate = new Date(item.start_time * 1000);
    const date = bucketDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
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
    
    // Atualizar os dados para esta data com verificação rigorosa de tipos
    const dateEntry = dateMap.get(date);
    dateEntry.input_tokens += typeof item.input_tokens === 'number' ? item.input_tokens : 0;
    dateEntry.output_tokens += typeof item.output_tokens === 'number' ? item.output_tokens : 0;
    dateEntry.input_cached_tokens += typeof item.input_cached_tokens === 'number' ? item.input_cached_tokens : 0;
    dateEntry.requests += typeof item.num_model_requests === 'number' ? item.num_model_requests : 0;
  });
  
  // Passo 3: Processar dados por modelo sem duplicação
  const modelMap = new Map<string, any>();
  
  uniqueData.forEach((item, key) => {
    const model = item.model || 'desconhecido';
    
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
    
    // Atualizar os dados para este modelo com verificação rigorosa de tipos
    const modelEntry = modelMap.get(model);
    modelEntry.input_tokens += typeof item.input_tokens === 'number' ? item.input_tokens : 0;
    modelEntry.output_tokens += typeof item.output_tokens === 'number' ? item.output_tokens : 0;
    modelEntry.input_cached_tokens += typeof item.input_cached_tokens === 'number' ? item.input_cached_tokens : 0;
    modelEntry.requests += typeof item.num_model_requests === 'number' ? item.num_model_requests : 0;
  });
  
  // Calcular eficiência para cada modelo
  modelMap.forEach(model => {
    model.efficiency = calculateEfficiency(model.input_tokens, model.output_tokens);
  });
  
  // Passo 4: Calcular totais a partir dos dados por data (mais confiável para o dashboard da OpenAI)
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalInputCachedTokens = 0;
  let totalRequests = 0;
  
  dateMap.forEach(dateEntry => {
    totalInputTokens += dateEntry.input_tokens;
    totalOutputTokens += dateEntry.output_tokens;
    totalInputCachedTokens += dateEntry.input_cached_tokens;
    totalRequests += dateEntry.requests;
  });
  
  // Verificação cruzada com os dados por modelo para validação
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
  console.log(`Totais calculados: ${totalInputTokens.toLocaleString()} input tokens, ${totalOutputTokens.toLocaleString()} output tokens (${(totalInputTokens + totalOutputTokens).toLocaleString()} total), ${totalRequests} requisições`);
  
  // Ordenar dados por data (mais recente primeiro)
  const byDateArray = Array.from(dateMap.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  // Ordenar dados por modelo (mais usado primeiro - por total de tokens, não apenas entrada)
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
      input_audio_tokens: 0, // Definimos como 0 pois não estamos atualmente processando tokens de áudio
      output_audio_tokens: 0, // Definimos como 0 pois não estamos atualmente processando tokens de áudio
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
  
  // Obter a data atual em UTC
  const now = new Date();
  
  // Calcular o início do dia atual em UTC
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  
  // Para evitar problemas com dados muito recentes, adicionar um buffer ao horário final
  const bufferMs = 60 * 60 * 1000; // 1 hora em milissegundos
  const endDateTime = new Date(now.getTime() + bufferMs);
  const endTimestampUTC = Math.floor(endDateTime.getTime() / 1000);
  
  // Data de hoje em formato ISO para logs e filtragem
  const todayISODate = startOfTodayUTC.toISOString().split('T')[0]; // YYYY-MM-DD
  
  console.log(`Data atual (local): ${now.toLocaleString()}`);
  console.log(`Data atual (UTC): ${now.toUTCString()}`);
  console.log(`Data ISO de hoje: ${todayISODate}`);
  
  // CORREÇÃO IMPORTANTE: Para garantir que pegamos apenas os dados de hoje
  // 1. Buscar apenas o dia de hoje em vez de ontem + hoje
  const startTimestamp = Math.floor(startOfTodayUTC.getTime() / 1000);
  
  console.log(`Consulta específica para hoje: ${startOfTodayUTC.toISOString()} até ${endDateTime.toISOString()}`);
  console.log(`Timestamps: ${startTimestamp} até ${endTimestampUTC} (diferença de ${endTimestampUTC - startTimestamp} segundos)`);
  
  // 1. Buscar dados de uso de completions para hoje
  let usageResponse;
  try {
    const usageUrl = new URL('https://api.openai.com/v1/organization/usage/completions');
    usageUrl.searchParams.append('start_time', startTimestamp.toString());
    usageUrl.searchParams.append('end_time', endTimestampUTC.toString());
    usageUrl.searchParams.append('bucket_width', '1d');
    usageUrl.searchParams.append('group_by', 'model');
    
    console.log(`URL da requisição: ${usageUrl.toString()} (sem token de autenticação)`);
    
    usageResponse = await fetchWithTimeout(usageUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
        'Content-Type': 'application/json'
      }
    }, 20000);
    
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
    
    console.log(`URL da requisição de custos: ${costUrl.toString()} (sem token de autenticação)`);
    
    costResponse = await fetchWithTimeout(costUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_ADMIN_KEY}`,
        'Content-Type': 'application/json'
      }
    }, 20000);
    
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
    console.log(`Recebidos ${usageData.data.length} buckets de uso da API`);
    
    for (const bucket of usageData.data) {
      const bucketDateUTC = new Date(bucket.start_time * 1000);
      const bucketDateStr = bucketDateUTC.toISOString().split('T')[0];
      
      console.log(`Processando bucket para data ${bucketDateStr} (timestamp: ${bucket.start_time})`);
      
      // IMPORTANTE: Verificar explicitamente se este bucket é para hoje
      if (bucketDateStr !== todayISODate) {
        console.log(`Ignorando bucket que não é de hoje: ${bucketDateStr} != ${todayISODate}`);
            continue;
          }
          
      if (bucket.results && Array.isArray(bucket.results)) {
        console.log(`  Encontrados ${bucket.results.length} resultados neste bucket`);
        
        for (const result of bucket.results) {
          // Log detalhado para diagnóstico
          console.log(`  Modelo: ${result.model || 'N/A'}, Input: ${result.input_tokens || 0}, Output: ${result.output_tokens || 0}, Reqs: ${result.num_model_requests || 0}`);
          
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
      } else {
        console.log(`  Nenhum resultado encontrado neste bucket`);
      }
    }
  } else {
    console.warn('API retornou um formato inesperado ou sem dados para uso');
  }
  
  // Processar dados de custos
  const costData = await costResponse.json();
  const costResults: OpenAICostResult[] = [];
  
  if (costData.data && Array.isArray(costData.data)) {
    console.log(`Recebidos ${costData.data.length} buckets de custos da API`);
    
    for (const bucket of costData.data) {
      const bucketDateUTC = new Date(bucket.start_time * 1000);
      const bucketDateStr = bucketDateUTC.toISOString().split('T')[0];
      
      console.log(`Processando bucket de custo para data ${bucketDateStr} (timestamp: ${bucket.start_time})`);
      
      // IMPORTANTE: Verificar explicitamente se este bucket é para hoje
      if (bucketDateStr !== todayISODate) {
        console.log(`Ignorando bucket de custo que não é de hoje: ${bucketDateStr} != ${todayISODate}`);
        continue;
      }
      
      if (bucket.results && Array.isArray(bucket.results)) {
        console.log(`  Encontrados ${bucket.results.length} resultados de custo neste bucket`);
        
        for (const result of bucket.results) {
          // Log para diagnóstico
          console.log(`  Item: ${result.line_item || 'N/A'}, Valor: $${result.amount?.value || 0} ${result.amount?.currency || 'USD'}`);
          
          costResults.push({
            bucket: {
              start_time: bucket.start_time,
              end_time: bucket.end_time
            },
            amount: result.amount,
            line_item: result.line_item,
            project_id: result.project_id,
            organization_id: result.organization_id,
            date_iso: bucketDateStr // Adicionando a data ISO para facilitar filtragem posterior
          });
        }
        } else {
        console.log(`  Nenhum resultado de custo encontrado neste bucket`);
      }
    }
  } else {
    console.warn('API retornou um formato inesperado ou sem dados para custos');
  }
  
  // Resumo para diagnóstico
  console.log(`Dados extraídos para hoje (${todayISODate}):`);
  console.log(`- Total de registros de uso: ${usageResults.length}`);
  console.log(`- Total de registros de custo: ${costResults.length}`);
  
  // Calcular totais para o log
  let totalInputTokens = 0;
  let totalOutputTokens = 0; 
  let totalRequests = 0;
  let totalCost = 0;
  
  usageResults.forEach(item => {
    totalInputTokens += item.input_tokens || 0;
    totalOutputTokens += item.output_tokens || 0;
    totalRequests += item.num_model_requests || 0;
  });
  
  costResults.forEach(item => {
    if (item.amount && typeof item.amount.value === 'number') {
      totalCost += item.amount.value;
    }
  });
  
  console.log(`Resumo do dia atual: ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens, ${totalRequests} requisições, $${totalCost.toFixed(4)} custo`);
  
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
  
  // Criar data de hoje em UTC - início do dia UTC
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  
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
  console.log("=== TODOS OS DADOS DE USO RECEBIDOS ===");
  safeUsageData.forEach((item, index) => {
    const itemDate = new Date(item.start_time * 1000).toISOString().split('T')[0];
    console.log(`Registro de uso ${index}: data=${itemDate}, requests=${item.num_model_requests || 0}, model=${item.model || 'unknown'}`);
  });
  
  // IMPORTANTE: Filtrar corretamente apenas os dados do dia atual
  // Comparar as datas ISO para garantir que estamos pegando apenas dados de hoje
  const todayUsageData = safeUsageData.filter(item => {
    const itemDate = new Date(item.start_time * 1000).toISOString().split('T')[0];
    const isToday = itemDate === todayISODate;
    console.log(`Item com data ${itemDate} ${isToday ? 'É' : 'NÃO É'} de hoje (${todayISODate})`);
    return isToday;
  });
  
  const todayCostData = safeCostData.filter(item => {
    // Usar o campo date_iso se disponível, ou calcular a partir do timestamp
    const itemDate = item.date_iso || new Date(item.bucket.start_time * 1000).toISOString().split('T')[0];
    return itemDate === todayISODate;
  });
  
  console.log(`Após filtro por data: ${todayUsageData.length} registros de uso e ${todayCostData.length} registros de custo para hoje`);
  
  // Calcular totais de uso com verificações de segurança
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalInputCachedTokens = 0;
  let totalRequests = 0;
  
  // Se há dados de uso para hoje, calcular a partir deles
  if (todayUsageData.length > 0) {
    todayUsageData.forEach(item => {
      totalInputTokens += typeof item.input_tokens === 'number' ? item.input_tokens : 0;
      totalOutputTokens += typeof item.output_tokens === 'number' ? item.output_tokens : 0;
      totalInputCachedTokens += typeof item.input_cached_tokens === 'number' ? item.input_cached_tokens : 0;
      totalRequests += typeof item.num_model_requests === 'number' ? item.num_model_requests : 0;
    });
  }
  
  // Calcular custos totais com verificações de segurança
  let totalCost = 0;
  let modelHint = ''; // Para detectar qual modelo está sendo usado
  
  todayCostData.forEach((item, index) => {
    const itemDate = item.date_iso || new Date(item.bucket.start_time * 1000).toISOString().split('T')[0];
    console.log(`Registro de custo ${index} para hoje: data=${itemDate}, valor=${item.amount?.value || 0} ${item.amount?.currency || 'USD'}`);
    
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
  
  console.log(`Totais para hoje (${todayISODate}): ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens, ${totalRequests} requisições, $${totalCost.toFixed(2)} custo`);

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