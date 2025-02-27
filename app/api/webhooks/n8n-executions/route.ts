import { NextResponse } from "next/server";

// Chave secreta para validar webhooks do N8N
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

export async function POST(request: Request) {
  try {
    // Verificar a chave secreta
    const authHeader = request.headers.get('x-webhook-secret') || '';
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      console.warn('Tentativa de acesso ao webhook com chave inválida');
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }
    
    console.log('Webhook de execução N8N recebido');
    
    // Extrair dados do corpo da requisição
    let body = {};
    try {
      body = await request.json().catch(() => ({}));
      console.log('Dados recebidos do webhook:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('Erro ao processar corpo da requisição:', error);
    }
    
    // Obter workflowId da execução
    const workflowId = body.workflowData?.id || body.workflow?.id || null;
    
    if (!workflowId) {
      console.warn('Webhook sem ID de workflow');
      return NextResponse.json({ 
        success: false, 
        error: 'ID de workflow não encontrado na requisição' 
      }, { status: 400 });
    }
    
    // Chamar a Edge Function para sincronizar IMEDIATAMENTE
    const syncResponse = await fetch(`${SUPABASE_URL}/functions/v1/agent-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        forceSync: true,
        specificWorkflowId: workflowId,
        source: 'webhook'
      })
    });
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('Erro na sincronização:', errorText);
      throw new Error(`Erro na sincronização: ${syncResponse.status}`);
    }
    
    const result = await syncResponse.json();
    console.log('Resultado da sincronização:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Execução sincronizada com sucesso',
      syncResult: result
    });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao processar webhook' 
    }, { status: 500 });
  }
} 