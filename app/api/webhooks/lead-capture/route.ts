import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuração de segurança
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default_secret';

// Tipos de dados para leads processados
interface ProcessedLead {
  remotejid: string;
  status: 'captured' | 'qualified' | 'unqualified';
  timestamp: string;
  workflowId: string;
  workflowName: string;
  nodeId?: string;
  executionId?: string;
  source?: string;
  campaign?: string;
  tags: string[];
  details?: any;
}

// Estrutura das métricas por dia
interface LeadMetrics {
  date: string;
  total_leads: number;
  qualified_leads: number;
  unqualified_leads: number;
  conversion_rate: number;
  workflow_id: string;
  workflow_name: string;
  agent_name?: string;
  hour: number;
  weekday: number;
  month: number;
  year: number;
  lead_details: any[];
  tags: string[];
  source?: string;
  campaign?: string;
}

// Função para normalizar números de telefone
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').replace(/^(55|0|)(\d{2})(\d{8,9})$/, '$2$3');
};

// Função para extrair partes da data
const getDateParts = (date: Date) => ({
  hour: date.getHours(),
  weekday: date.getDay(),
  month: date.getMonth() + 1,
  year: date.getFullYear()
});

/**
 * Processa um lead recebido do webhook e o formata no padrão da aplicação
 * @param data Dados recebidos do webhook do N8N
 * @returns Lead processado
 */
function processWebhookData(data: any): ProcessedLead | null {
  try {
    console.log('Processando dados do webhook:', JSON.stringify(data).substring(0, 500) + '...');
    
    // Verificar se os dados básicos estão presentes
    if (!data) {
      console.error('Dados do webhook vazios ou inválidos');
      return null;
    }
    
    // Extrair ID do contato (prioridade para número de telefone/WhatsApp)
    let remotejid: string | null = null;
    
    // Verificar vários caminhos possíveis para o número
    if (data.remotejid) remotejid = data.remotejid;
    else if (data.phone) remotejid = data.phone;
    else if (data.telefone) remotejid = data.telefone;
    else if (data.whatsapp) remotejid = data.whatsapp;
    else if (data.contact?.remotejid) remotejid = data.contact.remotejid;
    else if (data.contact?.phone) remotejid = data.contact.phone;
    else if (data.message?.key?.remoteJid) remotejid = data.message.key.remoteJid;
    
    // Se ainda não encontrou, procurar em campos aninhados
    if (!remotejid) {
      if (data.body?.remotejid) remotejid = data.body.remotejid;
      if (data.body?.phone) remotejid = data.body.phone;
      
      // Busca recursiva em até 2 níveis
      const findPhone = (obj: any, depth = 0): string | null => {
        if (depth > 2 || !obj || typeof obj !== 'object') return null;
        
        for (const [key, value] of Object.entries(obj)) {
          if (
            key.includes('phone') || 
            key.includes('telefone') || 
            key.includes('remotejid') || 
            key.includes('whatsapp')
          ) {
            if (typeof value === 'string') return value;
          }
          
          if (typeof value === 'object') {
            const found = findPhone(value, depth + 1);
            if (found) return found;
          }
        }
        
        return null;
      };
      
      remotejid = findPhone(data);
    }
    
    // Se ainda não encontrou, procurar pelo padrão 55DDxxxxxxxxx
    if (!remotejid) {
      const jsonStr = JSON.stringify(data);
      const phoneMatch = jsonStr.match(/(55\d{10,13})/);
      if (phoneMatch && phoneMatch[1]) {
        remotejid = phoneMatch[1];
      }
      
      // Ou pelo padrão de JID do WhatsApp
      if (!remotejid) {
        const jidMatch = jsonStr.match(/(\d+@s\.whatsapp\.net)/);
        if (jidMatch && jidMatch[1]) {
          remotejid = jidMatch[1];
        }
      }
    }
    
    // Se não encontrou nenhum ID, não podemos processar
    if (!remotejid) {
      console.error('Não foi possível encontrar o ID remoto nos dados do webhook');
      return null;
    }
    
    // Determinar o status do lead
    let status: 'captured' | 'qualified' | 'unqualified' = 'captured';
    
    if (data.status) {
      const statusStr = String(data.status).toLowerCase();
      if (
        statusStr.includes('qual') || 
        statusStr.includes('aprov') || 
        statusStr.includes('sucess') || 
        statusStr.includes('succe')
      ) {
        status = 'qualified';
      } else if (
        statusStr.includes('desqual') || 
        statusStr.includes('unqual') || 
        statusStr.includes('reject') || 
        statusStr.includes('rejeit') || 
        statusStr.includes('canc') || 
        statusStr.includes('fail') || 
        statusStr.includes('falha')
      ) {
        status = 'unqualified';
      }
    } else {
      // Se não tiver status explícito, tentar inferir do contexto
      const dataStr = JSON.stringify(data).toLowerCase();
      if (
        dataStr.includes('qualific') || 
        dataStr.includes('success') || 
        dataStr.includes('aprovad') || 
        dataStr.includes('confirmed')
      ) {
        status = 'qualified';
      } else if (
        dataStr.includes('unqual') || 
        dataStr.includes('desqual') || 
        dataStr.includes('cancel') || 
        dataStr.includes('reject') || 
        dataStr.includes('failed')
      ) {
        status = 'unqualified';
      }
    }
    
    // Extrair informações do workflow
    const workflowId = data.workflowId || data.workflow?.id || 'unknown';
    const workflowName = data.workflowName || data.workflow?.name || 'Unknown Workflow';
    
    // Extrair outras informações úteis
    const nodeId = data.nodeId || data.node?.id;
    const executionId = data.executionId || data.execution?.id;
    
    // Extrair tags (fontes e tipos de mídia)
    let tags: string[] = [];
    
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        tags = data.tags;
      } else if (typeof data.tags === 'string') {
        tags = data.tags.split(',').map((t: string) => t.trim());
      }
    }
    
    // Adicionar fonte como tag se existir
    const source = data.source || data.origem || data.channel || undefined;
    if (source && !tags.includes(source)) {
      tags.push(source);
    }
    
    // Inferir fonte de comunicação se não estiver explícita
    let inferredSource = source;
    if (!inferredSource) {
      if (remotejid.includes('@s.whatsapp.net') || dataStr.includes('whatsapp')) {
        inferredSource = 'whatsapp';
      } else if (dataStr.includes('instagram')) {
        inferredSource = 'instagram';
      } else if (dataStr.includes('facebook') || dataStr.includes('messenger')) {
        inferredSource = 'facebook';
      } else if (dataStr.includes('website') || dataStr.includes('site')) {
        inferredSource = 'website';
      }
    }
    
    // Extrair campanha
    const campaign = data.campaign || data.campanha || data.campaign_name || undefined;
    
    // Criar a estrutura final do lead processado
    const processedLead: ProcessedLead = {
      remotejid: normalizePhoneNumber(remotejid),
      status,
      timestamp: data.timestamp || new Date().toISOString(),
      workflowId,
      workflowName,
      nodeId,
      executionId,
      source: inferredSource,
      campaign,
      tags,
      details: data
    };
    
    console.log('Lead processado com sucesso:', {
      remotejid: processedLead.remotejid,
      status: processedLead.status,
      workflowName: processedLead.workflowName,
      source: processedLead.source,
      tags: processedLead.tags.join(', ')
    });
    
    return processedLead;
  } catch (error) {
    console.error('Erro ao processar dados do webhook:', error);
    return null;
  }
}

/**
 * Agrupa leads por data e calcula métricas
 * @param leads Array de leads processados
 * @returns Métricas agrupadas por data
 */
async function calculateMetrics(leads: ProcessedLead[]): Promise<LeadMetrics[]> {
  try {
    console.log(`Calculando métricas para ${leads.length} leads`);
    
    // Agrupar leads por data, workflowId e agente
    const groupedLeads: { [key: string]: ProcessedLead[] } = {};
    
    leads.forEach(lead => {
      const date = new Date(lead.timestamp);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Criar uma chave única por data e workflow
      const key = `${dateStr}_${lead.workflowId}`;
      
      if (!groupedLeads[key]) {
        groupedLeads[key] = [];
      }
      
      groupedLeads[key].push(lead);
    });
    
    // Calcular métricas para cada grupo
    const metrics: LeadMetrics[] = [];
    
    for (const [key, groupLeads] of Object.entries(groupedLeads)) {
      if (groupLeads.length === 0) continue;
      
      const [dateStr, workflowId] = key.split('_');
      const date = new Date(dateStr);
      const dateParts = getDateParts(date);
      
      // Contar leads por status
      const totalLeads = groupLeads.length;
      const qualifiedLeads = groupLeads.filter(lead => lead.status === 'qualified').length;
      const unqualifiedLeads = groupLeads.filter(lead => lead.status === 'unqualified').length;
      
      // Calcular taxa de conversão
      // Apenas leads qualificados ou desqualificados são considerados para a conversão
      const leadsForConversion = qualifiedLeads + unqualifiedLeads;
      const conversionRate = leadsForConversion > 0 ? qualifiedLeads / leadsForConversion : 0;
      
      // Extrair detalhes de cada lead (limitando a 5 para não sobrecarregar)
      const leadDetails = groupLeads.slice(0, 5).map(lead => ({
        phone: lead.remotejid,
        status: lead.status,
        timestamp: lead.timestamp
      }));
      
      // Combinar todas as tags dos leads
      const allTags = Array.from(
        new Set(
          groupLeads.flatMap(lead => lead.tags)
        )
      );
      
      // Identificar fontes predominantes
      const sources = groupLeads
        .map(lead => lead.source)
        .filter(Boolean) as string[];
      
      const sourceCount: { [key: string]: number } = {};
      sources.forEach(source => {
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });
      
      let predominantSource: string | undefined;
      let maxCount = 0;
      
      for (const [source, count] of Object.entries(sourceCount)) {
        if (count > maxCount) {
          maxCount = count;
          predominantSource = source;
        }
      }
      
      // Identificar campanha predominante
      const campaigns = groupLeads
        .map(lead => lead.campaign)
        .filter(Boolean) as string[];
      
      const campaignCount: { [key: string]: number } = {};
      campaigns.forEach(campaign => {
        campaignCount[campaign] = (campaignCount[campaign] || 0) + 1;
      });
      
      let predominantCampaign: string | undefined;
      maxCount = 0;
      
      for (const [campaign, count] of Object.entries(campaignCount)) {
        if (count > maxCount) {
          maxCount = count;
          predominantCampaign = campaign;
        }
      }
      
      // Criar o objeto de métricas
      const metric: LeadMetrics = {
        date: dateStr,
        total_leads: totalLeads,
        qualified_leads: qualifiedLeads,
        unqualified_leads: unqualifiedLeads,
        conversion_rate: conversionRate,
        workflow_id: workflowId,
        workflow_name: groupLeads[0].workflowName,
        agent_name: groupLeads[0].workflowName.split(' - ')[0], // Extrair nome do agente do nome do workflow
        hour: dateParts.hour,
        weekday: dateParts.weekday,
        month: dateParts.month,
        year: dateParts.year,
        lead_details: leadDetails,
        tags: allTags,
        source: predominantSource,
        campaign: predominantCampaign
      };
      
      metrics.push(metric);
    }
    
    console.log(`Calculadas ${metrics.length} métricas diárias`);
    return metrics;
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    return [];
  }
}

/**
 * Salva métricas no Supabase
 * @param metrics Array de métricas a serem salvas
 * @returns Resultado da operação
 */
async function saveMetricsToSupabase(metrics: LeadMetrics[]) {
  try {
    console.log(`\n=== Iniciando salvamento no Supabase ===`);
    console.log(`Preparando para salvar ${metrics.length} registros`);
    
    // Converter dados para o formato do Supabase
    const saveResults = [];
    
    for (const metric of metrics) {
      console.log(`Salvando métrica para data ${metric.date} - Workflow: ${metric.workflow_name}`);
      
      try {
        // Verificar se já existe um registro para esta data e workflow
        const { data: existingData, error: queryError } = await supabase
          .from('lead_metrics')
          .select('id')
          .eq('date', metric.date)
          .eq('workflow_id', metric.workflow_id);
        
        if (queryError) {
          console.error(`Erro ao verificar métrica existente:`, queryError);
          continue;
        }
        
        let result;
        
        if (existingData && existingData.length > 0) {
          // Atualizar registro existente
          const { data, error } = await supabase
            .from('lead_metrics')
            .update(metric)
            .eq('id', existingData[0].id)
            .select();
          
          if (error) {
            console.error(`Erro ao atualizar métrica:`, error);
            continue;
          }
          
          result = { updated: true, data };
          console.log(`Métrica atualizada com sucesso`);
        } else {
          // Criar novo registro
          const { data, error } = await supabase
            .from('lead_metrics')
            .insert(metric)
            .select();
          
          if (error) {
            console.error(`Erro ao inserir métrica:`, error);
            continue;
          }
          
          result = { created: true, data };
          console.log(`Métrica salva com sucesso`);
        }
        
        saveResults.push(result);
      } catch (saveError) {
        console.error(`Erro ao salvar métrica para ${metric.date}:`, saveError);
      }
    }
    
    console.log(`=== Salvamento no Supabase concluído ===`);
    console.log(`${saveResults.length}/${metrics.length} métricas salvas no Supabase`);
    
    return saveResults;
  } catch (error) {
    console.error('Erro ao salvar métricas no Supabase:', error);
    throw error;
  }
}

/**
 * Verifica a autenticação do webhook usando o segredo compartilhado
 * @param request Requisição HTTP recebida
 * @returns Verdadeiro se autenticado, falso caso contrário
 */
function authenticateWebhook(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-webhook-secret');
  
  // Se não houver segredo configurado, permitir em ambientes de desenvolvimento
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'default_secret') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ AVISO DE SEGURANÇA: Webhook sem segredo definido em ambiente de desenvolvimento');
      return true;
    }
  }
  
  // Verificar cabeçalho de autenticação
  if (!authHeader) {
    console.error('Requisição sem cabeçalho de autenticação');
    return false;
  }
  
  // Comparar com o segredo configurado
  return authHeader === WEBHOOK_SECRET;
}

/**
 * Endpoint POST para receber dados de webhook do N8N
 */
export async function POST(request: NextRequest) {
  console.log(`\n======== WEBHOOK RECEBIDO: LEAD CAPTURE ========`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Verificar autenticação
    if (!authenticateWebhook(request)) {
      console.error('Falha na autenticação do webhook');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Recuperar dados da requisição
    const data = await request.json();
    console.log('Dados recebidos do webhook');
    
    // Processar os dados
    const processedLead = processWebhookData(data);
    
    if (!processedLead) {
      console.error('Não foi possível processar os dados do webhook');
      return NextResponse.json(
        { success: false, message: 'Invalid data format' },
        { status: 400 }
      );
    }
    
    // Calcular métricas
    const metrics = await calculateMetrics([processedLead]);
    
    if (metrics.length === 0) {
      console.error('Não foi possível calcular métricas com os dados fornecidos');
      return NextResponse.json(
        { success: false, message: 'Failed to calculate metrics' },
        { status: 500 }
      );
    }
    
    // Salvar métricas no Supabase
    const saveResults = await saveMetricsToSupabase(metrics);
    
    return NextResponse.json({
      success: true,
      message: 'Lead captured and metrics updated successfully',
      lead: {
        phone: processedLead.remotejid,
        status: processedLead.status,
        workflow: processedLead.workflowName,
        source: processedLead.source,
        timestamp: processedLead.timestamp
      },
      metrics: {
        date: metrics[0].date,
        workflow: metrics[0].workflow_name,
        total_leads: metrics[0].total_leads,
        qualified_leads: metrics[0].qualified_leads,
        conversion_rate: metrics[0].conversion_rate
      }
    });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: (error as Error).message },
      { status: 500 }
    );
  }
} 