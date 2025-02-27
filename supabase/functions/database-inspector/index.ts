// Edge function para inspecionar o banco de dados Supabase
// Fornece acesso a metadados e dados das tabelas
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Variáveis de ambiente configuradas no Supabase Dashboard
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Tratamento das requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar o cliente Supabase com a chave de serviço
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Obter o path da URL para determinar a ação
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)
    
    // Remover 'database-inspector' da análise do path
    if (path[0] === 'database-inspector') {
      path.shift()
    }
    
    // Analisar a query string
    const params = Object.fromEntries(url.searchParams)
    
    // Ações baseadas no path
    if (path.length === 0 || path[0] === 'tables') {
      // Listar todas as tabelas do banco de dados
      const { data, error } = await supabase
        .from('pg_catalog.pg_tables')
        .select('schemaname, tablename')
        .eq('schemaname', 'public')
        
      if (error) throw error
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          tables: data.map(t => t.tablename),
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    
    else if (path[0] === 'table' && path[1]) {
      const tableName = path[1]
      
      // Verificar se a tabela existe
      const { data: tableExists, error: tableError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .eq('tablename', tableName)
        .maybeSingle()
      
      if (tableError) throw tableError
      
      if (!tableExists) {
        return new Response(
          JSON.stringify({ success: false, error: `Tabela '${tableName}' não encontrada` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Obter a estrutura da tabela
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
      
      if (columnsError) throw columnsError
      
      // Obter uma amostra dos dados (limitado a 10 registros)
      const limit = parseInt(params.limit || '10')
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(limit)
      
      if (sampleError) throw sampleError
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          table: {
            name: tableName,
            columns: columns,
            sample: sample,
            rowCount: sample.length,
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    else if (path[0] === 'query' && path[1]) {
      const tableName = path[1]
      
      // Verificar se a tabela existe
      const { data: tableExists, error: tableError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .eq('tablename', tableName)
        .maybeSingle()
      
      if (tableError) throw tableError
      
      if (!tableExists) {
        return new Response(
          JSON.stringify({ success: false, error: `Tabela '${tableName}' não encontrada` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Parâmetros de consulta
      const limit = parseInt(params.limit || '100')
      const offset = parseInt(params.offset || '0')
      const orderBy = params.orderBy || 'id'
      const orderDir = params.orderDir?.toLowerCase() === 'desc' ? 'desc' : 'asc'
      
      // Construir a consulta básica
      let query = supabase.from(tableName).select('*')
      
      // Adicionar filtragem se fornecida
      if (params.filter && params.value) {
        query = query.eq(params.filter, params.value)
      }
      
      // Adicionar ordenação e paginação
      query = query.order(orderBy, { ascending: orderDir === 'asc' })
        .range(offset, offset + limit - 1)
      
      // Executar a consulta
      const { data, error, count } = await query
      
      if (error) throw error
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: data,
          metadata: {
            table: tableName,
            count: data.length,
            limit,
            offset,
            orderBy,
            orderDir,
            filter: params.filter ? `${params.filter}=${params.value}` : null
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Endpoint não reconhecido
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Endpoint não encontrado',
        availableEndpoints: [
          '/database-inspector/tables',
          '/database-inspector/table/{tableName}',
          '/database-inspector/query/{tableName}?limit=10&offset=0&orderBy=id&orderDir=asc&filter=column&value=value'
        ]
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Erro na Edge Function:', error.message)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 