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
    
    // Validar configurações necessárias de forma mais detalhada
    if (!SUPABASE_URL) {
      console.error('Erro: URL do Supabase não encontrada no ambiente');
      return NextResponse.json(
        { success: false, error: 'URL do Supabase não configurada' },
        { status: 500 }
      );
    }
    
    if (!SUPABASE_KEY) {
      console.error('Erro: Chave do Supabase não encontrada no ambiente');
      return NextResponse.json(
        { success: false, error: 'Chave do Supabase não configurada' },
        { status: 500 }
      );
    }
    
    console.log(`Inicializando cliente Supabase com URL: ${SUPABASE_URL.substring(0, 15)}...`);
    console.log(`Usando chave com prefixo: ${SUPABASE_KEY.substring(0, 10)}...`);
    
    // Inicializar cliente Supabase com a chave de serviço e opções explícitas
    let supabase;
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false, // Não persistir sessão (estamos em um contexto serverless)
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Info': 'usage-sync-api'
          }
        }
      });
      
      console.log('Cliente Supabase inicializado');
    } catch (initError) {
      console.error('Erro ao inicializar cliente Supabase:', initError);
      return NextResponse.json(
        { success: false, error: 'Erro ao inicializar cliente Supabase', details: String(initError) },
        { status: 500 }
      );
    }
    
    // Verificar se conseguimos fazer uma operação básica no Supabase
    try {
      console.log('Testando conexão com Supabase...');
      const { data, error } = await supabase.from('openai_usage').select('id').limit(1);
      
      if (error) {
        console.error('Erro ao testar conexão com Supabase:', error);
        console.error('Código do erro:', error.code);
        console.error('Detalhes adicionais:', error.details);
        console.error('Mensagem:', error.message);
        console.error('Hint:', error.hint || 'Nenhum hint disponível');
        
        // Verificar permissões e configurações da tabela
        console.log('Verificando informações do projeto Supabase...');
        try {
          // Verificar se podemos acessar informações do projeto
          const projectInfo = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          });
          
          console.log('Status da resposta do Supabase:', projectInfo.status);
          
          if (projectInfo.ok) {
            console.log('Conseguiu conexão básica com o Supabase');
          } else {
            console.error('Falha na conexão básica com o Supabase:', await projectInfo.text());
          }
        } catch (projectError) {
          console.error('Erro ao verificar projeto:', projectError);
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: `Erro de conexão com Supabase: ${error.message}`,
            details: {
              code: error.code,
              hint: error.hint,
              details: error.details,
              message: error.message
            }
          },
          { status: 500 }
        );
      }
      console.log('Conexão com Supabase testada com sucesso');
      
      // Se conseguimos daqui para frente, vamos verificar a estrutura da tabela
      try {
        console.log('Verificando estrutura da tabela openai_usage...');
        const { data: columns, error: columnsError } = await supabase
          .rpc('get_table_columns', { table_name: 'openai_usage' });
        
        if (columnsError) {
          console.error('Erro ao verificar colunas:', columnsError);
        } else if (columns && columns.length > 0) {
          console.log('Colunas da tabela openai_usage:');
          columns.forEach((col: any) => {
            console.log(`- ${col.column_name} (${col.data_type}${col.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
          });
        } else {
          console.log('Não foi possível obter informações das colunas');
        }
      } catch (columnsError) {
        console.error('Erro ao verificar colunas:', columnsError);
      }
    } catch (testError: any) {
      console.error('Erro ao testar conexão com Supabase:', testError);
      
      // Extrair informações detalhadas do erro
      const errorMsg = testError instanceof Error ? testError.message : 'Erro desconhecido';
      const errorStack = testError instanceof Error ? testError.stack : '';
      const errorDetails = testError.details || testError.code || '';
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Erro de conexão com Supabase: ${errorMsg}`,
          details: errorDetails,
          stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
        },
        { status: 500 }
      );
    }
    
    // Extrair parâmetros da requisição (opcional)
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.log('Nenhum corpo JSON na requisição, usando valores padrão');
      body = {};
    }
    
    // Forçar a recuperação de todos os workflows, independente do ID especificado
    // Isso é necessário para garantir que todos os dados sejam sincronizados
    const workflowId = undefined; // Sobrescrever para buscar todos os workflows
    const forceSync = body.forceSync || true; // Forçar sincronização sempre 
    const debug = body.debug || true; // Habilitar logs detalhados
    const verbose = body.verbose || false; // Adicionar novo parâmetro
    
    if (debug) {
      console.log('Modo de debug ativado, mostrando informações detalhadas');
      console.log('Parâmetros da requisição:', { workflowId, forceSync, debug, verbose });
      console.log('Ambiente:', {
        NODE_ENV: process.env.NODE_ENV,
        supabaseUrl: SUPABASE_URL ? 'Definido' : 'Não definido',
        supabaseKey: SUPABASE_KEY ? `Começa com ${SUPABASE_KEY.substring(0, 10)}...` : 'Não definido',
        n8nUrl: process.env.NEXT_PUBLIC_N8N_API_URL ? 'Definido' : 'Não definido',
        n8nKey: process.env.NEXT_PUBLIC_N8N_API_KEY ? 'Definido' : 'Não definido'
      });
    }
    
    // Verificar se já sincronizamos recentemente (evitar sincronizações muito frequentes)
    if (!forceSync) {
      try {
        const { data: lastSync } = await supabase
          .from('openai_usage_summary')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (lastSync && lastSync.length > 0) {
          const lastSyncTime = new Date(lastSync[0].created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
          
          // Se a última sincronização foi há menos de 15 minutos, pular
          if (diffMinutes < 15) {
            console.log(`Última sincronização realizada há ${Math.round(diffMinutes)} minutos, pulando.`);
            return NextResponse.json({
              success: true,
              message: `Sincronização ignorada, última atualização há ${Math.round(diffMinutes)} minutos`,
              lastSync: lastSyncTime.toISOString()
            });
          }
        }
      } catch (lastSyncError) {
        console.warn('Erro ao verificar última sincronização, continuando mesmo assim:', lastSyncError);
      }
    }
    
    // Extrair e salvar dados de uso da OpenAI
    const startTime = Date.now();
    console.log('Chamando n8nService.extractAndSaveOpenAIUsage() - Buscando TODOS os workflows...');
    
    // Adicionar logs detalhados
    console.log(`Parâmetros: workflowId=${workflowId}, forceSync=${forceSync}, debug=${debug}, verbose=${verbose}`);
    
    const result = await n8nService.extractAndSaveOpenAIUsage(workflowId, supabase);
    const executionTime = (Date.now() - startTime) / 1000;
    
    console.log('Resultado da sincronização:', JSON.stringify(result, null, 2));
    
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
      stats: result.stats,
      executionTime: `${executionTime.toFixed(2)} segundos`
    });
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