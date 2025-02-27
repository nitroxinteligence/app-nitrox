import { NextResponse } from "next/server";

// Chave secreta para validar webhooks do N8N
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  try {
    // Verificar a chave secreta (opcional)
    const authHeader = request.headers.get('x-webhook-secret') || '';
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      console.warn('Tentativa de acesso ao webhook com chave inválida');
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }
    
    console.log('Webhook de execução de agente recebido');
    
    // Extrair dados do corpo da requisição
    const body = await request.json().catch(() => ({}));
    console.log('Dados recebidos do webhook:', JSON.stringify(body, null, 2));
    
    // Chamar a API de sincronização assincronamente (sem esperar o retorno)
    fetch('/api/agent/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        forceSync: true,
        source: 'webhook',
        workflowId: body.workflowId || body.workflow_id || body.execution?.workflowId
      })
    }).catch(error => {
      console.error('Erro ao acionar sincronização em segundo plano:', error);
    });
    
    // Retornar imediatamente para não bloquear o N8N
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook recebido, sincronização iniciada em segundo plano'
    });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao processar webhook' 
    }, { 
      status: 500 
    });
  }
} 