import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/use-toast'
import type { DashboardData } from '@/types/metrics'
import { DateRange } from 'react-day-picker'
import { startOfDay, endOfDay, subDays } from 'date-fns'

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

      let queries = {
        lead: supabase.from('lead_metrics').select('*'),
        sales: supabase.from('sales_metrics').select('*'),
        satisfaction: supabase.from('satisfaction_metrics').select('*'),
        operational: supabase.from('operational_metrics').select('*'),
        retention: supabase.from('retention_metrics').select('*')
      }

      // Apply date filters based on dateRange or default 30-day period
      if (dateRange?.from) {
        // Use custom date range if provided
        const start = startOfDay(dateRange.from).toISOString()
        const end = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(new Date()).toISOString()

        queries = {
          lead: queries.lead.gte('date', start).lte('date', end),
          sales: queries.sales.gte('date', start).lte('date', end),
          satisfaction: queries.satisfaction.gte('date', start).lte('date', end),
          operational: queries.operational.gte('date', start).lte('date', end),
          retention: queries.retention.gte('date', start).lte('date', end)
        }
      } else if (useDefaultRange) {
        // Use default 30-day period if no custom range is provided
        const end = endOfDay(new Date()).toISOString()
        const start = startOfDay(subDays(new Date(), 30)).toISOString()

        queries = {
          lead: queries.lead.gte('date', start).lte('date', end),
          sales: queries.sales.gte('date', start).lte('date', end),
          satisfaction: queries.satisfaction.gte('date', start).lte('date', end),
          operational: queries.operational.gte('date', start).lte('date', end),
          retention: queries.retention.gte('date', start).lte('date', end)
        }
      }

      // Add ordering to all queries
      queries = {
        lead: queries.lead.order('date', { ascending: true }),
        sales: queries.sales.order('date', { ascending: true }),
        satisfaction: queries.satisfaction.order('date', { ascending: true }),
        operational: queries.operational.order('date', { ascending: true }),
        retention: queries.retention.order('date', { ascending: true })
      }

      // Execute all queries
      const [
        { data: leadData, error: leadError },
        { data: salesData, error: salesError },
        { data: satisfactionData, error: satisfactionError },
        { data: operationalData, error: operationalError },
        { data: retentionData, error: retentionError }
      ] = await Promise.all([
        queries.lead,
        queries.sales,
        queries.satisfaction,
        queries.operational,
        queries.retention
      ])

      // Check for errors
      if (leadError || salesError || satisfactionError || operationalError || retentionError) {
        throw new Error('Failed to fetch metrics data')
      }

      // Log fetched data with date range for debugging
      console.log('Fetched metrics data:', {
        leads: leadData?.length,
        sales: salesData?.length,
        satisfaction: satisfactionData?.length,
        operational: operationalData?.length,
        retention: retentionData?.length,
        dateRange: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        } : useDefaultRange ? {
          from: subDays(new Date(), 30).toISOString(),
          to: new Date().toISOString()
        } : 'all',
        firstDate: leadData?.[0]?.date,
        lastDate: leadData?.[leadData.length - 1]?.date
      })

      // Update state with fetched data
      setData({
        leadMetrics: leadData || [],
        salesMetrics: salesData || [],
        satisfactionMetrics: satisfactionData || [],
        operationalMetrics: operationalData || [],
        retentionMetrics: retentionData || []
      })

    } catch (err) {
      console.error('Error fetching metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch metrics data. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Set up real-time subscriptions and initial fetch
  useEffect(() => {
    const subscriptions = [
      supabase
        .channel('lead-metrics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_metrics' }, fetchMetrics)
        .subscribe(),
      supabase
        .channel('sales-metrics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_metrics' }, fetchMetrics)
        .subscribe(),
      supabase
        .channel('satisfaction-metrics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'satisfaction_metrics' }, fetchMetrics)
        .subscribe(),
      supabase
        .channel('operational-metrics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_metrics' }, fetchMetrics)
        .subscribe(),
      supabase
        .channel('retention-metrics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'retention_metrics' }, fetchMetrics)
        .subscribe()
    ]

    // Initial fetch
    fetchMetrics()

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(subscription => subscription.unsubscribe())
    }
  }, [dateRange, useDefaultRange]) // Add useDefaultRange to dependencies

  return {
    data,
    isLoading,
    error
  }
} 