import { NextResponse } from "next/server"

// URL base da API do N8N
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
// Token de API do N8N
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";

export async function GET(request: Request) {
  try {
    // Extrair workflowId da URL
    const url = new URL(request.url)
    const workflowId = url.searchParams.get('workflowId')
    
    console.log(`Buscando execuções para o workflow ${workflowId}`)
    console.log('N8N API URL:', N8N_API_URL || 'NÃO CONFIGURADO');
    
    if (!workflowId) {
      return NextResponse.json(
        {
          error: 'workflowId é obrigatório',
          data: { data: [] }
        },
        { status: 200 }
      );
    }
    
    if (!N8N_API_URL) {
      console.error('⚠️ N8N API URL não configurada');
      console.error('Por favor, configure a variável de ambiente NEXT_PUBLIC_N8N_API_URL');
      console.error('Exemplo: NEXT_PUBLIC_N8N_API_URL=http://localhost:5678/api/v1');
      
      return NextResponse.json(
        { 
          error: 'N8N API URL não configurada',
          message: 'Configure a variável de ambiente NEXT_PUBLIC_N8N_API_URL',
          data: { data: [] } 
        }, 
        { status: 200 }
      );
    }
    
    // URL da API do N8N para buscar execuções de um workflow específico
    // Não buscar dados de resultados para reduzir o tamanho da resposta
    const apiUrl = `${N8N_API_URL}/executions?workflowId=${workflowId}&limit=20&includeData=true`
    console.log('Fetching from URL:', apiUrl)
    
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
    console.log('Using headers:', { 'X-N8N-API-KEY': N8N_API_KEY ? '[REDACTED]' : 'NOT CONFIGURED' });
    
    try {
      const response = await fetch(apiUrl, { headers })
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`Encontradas ${data.data?.length || 0} execuções para o workflow ${workflowId}`)
      
      if (!data.data) {
        data.data = [] // Garantir que temos pelo menos um array vazio
      }
      
      // Apenas para debug: registrar as propriedades disponíveis na primeira execução
      if (data.data.length > 0) {
        console.log('Propriedades da primeira execução:', Object.keys(data.data[0]))
      }
      
      return NextResponse.json(data)
    } catch (fetchError) {
      console.error('Erro na comunicação com o N8N:', fetchError)
      throw new Error(`Falha na comunicação com o N8N: ${fetchError.message}`)
    }
  } catch (error) {
    console.error('Error in N8N executions route:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch executions',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: { data: [] } // Retornar um array vazio para não quebrar os clientes
      },
      { status: 200 } // Retornar 200 mesmo com erro para não quebrar clientes
    )
  }
} 