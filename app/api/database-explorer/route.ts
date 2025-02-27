import { NextResponse } from "next/server";
import { supabaseAuto } from "@/lib/supabase-auto-client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    
    // Remover 'api' e 'database-explorer' da análise do path
    if (path[0] === 'api' && path[1] === 'database-explorer') {
      path.shift(); // Remove 'api'
      path.shift(); // Remove 'database-explorer'
    }
    
    const params = Object.fromEntries(url.searchParams);
    
    // Ações baseadas no path
    if (path.length === 0) {
      // Listar todas as tabelas
      const tables = await supabaseAuto.getTables();
      
      return NextResponse.json({ 
        success: true, 
        tables,
        count: tables.length,
        timestamp: new Date().toISOString()
      });
    } 
    
    else if (path[0] === 'overview') {
      // Obter uma visão geral do banco de dados
      const dbDescription = await supabaseAuto.getDatabaseDescription();
      
      return NextResponse.json(dbDescription);
    }
    
    else if (path[0] === 'table' && path[1]) {
      const tableName = path[1];
      
      // Obter estrutura da tabela
      const tableStructure = await supabaseAuto.getTableStructure(tableName);
      
      if (!tableStructure) {
        return NextResponse.json(
          { success: false, error: `Tabela '${tableName}' não encontrada` },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        table: tableStructure,
        timestamp: new Date().toISOString()
      });
    }
    
    else if (path[0] === 'query' && path[1]) {
      const tableName = path[1];
      
      // Parâmetros de consulta
      const options: any = {};
      
      if (params.limit) options.limit = parseInt(params.limit);
      if (params.offset) options.offset = parseInt(params.offset);
      if (params.orderBy) options.orderBy = params.orderBy;
      if (params.orderDir) options.orderDir = params.orderDir as 'asc' | 'desc';
      if (params.filter && params.value) {
        options.filter = params.filter;
        options.value = params.value;
      }
      
      // Consultar tabela
      const result = await supabaseAuto.queryTable(tableName, options);
      
      return NextResponse.json(result);
    }
    
    // Endpoint não reconhecido
    return NextResponse.json(
      { 
        success: false, 
        error: 'Endpoint não encontrado',
        availableEndpoints: [
          '/api/database-explorer',
          '/api/database-explorer/overview',
          '/api/database-explorer/table/{tableName}',
          '/api/database-explorer/query/{tableName}?limit=10&offset=0&orderBy=id&orderDir=asc&filter=column&value=value'
        ]
      },
      { status: 404 }
    );
    
  } catch (error: any) {
    console.error('Erro na API de exploração de banco de dados:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: String(error)
      },
      { status: 500 }
    );
  }
}

// Permitir requisições POST para suportar consultas mais complexas no futuro
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tableName, options } = body;
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Ação não especificada' },
        { status: 400 }
      );
    }
    
    // Executar ação baseada no tipo
    if (action === 'getTables') {
      const tables = await supabaseAuto.getTables(body.forceRefresh);
      
      return NextResponse.json({ 
        success: true, 
        tables,
        count: tables.length,
        timestamp: new Date().toISOString()
      });
    }
    
    else if (action === 'getTableStructure' && tableName) {
      const tableStructure = await supabaseAuto.getTableStructure(tableName, body.forceRefresh);
      
      if (!tableStructure) {
        return NextResponse.json(
          { success: false, error: `Tabela '${tableName}' não encontrada` },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        table: tableStructure,
        timestamp: new Date().toISOString()
      });
    }
    
    else if (action === 'queryTable' && tableName) {
      const result = await supabaseAuto.queryTable(tableName, options || {});
      
      return NextResponse.json(result);
    }
    
    else if (action === 'getDatabaseDescription') {
      const dbDescription = await supabaseAuto.getDatabaseDescription();
      
      return NextResponse.json(dbDescription);
    }
    
    // Ação não reconhecida
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ação não reconhecida',
        availableActions: ['getTables', 'getTableStructure', 'queryTable', 'getDatabaseDescription']
      },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Erro na API de exploração de banco de dados (POST):', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: String(error)
      },
      { status: 500 }
    );
  }
} 