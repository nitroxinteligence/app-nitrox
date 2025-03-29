import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado", code: "unauthorized" },
        { status: 401 }
      );
    }

    // Obter parâmetros de query
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    
    if (!requestId) {
      return NextResponse.json(
        { error: "ID da solicitação é obrigatório", code: "missing_id" },
        { status: 400 }
      );
    }

    // Conectar ao Supabase
    const supabase = createClient();

    // Buscar solicitação de campanha
    const { data: campaignRequest, error } = await supabase
      .from("campaign_requests")
      .select("*")
      .eq("id", requestId)
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.error("Erro ao buscar solicitação:", error);
      return NextResponse.json(
        { error: "Solicitação não encontrada", code: "not_found" },
        { status: 404 }
      );
    }

    // Verificar status e fornecer informações adicionais
    let additionalInfo = {};
    
    switch (campaignRequest.status) {
      case "pending":
        additionalInfo = {
          message: "Sua solicitação está na fila e será processada em breve.",
          estimatedTime: "1-2 minutos"
        };
        break;
      case "processing":
        additionalInfo = {
          message: "Sua campanha está sendo criada no Meta Ads.",
          estimatedTime: "2-3 minutos",
          progress: "50%"
        };
        break;
      case "created":
        additionalInfo = {
          message: "Sua campanha foi criada com sucesso!",
          campaignLink: `https://business.facebook.com/adsmanager/manage/campaigns?act=${campaignRequest.campaign_id}`,
          nextSteps: "Revise sua campanha no Meta Ads e ative-a quando estiver pronto."
        };
        break;
      case "failed":
        additionalInfo = {
          message: "Houve um problema ao criar sua campanha.",
          errorDetails: campaignRequest.error_details || "Erro desconhecido",
          suggestion: "Entre em contato com o suporte ou tente novamente."
        };
        break;
      default:
        additionalInfo = {
          message: "Status desconhecido. Entre em contato com o suporte."
        };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...campaignRequest,
        ...additionalInfo
      }
    });

  } catch (error) {
    console.error("Erro ao verificar status da campanha:", error);
    return NextResponse.json(
      { 
        error: "Erro interno ao verificar status", 
        details: error instanceof Error ? error.message : "Erro desconhecido",
        code: "internal_error" 
      },
      { status: 500 }
    );
  }
} 