/**
 * LeadMetricsHandler.js
 * 
 * Biblioteca para interceptar eventos nos workflows do N8N com tag "agent"
 * e registrar métricas relacionadas a leads no Supabase.
 * 
 * @author SiaFlow Development Team
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');

class LeadMetricsHandler {
  /**
   * Inicializa o manipulador de métricas
   * @param {Object} config Configuração da conexão com o Supabase
   * @param {string} config.supabaseUrl URL do Supabase
   * @param {string} config.supabaseKey Chave de API do Supabase
   * @param {string} config.workflowId ID do workflow atual
   * @param {string} config.workflowName Nome do workflow atual
   */
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.workflowId = config.workflowId;
    this.workflowName = config.workflowName;
    this.date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.metrics = {
      total_leads: 0,
      qualified_leads: 0,
      unqualified_leads: 0,
      conversion_rate: 0
    };
    
    // Carrega métricas existentes para o dia
    this.loadCurrentMetrics();
  }
  
  /**
   * Carrega as métricas atuais do banco de dados
   * @private
   */
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
  
  /**
   * Registra um novo lead capturado
   * @param {Object} leadData Dados do lead
   */
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
      
      return true;
    } catch (err) {
      console.error('Erro ao registrar lead capturado:', err);
      return false;
    }
  }
  
  /**
   * Registra um lead qualificado
   * @param {Object} leadData Dados do lead
   */
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
        .update({ status: 'qualified', qualified_at: new Date().toISOString() })
        .eq('lead_id', leadData.remotejid || leadData.id);
      
      return true;
    } catch (err) {
      console.error('Erro ao registrar lead qualificado:', err);
      return false;
    }
  }
  
  /**
   * Registra um lead desqualificado
   * @param {Object} leadData Dados do lead
   */
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
      
      return true;
    } catch (err) {
      console.error('Erro ao registrar lead desqualificado:', err);
      return false;
    }
  }
  
  /**
   * Atualiza a taxa de conversão
   * @private
   */
  updateConversionRate() {
    if (this.metrics.total_leads > 0) {
      this.metrics.conversion_rate = 
        (this.metrics.qualified_leads / this.metrics.total_leads) * 100;
    }
  }
  
  /**
   * Salva as métricas no Supabase
   * @private
   */
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
  
  /**
   * Obtém as métricas atuais
   * @returns {Object} Métricas atuais
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

module.exports = LeadMetricsHandler; 