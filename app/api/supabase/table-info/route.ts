import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: Request) {
  try {
    // Obter o nome da tabela da query string
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    
    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Nome da tabela não especificado' },
        { status: 400 }
      );
    }
    
    // Validar configurações do Supabase
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }
    
    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    
    console.log(`Verificando estrutura da tabela ${table}...`);
    
    // Verificar se a tabela existe
    const { data: tableExists, error: tableExistsError } = await supabase
      .rpc('check_table_exists', { table_name: table });
      
    if (tableExistsError) {
      console.error('Erro ao verificar existência da tabela:', tableExistsError);
      
      // Tentar uma abordagem alternativa
      try {
        const { data: tableInfo, error: tableInfoError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (tableInfoError) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Erro ao acessar tabela: ${tableInfoError.message}`,
              details: tableInfoError
            },
            { status: 500 }
          );
        }
        
        // Se chegou aqui, a tabela existe
        console.log(`Tabela ${table} existe`);
      } catch (alternativeError) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Erro ao verificar tabela: ${String(alternativeError)}`,
            details: alternativeError
          },
          { status: 500 }
        );
      }
    }
    
    // Obter informações das colunas
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: table });
      
    if (columnsError) {
      console.error('Erro ao obter colunas:', columnsError);
      
      // Tentar uma abordagem alternativa
      try {
        // Consultar diretamente o information_schema
        const { data: schemaInfo, error: schemaError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', table)
          .eq('table_schema', 'public');
          
        if (schemaError) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Erro ao consultar schema: ${schemaError.message}`,
              details: schemaError
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          table,
          columns: schemaInfo,
          method: 'information_schema'
        });
      } catch (alternativeError) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Erro ao consultar schema: ${String(alternativeError)}`,
            details: alternativeError
          },
          { status: 500 }
        );
      }
    }
    
    // Obter um exemplo de registro
    const { data: sampleRecord, error: sampleError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
      
    return NextResponse.json({
      success: true,
      table,
      columns,
      sampleRecord: sampleRecord && sampleRecord.length > 0 ? sampleRecord[0] : null,
      method: 'rpc'
    });
    
  } catch (error) {
    console.error('Erro ao verificar estrutura da tabela:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Erro ao verificar estrutura da tabela: ${String(error)}`,
        details: error
      },
      { status: 500 }
    );
  }
} 