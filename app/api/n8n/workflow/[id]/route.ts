import { NextResponse } from "next/server"

// URL base da API do N8N
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
// Token de API do N8N
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    console.log(`Buscando detalhes do workflow ${workflowId}`);
    console.log('N8N API URL:', N8N_API_URL || 'NÃO CONFIGURADO');
    
    if (!N8N_API_URL) {
      console.error('⚠️ N8N API URL não configurada');
      console.error('Por favor, configure a variável de ambiente NEXT_PUBLIC_N8N_API_URL');
      console.error('Exemplo: NEXT_PUBLIC_N8N_API_URL=http://localhost:5678/api/v1');
      
      return NextResponse.json(
        { 
          error: 'N8N API URL não configurada',
          message: 'Configure a variável de ambiente NEXT_PUBLIC_N8N_API_URL'
        }, 
        { status: 200 }
      );
    }
    
    const url = `${N8N_API_URL}/workflows/${workflowId}`;
    console.log('Fetching from URL:', url);
    
    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    console.log('Using headers:', { 'X-N8N-API-KEY': N8N_API_KEY ? '[REDACTED]' : 'NOT CONFIGURED' });

    try {
      const response = await fetch(url, { 
        headers,
        method: 'GET'
      });
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      
      // Formatar o retorno para manter compatibilidade com o serviço
      const formattedData = {
        id: data.id,
        name: data.name,
        active: data.active,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        tags: Array.isArray(data.tags) 
          ? data.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name || '')
          : []
      };
      
      console.log(`Workflow encontrado: ${formattedData.name}`);
      if (formattedData.tags.length > 0) {
        console.log(`Tags: ${formattedData.tags.join(', ')}`);
      }
      
      return NextResponse.json(formattedData);
    } catch (fetchError) {
      console.error('Erro na comunicação com o N8N:', fetchError);
      throw new Error(`Falha na comunicação com o N8N: ${fetchError.message}`);
    }
  } catch (error) {
    console.error('Error in N8N workflow route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 200 } // Retornar 200 mesmo com erro para não quebrar clientes
    );
  }
} 