/**
 * Cliente automático para interagir com o Supabase usando Edge Functions
 * 
 * Este cliente permite acessar automaticamente todas as tabelas
 * do Supabase sem precisar enviar as estruturas manualmente.
 */

import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configuração do Supabase não encontrada. Verifique as variáveis de ambiente.');
}

// Cliente Supabase padrão
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * SupabaseAutoClient - Cliente para acesso automático às tabelas
 */
class SupabaseAutoClient {
  private supabaseUrl: string;
  private supabaseKey: string;
  private supabaseClient: any;
  private tablesCache: Record<string, any> = {};
  private tablesListCache: string[] | null = null;
  private tableStructureCache: Record<string, any> = {};
  private cacheExpiry: Record<string, number> = {};
  private cacheDuration = 5 * 60 * 1000; // 5 minutos em milissegundos

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Obtém a lista de todas as tabelas disponíveis no Supabase
   */
  async getTables(forceRefresh = false): Promise<string[]> {
    // Verificar cache se não forçar atualização
    if (!forceRefresh && this.tablesListCache && this.cacheExpiry['tables'] > Date.now()) {
      return this.tablesListCache;
    }

    try {
      // Chamar a Edge Function para obter a lista de tabelas
      const response = await fetch(`${this.supabaseUrl}/functions/v1/database-inspector/tables`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar tabelas: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Erro na resposta: ${result.error}`);
      }

      // Atualizar cache
      this.tablesListCache = result.tables;
      this.cacheExpiry['tables'] = Date.now() + this.cacheDuration;

      return result.tables;
    } catch (error) {
      console.error('Erro ao obter lista de tabelas:', error);
      // Retornar cache mesmo expirado em caso de erro
      return this.tablesListCache || [];
    }
  }

  /**
   * Obtém a estrutura de uma tabela específica
   */
  async getTableStructure(tableName: string, forceRefresh = false): Promise<any> {
    // Verificar cache se não forçar atualização
    if (!forceRefresh && 
        this.tableStructureCache[tableName] && 
        this.cacheExpiry[`structure_${tableName}`] > Date.now()) {
      return this.tableStructureCache[tableName];
    }

    try {
      // Chamar a Edge Function para obter a estrutura da tabela
      const response = await fetch(`${this.supabaseUrl}/functions/v1/database-inspector/table/${tableName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar estrutura da tabela: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Erro na resposta: ${result.error}`);
      }

      // Atualizar cache
      this.tableStructureCache[tableName] = result.table;
      this.cacheExpiry[`structure_${tableName}`] = Date.now() + this.cacheDuration;

      return result.table;
    } catch (error) {
      console.error(`Erro ao obter estrutura da tabela ${tableName}:`, error);
      // Retornar cache mesmo expirado em caso de erro
      return this.tableStructureCache[tableName] || null;
    }
  }

  /**
   * Consulta dados de uma tabela com suporte a filtros e paginação
   */
  async queryTable(
    tableName: string, 
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDir?: 'asc' | 'desc';
      filter?: string;
      value?: string | number;
    } = {}
  ): Promise<any> {
    try {
      // Construir a URL com os parâmetros de consulta
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.orderBy) params.append('orderBy', options.orderBy);
      if (options.orderDir) params.append('orderDir', options.orderDir);
      if (options.filter && options.value !== undefined) {
        params.append('filter', options.filter);
        params.append('value', options.value.toString());
      }

      // Chamar a Edge Function para consultar a tabela
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/database-inspector/query/${tableName}?${params}`, 
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao consultar tabela: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Erro na resposta: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`Erro ao consultar tabela ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Obtém uma descrição completa do banco de dados
   */
  async getDatabaseDescription(): Promise<any> {
    try {
      // Obter lista de tabelas
      const tables = await this.getTables();
      
      // Para cada tabela, obter sua estrutura
      const tableDetails = await Promise.all(
        tables.map(async (tableName) => {
          const structure = await this.getTableStructure(tableName);
          return {
            name: tableName,
            structure: structure
          };
        })
      );
      
      return {
        success: true,
        database: {
          url: this.supabaseUrl,
          tables: tableDetails,
          tableCount: tables.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Erro ao obter descrição do banco de dados:', error);
      throw error;
    }
  }
}

// Exportar uma instância do cliente automático
export const supabaseAuto = new SupabaseAutoClient(supabaseUrl, supabaseAnonKey);

// Exportar o cliente padrão para uso regular
export default supabase; 