import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Url e chave do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Verificar se o Supabase está configurado
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({
        error: "Configuração do Supabase ausente nas variáveis de ambiente"
      }, { status: 500 });
    }

    // Criar cliente do Supabase (preferir chave de serviço se disponível)
    const supabase = createClient(
      SUPABASE_URL, 
      SUPABASE_SERVICE_KEY || SUPABASE_KEY
    );

    // Criar função para calcular totais de uso da OpenAI
    if (action === 'create_openai_usage_totals_function') {
      // SQL para criar a função que calcula totais de uso da OpenAI
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION get_openai_usage_totals(lookback_days integer DEFAULT 30)
        RETURNS json AS $$
        DECLARE
          result json;
        BEGIN
          SELECT json_build_object(
            'total_calls', COUNT(*),
            'total_requests', COUNT(*),
            'total_tokens', COALESCE(SUM(total_tokens), 0),
            'total_cost', COALESCE(SUM(CAST(estimated_cost AS FLOAT)), 0),
            'update_date', NOW()
          ) INTO result
          FROM openai_usage
          WHERE timestamp >= NOW() - (lookback_days * INTERVAL '1 day');
          
          RETURN result;
        END;
        $$ LANGUAGE plpgsql;
      `;

      // Executar o SQL para criar a função
      const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });

      if (error) {
        console.error('Erro ao criar função:', error);
        return NextResponse.json({ 
          error: "Falha ao criar função SQL",
          details: error
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Função SQL criada com sucesso" 
      });
    }

    // Criar função auxiliar para executar SQL
    if (action === 'create_exec_sql_function') {
      // Verificar se estamos usando a chave de serviço
      if (!SUPABASE_SERVICE_KEY) {
        return NextResponse.json({
          error: "Chave de serviço do Supabase necessária para esta operação"
        }, { status: 403 });
      }

      // SQL direto no banco para criar a função exec_sql (requer privilégios)
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });

      if (error) {
        console.error('Erro ao criar função exec_sql:', error);
        return NextResponse.json({ 
          error: "Falha ao criar função exec_sql",
          details: error
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Função exec_sql criada com sucesso" 
      });
    }

    return NextResponse.json({ 
      error: "Ação não suportada" 
    }, { status: 400 });

  } catch (error) {
    console.error('Erro na API SQL:', error);
    return NextResponse.json({ 
      error: "Erro ao processar solicitação",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 