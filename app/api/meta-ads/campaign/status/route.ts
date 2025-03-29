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

    // Obter parâmetros da query
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const campaignId = searchParams.get("campaignId");
    
    if (!requestId && !campaignId) {
      return NextResponse.json(
        { error: "É necessário fornecer requestId ou campaignId", code: "missing_params" },
        { status: 400 }
      );
    }

    // Conectar ao Supabase
    const supabase = createClient();

    // Construir query
    let query = supabase
      .from("campaign_requests")
      .select("*")
      .eq("user_id", session.user.id);

    // Filtrar por ID específico
    if (requestId) {
      query = query.eq("id", requestId);
    } else if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    // Executar query
    const { data: campaign, error } = await query.single();

    if (error) {
      console.error("Erro ao buscar status da campanha:", error);
      return NextResponse.json(
        { error: "Campanha não encontrada", code: "not_found" },
        { status: 404 }
      );
    }

    // Se a campanha existir, consultar status atual no Meta Ads
    // Atualmente apenas retornamos os dados armazenados, mas em uma implementação
    // completa, faríamos uma chamada à API do Meta para obter o status em tempo real
    
    return NextResponse.json({
      success: true,
      data: {
        id: campaign.id,
        campaignId: campaign.campaign_id,
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        details: campaign.campaign_details,
        campaignUrl: campaign.campaign_id 
          ? `https://business.facebook.com/adsmanager/manage/campaigns?act=${process.env.META_ACCOUNT_ID}&selected_campaign_ids=${campaign.campaign_id}`
          : null
      }
    });

  } catch (error) {
    console.error("Erro ao verificar status da campanha:", error);
    return NextResponse.json(
      { 
        error: "Erro ao verificar status da campanha", 
        details: error instanceof Error ? error.message : "Erro desconhecido",
        code: "internal_error" 
      },
      { status: 500 }
    );
  }
} 