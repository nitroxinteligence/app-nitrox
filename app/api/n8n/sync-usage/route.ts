import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { n8nService } from '@/lib/n8n-service';

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Usar chave de serviço em vez de chave anônima para ter permissões de escrita
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function POST(request: Request) {
  try {
    console.log('Iniciando sincronização de uso da OpenAI...');
    
    // Validar configurações necessárias
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Configuração do Supabase não encontrada:', {
        urlDefined: !!SUPABASE_URL,
        keyDefined: !!SUPABASE_KEY
      });
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }
    
    // Inicializar cliente Supabase com a chave de serviço
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Cliente Supabase inicializado com chave:', SUPABASE_KEY.substring(0, 10) + '...');
    
    // Verificar se conseguimos fazer uma operação básica no Supabase
    try {
      const { data, error } = await supabase.from('openai_usage').select('id').limit(1);
      if (error) {
        console.error('Erro ao testar conexão com Supabase:', error);
        return NextResponse.json(
          { error: `Erro de conexão com Supabase: ${error.message}` },
          { status: 500 }
        );
      }
      console.log('Conexão com Supabase testada com sucesso');
    } catch (testError) {
      console.error('Erro ao testar conexão com Supabase:', testError);
      return NextResponse.json(
        { error: `Erro de conexão com Supabase: ${testError instanceof Error ? testError.message : 'Erro desconhecido'}` },
        { status: 500 }
      );
    }
    
    // Extrair parâmetros da requisição (opcional)
    const body = await request.json().catch(() => ({}));
    const workflowId = body.workflowId; // Opcional: ID específico de workflow para processar
    
    // Extrair e salvar dados de uso da OpenAI
    const result = await n8nService.extractAndSaveOpenAIUsage(workflowId, supabase);
    
    // Calcular métricas diárias agregadas (opcional)
    if (result.success && result.stats.total_records > 0) {
      try {
        console.log('Atualizando agregações diárias...');
        
        // Executar função armazenada no Supabase para atualizar tabelas agregadas
        const { data, error } = await supabase.rpc('update_openai_usage_aggregations');
        
        if (error) {
          console.error('Erro ao atualizar agregações:', error);
        } else {
          console.log('Agregações atualizadas com sucesso');
        }
      } catch (aggError) {
        console.error('Erro ao atualizar agregações:', aggError);
      }
    }
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido na sincronização' 
      },
      { status: 500 }
    );
  }
} 