import { NextResponse } from "next/server";

// URL para a Edge Function no Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/agent-sync`;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

export async function POST(request: Request) {
  try {
    console.log('Iniciando sincronização de agentes N8N via Edge Function...');
    
    if (!SUPABASE_URL) {
      console.error('Erro: URL do Supabase não encontrada no ambiente');
      return NextResponse.json(
        { success: false, error: 'URL do Supabase não configurada' },
        { status: 500 }
      );
    }
    
    if (!SUPABASE_SERVICE_KEY) {
      console.error('Erro: Chave de serviço do Supabase não encontrada no ambiente');
      return NextResponse.json(
        { success: false, error: 'Chave de serviço do Supabase não configurada' },
        { status: 500 }
      );
    }
    
    // Extrair parâmetros da solicitação
    let body = {};
    try {
      body = await request.json();
    } catch (error) {
      console.log('Nenhum corpo JSON na requisição, usando valores padrão');
    }
    
    console.log(`Chamando Edge Function em ${EDGE_FUNCTION_URL}`);
    
    // Chamar a Edge Function do Supabase
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        forceSync: true,
        debug: true,
        specificWorkflowId: body.specificWorkflowId || null,
        source: body.source || 'api'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta da Edge Function:', errorText);
      return NextResponse.json(
        { success: false, error: `Erro na sincronização: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    console.log('Resultado da sincronização:', result);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro na sincronização:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido na sincronização',
        details: error.details || error.code || '',
      },
      { status: 500 }
    );
  }
}

// Também suporta método GET para facilitar testes
export async function GET() {
  return NextResponse.json({
    success: false,
    error: "Use o método POST para sincronizar dados de agentes N8N"
  });
} 