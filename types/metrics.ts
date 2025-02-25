export interface LeadMetrics {
  id: string
  date: string
  total_leads: number
  qualified_leads: number
  unqualified_leads: number
  conversion_rate: number
  created_at: string
  updated_at: string
}

export interface SalesMetrics {
  id: string
  date: string
  total_opportunities: number
  converted_opportunities: number
  revenue: number
  total_cost: number
  conversion_rate: number
  cost_per_conversion: number
  average_ticket: number
  created_at: string
  updated_at: string
}

export interface SatisfactionMetrics {
  id: string
  date: string
  total_responses: number
  promoters: number
  passives: number
  detractors: number
  satisfied_responses: number
  positive_sentiments: number
  total_sentiments: number
  nps_score: number
  csat_score: number
  sentiment_score: number
  created_at: string
  updated_at: string
}

export interface OperationalMetrics {
  id: string
  date: string
  total_interactions: number
  self_service_interactions: number
  fallback_interactions: number
  technical_errors: number
  total_resolution_time: number
  resolved_interactions: number
  self_service_rate: number
  fallback_rate: number
  avg_resolution_time: number
  created_at: string
  updated_at: string
}

export interface RetentionMetrics {
  id: string
  date: string
  total_users: number
  returning_users: number
  churned_users: number
  total_sessions: number
  return_rate: number
  churn_rate: number
  usage_frequency: number
  created_at: string
  updated_at: string
}

export interface DashboardData {
  leadMetrics: LeadMetrics[]
  salesMetrics: SalesMetrics[]
  satisfactionMetrics: SatisfactionMetrics[]
  operationalMetrics: OperationalMetrics[]
  retentionMetrics: RetentionMetrics[]
} 