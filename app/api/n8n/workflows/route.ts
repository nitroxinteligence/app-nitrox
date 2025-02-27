import { NextResponse } from "next/server"

// URL base da API do N8N
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
// Token de API do N8N
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";

export async function GET() {
  try {
    console.log('N8N API URL:', N8N_API_URL || 'NÃO CONFIGURADO')
    
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
    
    const url = `${N8N_API_URL}/workflows`
    console.log('Fetching from URL:', url)
    
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
    console.log('Using headers:', { 'X-N8N-API-KEY': N8N_API_KEY ? '[REDACTED]' : 'NOT CONFIGURED' })

    // Log adicional para debug
    console.log(`Connecting to N8N API at: ${url}`)
    
    try {
      const response = await fetch(url, { 
        headers,
        method: 'GET'
      })
      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const data = await response.json()
      console.log('Received data structure:', Object.keys(data))

      if (!data || !data.data) {
        console.error('Invalid data format:', data)
        throw new Error('Invalid data format received from N8N')
      }

      console.log(`Found ${data.data.length} workflows in N8N`)
      
      // Log detalhado para debug
      if (data.data.length > 0) {
        console.log('Sample workflow:', {
          id: data.data[0].id,
          name: data.data[0].name,
          active: data.data[0].active,
          tags: data.data[0].tags
        })
        
        // Log de todas as tags encontradas
        const allTags = new Set<string>();
        data.data.forEach(workflow => {
          if (Array.isArray(workflow.tags)) {
            workflow.tags.forEach(tag => {
              const tagName = typeof tag === 'string' ? tag : tag.name;
              if (tagName) allTags.add(tagName.toLowerCase());
            });
          }
        });
        console.log('All tags found in workflows:', [...allTags]);
      }

      return NextResponse.json(data)
    } catch (fetchError) {
      console.error('Erro na comunicação com o N8N:', fetchError)
      throw new Error(`Falha na comunicação com o N8N: ${fetchError.message}`)
    }
  } catch (error) {
    console.error('Error in N8N workflows route:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflows',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: { data: [] } // Retornar um array vazio para não quebrar os clientes
      }, 
      { status: 200 } // Retornar 200 mesmo com erro para não quebrar clientes
    )
  }
} 