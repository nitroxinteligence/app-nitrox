import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/use-toast'
import type { DashboardData, LeadMetrics } from '@/types/metrics'
import { DateRange } from 'react-day-picker'
import { startOfDay, endOfDay, subDays } from 'date-fns'

// Adicionar função auxiliar para ajustar o fuso horário para Brasília (UTC-3)
const adjustToBrasiliaTimezone = (date: Date): Date => {
  // Obtemos o offset para o fuso horário local onde o código está rodando
  const brasiliaOffset = -3 * 60; // UTC-3 em minutos
  
  // Ajustamos a data para o horário de Brasília
  return new Date(date.getTime() + (date.getTimezoneOffset() + brasiliaOffset) * 60000);
};

export function useDashboardMetrics(dateRange?: DateRange, useDefaultRange: boolean = true) {
  const [data, setData] = useState<DashboardData>({
    leadMetrics: [],
    salesMetrics: [],
    satisfactionMetrics: [],
    operationalMetrics: [],
    retentionMetrics: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Apenas consulta a tabela lead_metrics, que é a única que existe
      let leadQuery = supabase.from('lead_metrics').select('*')

      // Apply date filters based on dateRange or default 30-day period
      if (dateRange?.from) {
        // Use custom date range if provided
        const start = startOfDay(dateRange.from).toISOString()
        const end = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(adjustToBrasiliaTimezone(new Date())).toISOString()
        leadQuery = leadQuery.gte('date', start).lte('date', end)
      } else if (useDefaultRange) {
        // Use default 30-day period if no custom range is provided
        const end = endOfDay(adjustToBrasiliaTimezone(new Date())).toISOString()
        const start = startOfDay(subDays(adjustToBrasiliaTimezone(new Date()), 30)).toISOString()
        leadQuery = leadQuery.gte('date', start).lte('date', end)
      }

      // Add ordering
      leadQuery = leadQuery.order('date', { ascending: true })

      // Execute query
      const { data: leadData, error: leadError } = await leadQuery

      // Check for errors
      if (leadError) {
        console.error('Error fetching lead metrics:', leadError)
        throw new Error('Failed to fetch metrics data')
      }

      // Log fetched data with date range for debugging
      console.log('Fetched lead metrics data:', {
        leads: leadData?.length,
        dateRange: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        } : useDefaultRange ? {
          from: subDays(adjustToBrasiliaTimezone(new Date()), 30).toISOString(),
          to: adjustToBrasiliaTimezone(new Date()).toISOString()
        } : 'all',
        firstDate: leadData?.[0]?.date,
        lastDate: leadData?.[leadData.length - 1]?.date
      })

      // Gerar dados fictícios para as outras métricas usando os dados de leads
      const salesMetrics = generateDummySalesMetrics(leadData || [])
      const satisfactionMetrics = generateDummySatisfactionMetrics(leadData || [])
      const operationalMetrics = generateDummyOperationalMetrics(leadData || [])
      const retentionMetrics = generateDummyRetentionMetrics(leadData || [])

      // Update state with fetched data
      setData({
        leadMetrics: leadData || [],
        salesMetrics,
        satisfactionMetrics,
        operationalMetrics,
        retentionMetrics
      })

    } catch (err) {
      console.error('Error fetching metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar dados de métricas. Tente novamente."
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funções para gerar dados fictícios para as outras métricas
  const generateDummySalesMetrics = (leadMetrics: LeadMetrics[]) => {
    return leadMetrics.map(lead => ({
      id: lead.id,
      date: lead.date,
      total_opportunities: Math.round(lead.total_leads * 0.7),
      converted_opportunities: Math.round(lead.qualified_leads * 0.5),
      revenue: Math.round(lead.qualified_leads * 1000),
      total_cost: Math.round(lead.total_leads * 50),
      conversion_rate: lead.conversion_rate * 0.8,
      cost_per_conversion: Math.round(50 * (lead.total_leads / Math.max(lead.qualified_leads, 1))),
      average_ticket: Math.round(1000 + Math.random() * 500),
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }))
  }

  const generateDummySatisfactionMetrics = (leadMetrics: LeadMetrics[]) => {
    return leadMetrics.map(lead => ({
      id: lead.id,
      date: lead.date,
      total_responses: Math.round(lead.qualified_leads * 0.8),
      promoters: Math.round(lead.qualified_leads * 0.6),
      passives: Math.round(lead.qualified_leads * 0.2),
      detractors: Math.round(lead.qualified_leads * 0.2),
      satisfied_responses: Math.round(lead.qualified_leads * 0.7),
      positive_sentiments: Math.round(lead.qualified_leads * 0.65),
      total_sentiments: Math.round(lead.qualified_leads * 0.9),
      nps_score: Math.round(70 + Math.random() * 20),
      csat_score: Math.round(80 + Math.random() * 15),
      sentiment_score: Math.round(75 + Math.random() * 15),
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }))
  }

  const generateDummyOperationalMetrics = (leadMetrics: LeadMetrics[]) => {
    return leadMetrics.map(lead => ({
      id: lead.id,
      date: lead.date,
      total_interactions: Math.round(lead.total_leads * 1.5),
      self_service_interactions: Math.round(lead.total_leads * 0.9),
      fallback_interactions: Math.round(lead.total_leads * 0.1),
      technical_errors: Math.round(lead.total_leads * 0.05),
      total_resolution_time: Math.round(lead.total_leads * 5),
      resolved_interactions: Math.round(lead.total_leads * 1.4),
      self_service_rate: Math.round(80 + Math.random() * 15),
      fallback_rate: Math.round(5 + Math.random() * 10),
      avg_resolution_time: Math.round(60 + Math.random() * 30),
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }))
  }

  const generateDummyRetentionMetrics = (leadMetrics: LeadMetrics[]) => {
    return leadMetrics.map(lead => ({
      id: lead.id,
      date: lead.date,
      total_users: Math.round(lead.total_leads * 1.2),
      returning_users: Math.round(lead.qualified_leads * 1.1),
      churned_users: Math.round(lead.unqualified_leads * 0.8),
      total_sessions: Math.round(lead.total_leads * 3),
      return_rate: Math.round((lead.qualified_leads / Math.max(lead.total_leads, 1)) * 100),
      churn_rate: Math.round((lead.unqualified_leads / Math.max(lead.total_leads, 1)) * 100),
      usage_frequency: Math.round(2 + Math.random() * 3),
      created_at: lead.created_at,
      updated_at: lead.updated_at
    }))
  }

  // Set up real-time subscription apenas para a tabela lead_metrics
  useEffect(() => {
    const subscription = supabase
      .channel('lead-metrics-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_metrics' }, fetchMetrics)
      .subscribe()

    // Initial fetch
    fetchMetrics()

    // Cleanup subscriptions
    return () => {
      subscription.unsubscribe()
    }
  }, [dateRange, useDefaultRange])

  return {
    data,
    isLoading,
    error
  }
} 