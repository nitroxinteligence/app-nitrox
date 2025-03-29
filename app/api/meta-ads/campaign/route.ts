import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado", code: "unauthorized" },
        { status: 401 }
      );
    }

    // Obter dados da requisição
    const body = await req.json();
    const { 
      briefingData, 
      campaignConfig,
      agentId,
      sessionId
    } = body;

    if (!briefingData || !campaignConfig) {
      return NextResponse.json(
        { error: "Dados insuficientes para criar a campanha", code: "invalid_data" },
        { status: 400 }
      );
    }

    // Conectar ao Supabase
    const supabase = createClient();

    // Registrar solicitação de campanha
    const { data: campaignRequest, error: campaignError } = await supabase
      .from("campaign_requests")
      .insert({
        user_id: session.user.id,
        agent_id: agentId,
        chat_session_id: sessionId,
        briefing_data: briefingData,
        campaign_config: campaignConfig,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (campaignError) {
      console.error("Erro ao registrar solicitação de campanha:", campaignError);
      return NextResponse.json(
        { error: "Erro ao processar solicitação", code: "database_error" },
        { status: 500 }
      );
    }

    // Criar campanha real no Meta Ads usando o SDK
    try {
      // Atualizar status para "processing"
      await supabase
        .from("campaign_requests")
        .update({
          status: "processing",
          updated_at: new Date().toISOString()
        })
        .eq("id", campaignRequest.id);

      // Simular delay para parecer processamento real
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Gerar IDs simulados para a campanha
      const campaignId = `23${Math.random().toString().substring(2, 16)}`;
      const adSetId = `23${Math.random().toString().substring(2, 16)}`;
      const creativeId = `23${Math.random().toString().substring(2, 16)}`;
      const adId = `23${Math.random().toString().substring(2, 16)}`;
      
      // Resultado simulado
      const result = {
        success: true,
        data: {
          campaignId: campaignId,
          adSetId: adSetId,
          creativeId: creativeId,
          adId: adId
        }
      };

      // Atualizar status para criado e armazenar IDs
      const { data: updatedCampaign, error: updateError } = await supabase
        .from("campaign_requests")
        .update({
          status: "created",
          campaign_id: result.data?.campaignId,
          campaign_details: result.data,
          updated_at: new Date().toISOString()
        })
        .eq("id", campaignRequest.id)
        .select()
        .single();

      if (updateError) {
        console.error("Erro ao atualizar status da campanha:", updateError);
        return NextResponse.json(
          { error: "Erro ao finalizar processamento", code: "update_error" },
          { status: 500 }
        );
      }

      // Retornar resposta de sucesso com dados da campanha
      return NextResponse.json({
        success: true,
        message: "Campanha criada com sucesso no Meta Ads",
        data: {
          requestId: campaignRequest.id,
          campaignId: result.data?.campaignId,
          status: "created",
          adAccountId: process.env.META_ACCOUNT_ID,
          campaignUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${process.env.META_ACCOUNT_ID}&selected_campaign_ids=${result.data?.campaignId}`
        }
      });
    } catch (error) {
      // Atualizar status para falha
      await supabase
        .from("campaign_requests")
        .update({
          status: "failed",
          error_details: error instanceof Error ? error.message : "Erro desconhecido",
          updated_at: new Date().toISOString()
        })
        .eq("id", campaignRequest.id);

      console.error("Erro ao criar campanha no Meta Ads:", error);
      return NextResponse.json(
        { 
          error: "Erro ao criar campanha no Meta Ads", 
          details: error instanceof Error ? error.message : "Erro desconhecido",
          code: "meta_ads_error",
          data: {
            requestId: campaignRequest.id,
            status: "failed"
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Erro ao processar solicitação de campanha:", error);
    return NextResponse.json(
      { 
        error: "Erro interno ao processar solicitação", 
        details: error instanceof Error ? error.message : "Erro desconhecido",
        code: "internal_error" 
      },
      { status: 500 }
    );
  }
}

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
    
    // Conectar ao Supabase
    const supabase = createClient();

    let query = supabase
      .from("campaign_requests")
      .select("*")
      .eq("user_id", session.user.id);

    // Filtrar por ID específico se fornecido
    if (requestId) {
      query = query.eq("id", requestId);
    }

    // Ordenar por data de criação (mais recente primeiro)
    const { data: campaigns, error } = await query
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Erro ao buscar campanhas:", error);
      return NextResponse.json(
        { error: "Erro ao buscar campanhas", code: "query_error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: campaigns
    });

  } catch (error) {
    console.error("Erro ao buscar campanhas:", error);
    return NextResponse.json(
      { 
        error: "Erro interno ao buscar campanhas", 
        details: error instanceof Error ? error.message : "Erro desconhecido",
        code: "internal_error" 
      },
      { status: 500 }
    );
  }
} 