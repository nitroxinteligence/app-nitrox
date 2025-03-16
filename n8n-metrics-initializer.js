/**
 * Inicializador de Métricas para N8N
 * 
 * Este código deve ser colocado em um nó de código no início do workflow
 * para inicializar o sistema de métricas de leads.
 * 
 * @author SiaFlow Development Team
 * @version 1.0.0
 */

// Código para ser usado diretamente em um nó Code do N8N
// Note: Este arquivo é principalmente para documentação; o código real
// deve ser copiado diretamente para o nó Code do N8N.

const LeadMetricsHandler = class {
  constructor(config) {
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
    this.workflowId = config.workflowId;
    this.workflowName = config.workflowName;
    this.date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.metrics = {
      total_leads: 0,
      qualified_leads: 0,
      unqualified_leads: 0,
      conversion_rate: 0
    };
    
    // Inicializar Supabase
    this.initSupabase();
    
    // Carregar métricas existentes
    this.loadCurrentMetrics();
  }
  
  initSupabase() {
    // Função para criar cliente Supabase no ambiente N8N
    const createClient = (url, key) => {
      const { createClient } = require('@supabase/supabase-js');
      return createClient(url, key);
    };
    
    try {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    } catch (error) {
      console.error('Erro ao inicializar Supabase:', error);
      // Fallback para evitar erros
      this.supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null })
            })
          }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null })
          }),
          upsert: () => Promise.resolve({ data: null, error: null })
        })
      };
    }
  }
  
  async loadCurrentMetrics() {
    try {
      const { data, error } = await this.supabase
        .from('lead_metrics')
        .select('*')
        .eq('workflow_id', this.workflowId)
        .eq('date', this.date)
        .single();
        
      if (error) {
        console.error('Erro ao carregar métricas:', error);
        return;
      }
      
      if (data) {
        this.metrics = {
          total_leads: data.total_leads || 0,
          qualified_leads: data.qualified_leads || 0,
          unqualified_leads: data.unqualified_leads || 0,
          conversion_rate: data.conversion_rate || 0
        };
      }
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    }
  }
  
  async registerCapturedLead(leadData) {
    try {
      // Incrementa contagem de leads totais
      this.metrics.total_leads++;
      
      // Atualiza taxa de conversão
      this.updateConversionRate();
      
      // Salva no Supabase
      await this.saveMetrics();
      
      // Registra o lead individualmente para análises futuras
      await this.supabase.from('leads_detail').insert({
        lead_id: leadData.remotejid || leadData.id,
        lead_name: leadData.name,
        workflow_id: this.workflowId,
        workflow_name: this.workflowName,
        status: 'captured',
        metadata: leadData,
        captured_at: new Date().toISOString()
      });
      
      console.log(`Lead capturado: ${leadData.name || leadData.remotejid}`);
      return true;
    } catch (err) {
      console.error('Erro ao registrar lead capturado:', err);
      return false;
    }
  }
  
  async registerQualifiedLead(leadData) {
    try {
      // Incrementa contagem de leads qualificados
      this.metrics.qualified_leads++;
      
      // Atualiza taxa de conversão
      this.updateConversionRate();
      
      // Salva no Supabase
      await this.saveMetrics();
      
      // Atualiza o status do lead
      await this.supabase
        .from('leads_detail')
        .update({ 
          status: 'qualified', 
          qualified_at: new Date().toISOString() 
        })
        .eq('lead_id', leadData.remotejid || leadData.id);
      
      console.log(`Lead qualificado: ${leadData.name || leadData.remotejid}`);
      return true;
    } catch (err) {
      console.error('Erro ao registrar lead qualificado:', err);
      return false;
    }
  }
  
  async registerUnqualifiedLead(leadData) {
    try {
      // Incrementa contagem de leads desqualificados
      this.metrics.unqualified_leads++;
      
      // Atualiza taxa de conversão
      this.updateConversionRate();
      
      // Salva no Supabase
      await this.saveMetrics();
      
      // Atualiza o status do lead
      await this.supabase
        .from('leads_detail')
        .update({ 
          status: 'unqualified', 
          unqualified_at: new Date().toISOString(),
          unqualified_reason: leadData.reason || 'not_specified'
        })
        .eq('lead_id', leadData.remotejid || leadData.id);
      
      console.log(`Lead desqualificado: ${leadData.remotejid}, motivo: ${leadData.reason || 'não especificado'}`);
      return true;
    } catch (err) {
      console.error('Erro ao registrar lead desqualificado:', err);
      return false;
    }
  }
  
  updateConversionRate() {
    if (this.metrics.total_leads > 0) {
      this.metrics.conversion_rate = 
        (this.metrics.qualified_leads / this.metrics.total_leads) * 100;
    }
  }
  
  async saveMetrics() {
    try {
      const { error } = await this.supabase
        .from('lead_metrics')
        .upsert({
          workflow_id: this.workflowId,
          workflow_name: this.workflowName,
          date: this.date,
          total_leads: this.metrics.total_leads,
          qualified_leads: this.metrics.qualified_leads,
          unqualified_leads: this.metrics.unqualified_leads,
          conversion_rate: this.metrics.conversion_rate,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'workflow_id,date' 
        });
        
      if (error) {
        console.error('Erro ao salvar métricas:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Erro ao salvar métricas:', err);
      return false;
    }
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
};

// Configuração do sistema de métricas
const setupMetricsSystem = (n8n) => {
  // Configuração do Supabase
  const supabaseConfig = {
    supabaseUrl: 'https://sua-url-do-supabase.supabase.co',
    supabaseKey: 'sua-chave-do-supabase',
    workflowId: n8n.workflowId || 'unknown',
    workflowName: n8n.workflowName || 'unknown'
  };
  
  // Verificar se o workflow tem a tag "agent"
  const hasAgentTag = Array.isArray(n8n.workflow?.tags) && 
    n8n.workflow.tags.some(tag => tag.name === 'agent');
  
  if (!hasAgentTag) {
    console.log('Workflow não possui a tag "agent". Métricas de leads não serão coletadas.');
    return null;
  }
  
  // Criar instância do handler
  const metricsHandler = new LeadMetricsHandler(supabaseConfig);
  
  // Armazenar globalmente para outros nós acessarem
  n8n.metrics = metricsHandler;
  
  // Configurar hooks para os nós relevantes
  
  // Hook para captura de leads (Create Users)
  n8n.hooks.on('node.Create Users.executeAfter', async (data) => {
    if (data.success) {
      const itemData = data.data.result.json || {};
      await metricsHandler.registerCapturedLead(itemData);
    }
  });
  
  // Hook para qualificação de leads (criar_agendamento)
  n8n.hooks.on('node.criar_agendamento.executeAfter', async (data) => {
    if (data.success && data.data.result.json?.success) {
      const itemData = {
        remotejid: data.data.result.json.phoneNumber || '',
        name: data.data.result.json.fullName || '',
        appointment: {
          date: data.data.result.json.date,
          time: data.data.result.json.time,
          doctorId: data.data.result.json.doctorId
        }
      };
      await metricsHandler.registerQualifiedLead(itemData);
    }
  });
  
  // Hook para desqualificação de leads (cancelarFUP)
  n8n.hooks.on('node.cancelarFUP.executeAfter', async (data) => {
    if (data.success) {
      const itemData = {
        remotejid: data.data.result.json.filters?.conditions[0]?.keyValue || '',
        reason: 'follow_up_cancelled'
      };
      await metricsHandler.registerUnqualifiedLead(itemData);
    }
  });
  
  // Hook para desqualificação de leads (User Off)
  n8n.hooks.on('node.User Off.executeAfter', async (data) => {
    if (data.success) {
      const itemData = {
        remotejid: data.data.result.json.remotejid || '',
        reason: 'user_deactivated'
      };
      await metricsHandler.registerUnqualifiedLead(itemData);
    }
  });
  
  return metricsHandler;
};

// Inicializar o sistema de métricas
const metricsHandler = setupMetricsSystem($);

// Retornar os itens para continuar o workflow normalmente
return items; 