import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autorização (opcional, para maior segurança)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || "";
    
    // Se um segredo de cron estiver configurado, verificar o token
    if (cronSecret && (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret)) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Chamar a API de métricas de leads para executar a atualização
    const response = await fetch(new URL('/api/metrics/lead-metrics', request.url).toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Falha ao atualizar métricas de leads: ${error.message || response.statusText}`);
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: "Métricas de leads atualizadas com sucesso",
      data: result
    });
  } catch (error) {
    console.error('Erro ao executar cron de métricas de leads:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 