/**
 * Integração de Métricas de Leads para N8N
 * 
 * Este arquivo contém a lógica para integrar o LeadMetricsHandler
 * com os workflows do N8N que possuem a tag "agent".
 * 
 * Modo de uso:
 * 1. Carregar este arquivo no início do workflow via Code node
 * 2. Configurar a integração com o Supabase
 * 3. Adicionar os hooks nos nós relevantes
 * 
 * @author SiaFlow Development Team
 * @version 1.0.0
 */

// Importar o LeadMetricsHandler
const LeadMetricsHandler = require('./lead-metrics-handler');

/**
 * Configura a integração de métricas de leads no N8N
 * @param {Object} n8n Objeto global do N8N
 * @param {Object} config Configuração do Supabase
 */
function setupLeadMetricsIntegration(n8n, config) {
  // Criar instância do handler
  const metricsHandler = new LeadMetricsHandler({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    workflowId: n8n.workflow.id,
    workflowName: n8n.workflow.name
  });
  
  // Verificar se o workflow tem a tag "agent"
  const hasAgentTag = n8n.workflow.tags && 
    n8n.workflow.tags.some(tag => tag.name === 'agent');
  
  if (!hasAgentTag) {
    console.log('Workflow não possui a tag "agent". Métricas de leads não serão coletadas.');
    return null;
  }
  
  // Configurar os hooks para os nós relevantes
  setupNodeHooks(n8n, metricsHandler);
  
  return metricsHandler;
}

/**
 * Configura os hooks para os nós relevantes
 * @param {Object} n8n Objeto global do N8N
 * @param {LeadMetricsHandler} metricsHandler Instância do handler
 */
function setupNodeHooks(n8n, metricsHandler) {
  // Hook para captura de leads (após criação de usuário)
  n8n.hooks.on('node.Create Users.executeAfter', async (data) => {
    if (data.success) {
      const itemData = data.data.result.json || {};
      await metricsHandler.registerCapturedLead(itemData);
    }
  });
  
  // Hook para qualificação de leads (após agendamento)
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
  
  // Hook para desqualificação de leads (após cancelamento de FUP)
  n8n.hooks.on('node.cancelarFUP.executeAfter', async (data) => {
    if (data.success) {
      const itemData = {
        remotejid: data.data.result.json.filters?.conditions[0]?.keyValue || '',
        reason: 'follow_up_cancelled'
      };
      await metricsHandler.registerUnqualifiedLead(itemData);
    }
  });
  
  // Hook para desqualificação de leads (após usuário off)
  n8n.hooks.on('node.User Off.executeAfter', async (data) => {
    if (data.success) {
      const itemData = {
        remotejid: data.data.result.json.remotejid || '',
        reason: 'user_deactivated'
      };
      await metricsHandler.registerUnqualifiedLead(itemData);
    }
  });
}

// Exemplo de uso em um nó Code do N8N
/*
const { setupLeadMetricsIntegration } = require('./n8n-lead-metrics-integration');

// Configuração do Supabase
const supabaseConfig = {
  supabaseUrl: 'https://your-supabase-url.supabase.co',
  supabaseKey: 'your-supabase-key'
};

// Configurar integração
const metricsHandler = setupLeadMetricsIntegration($, supabaseConfig);

// O resto do código do workflow continua normalmente...
return items;
*/

module.exports = {
  setupLeadMetricsIntegration
}; 