import { NextResponse } from 'next/server';

/**
 * API para contar execuções de workflows do n8n
 * Permite filtrar por data para contar execuções diárias
 * Suporta contagem ilimitada através do parâmetro noLimit=true
 */
export async function GET(request: Request) {
  try {
    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const date = searchParams.get('date'); // Formato esperado: YYYY-MM-DD
    const noLimit = searchParams.get('noLimit') === 'true'; // Indica se deve buscar todas sem limite
    
    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId é um parâmetro obrigatório' },
        { status: 400 }
      );
    }
    
    console.log(`Contando execuções para workflow ${workflowId}${date ? ` na data ${date}` : ''}${noLimit ? ' (SEM LIMITE)' : ''}`);
    
    // Configurações para API do n8n
    const n8nApiUrl = process.env.NEXT_PUBLIC_N8N_API_URL || '';
    const n8nApiKey = process.env.NEXT_PUBLIC_N8N_API_KEY || '';
    
    if (!n8nApiUrl || !n8nApiKey) {
      return NextResponse.json(
        { error: 'Configuração do n8n ausente' },
        { status: 500 }
      );
    }
    
    // Se não tiver limite, usar abordagem de paginação para obter todas as execuções
    if (noLimit) {
      console.log('Usando abordagem sem limite com paginação');
      
      let allExecutions: any[] = [];
      let hasMore = true;
      let page = 1;
      const maxPages = 20; // Evitar loops infinitos (permite até 20000 execuções)
      
      // Headers para autenticação
      const headers = {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      
      // Buscar até não ter mais dados ou atingir limite de páginas
      while (hasMore && page <= maxPages) {
        // URL para buscar as execuções no n8n (1000 por página para maximizar)
        const executionsUrl = `${n8nApiUrl}/executions?workflowId=${workflowId}&limit=1000&page=${page}`;
        
        console.log(`Buscando página ${page} de execuções...`);
        
        try {
          // Buscar execuções do n8n
          const response = await fetch(executionsUrl, { headers });
          
          if (!response.ok) {
            console.error(`Erro ao buscar página ${page}: ${response.status}`);
            break;
          }
          
          const executionsData = await response.json();
          
          if (!executionsData || !executionsData.data || !Array.isArray(executionsData.data)) {
            console.error('Formato de dados inválido na resposta do n8n');
            break;
          }
          
          const results = executionsData.data;
          
          // Adicionar resultados desta página ao total
          allExecutions = [...allExecutions, ...results];
          
          console.log(`Página ${page}: ${results.length} execuções encontradas. Total acumulado: ${allExecutions.length}`);
          
          // Se recebemos menos do que o limite, não há mais páginas
          if (results.length < 1000) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (error) {
          console.error(`Erro ao buscar página ${page}:`, error);
          break;
        }
      }
      
      // Filtrar execuções pela data, se especificada
      let filteredExecutions = allExecutions;
      
      if (date) {
        filteredExecutions = allExecutions.filter((execution: any) => {
          if (!execution || !execution.startedAt) return false;
          const executionDate = new Date(execution.startedAt).toISOString().split('T')[0];
          return executionDate === date;
        });
      }
      
      console.log(`Total de execuções após filtragem: ${filteredExecutions.length} de ${allExecutions.length}`);
      
      // Retornar a contagem completa
      return NextResponse.json({
        workflowId,
        date: date || 'all',
        count: filteredExecutions.length,
        totalExecutions: allExecutions.length,
        pagesProcessed: page,
        noLimit: true
      });
    } else {
      // Abordagem com limite para performance quando não precisamos de todas
      // URL para buscar as execuções no n8n (com limite grande para maximizar precisão)
      const executionsUrl = `${n8nApiUrl}/executions?workflowId=${workflowId}&limit=250`;
      
      // Headers para autenticação
      const headers = {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      
      // Buscar execuções do n8n
      const response = await fetch(executionsUrl, { headers });
      
      if (!response.ok) {
        return NextResponse.json(
          { error: `Erro ao buscar execuções: ${response.status}` },
          { status: response.status }
        );
      }
      
      const executionsData = await response.json();
      
      if (!executionsData || !executionsData.data || !Array.isArray(executionsData.data)) {
        return NextResponse.json(
          { error: 'Formato de dados inválido na resposta do n8n' },
          { status: 500 }
        );
      }
      
      // Filtrar execuções pela data, se especificada
      let filteredExecutions = executionsData.data;
      
      if (date) {
        filteredExecutions = executionsData.data.filter((execution: any) => {
          if (!execution || !execution.startedAt) return false;
          const executionDate = new Date(execution.startedAt).toISOString().split('T')[0];
          return executionDate === date;
        });
      }
      
      // Retornar a contagem
      return NextResponse.json({
        workflowId,
        date: date || 'all',
        count: filteredExecutions.length,
        totalExecutions: executionsData.data.length,
        noLimit: false
      });
    }
  } catch (error) {
    console.error('Erro ao contar execuções:', error);
    
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição' },
      { status: 500 }
    );
  }
} 