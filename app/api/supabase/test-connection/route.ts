import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: Request) {
  try {
    console.log('Testando conexão com Supabase...');
    
    // Validar configurações do Supabase
    if (!SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL não está configurado');
      return NextResponse.json(
        { success: false, error: 'URL do Supabase não configurada' },
        { status: 500 }
      );
    }
    
    if (!SUPABASE_KEY) {
      console.error('SUPABASE_SERVICE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurado');
      return NextResponse.json(
        { success: false, error: 'Chave do Supabase não configurada' },
        { status: 500 }
      );
    }
    
    console.log(`Inicializando cliente Supabase com URL: ${SUPABASE_URL.substring(0, 15)}...`);
    console.log(`Usando chave com prefixo: ${SUPABASE_KEY.substring(0, 10)}...`);
    
    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Info': 'test-connection-api'
        }
      }
    });
    
    // Testar conexão com uma operação simples
    console.log('Testando conexão com operação simples...');
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
          
          return NextResponse.json({
            success: true,
            message: 'Conexão básica com Supabase estabelecida, mas erro ao acessar tabela',
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            },
            projectStatus: projectInfo.status
          });
        } else {
          const errorText = await projectInfo.text();
          console.error('Falha na conexão básica com o Supabase:', errorText);
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'Falha na conexão básica com o Supabase',
              details: {
                status: projectInfo.status,
                response: errorText
              }
            },
            { status: 500 }
          );
        }
      } catch (projectError) {
        console.error('Erro ao verificar projeto:', projectError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: `Erro ao verificar projeto: ${String(projectError)}`,
            details: projectError
          },
          { status: 500 }
        );
      }
    }
    
    // Verificar variáveis de ambiente
    const envInfo = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Definido' : 'Não definido',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definido' : 'Não definido',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Definido' : 'Não definido',
      NODE_ENV: process.env.NODE_ENV
    };
    
    // Verificar estrutura da tabela openai_usage
    console.log('Verificando estrutura da tabela openai_usage...');
    let tableInfo = null;
    
    try {
      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'openai_usage' });
      
      if (columnsError) {
        console.error('Erro ao verificar colunas:', columnsError);
      } else if (columns && columns.length > 0) {
        console.log('Colunas da tabela openai_usage:');
        columns.forEach((col: any) => {
          console.log(`- ${col.column_name} (${col.data_type}${col.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
        });
        
        tableInfo = columns;
      } else {
        console.log('Não foi possível obter informações das colunas');
      }
    } catch (columnsError) {
      console.error('Erro ao verificar colunas:', columnsError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conexão com Supabase testada com sucesso',
      environment: envInfo,
      tableInfo
    });
    
  } catch (error) {
    console.error('Erro ao testar conexão com Supabase:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Erro ao testar conexão com Supabase: ${String(error)}`,
        details: error
      },
      { status: 500 }
    );
  }
} 