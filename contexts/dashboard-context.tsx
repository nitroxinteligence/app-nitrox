import { createContext, useContext, useState } from 'react'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { DashboardData } from '@/types/metrics'
import { DateRange } from 'react-day-picker'

interface DashboardContextData {
  data: DashboardData
  isLoading: boolean
  error: string | null
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
}

const DashboardContext = createContext<DashboardContextData>({} as DashboardContextData)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>()
  const { data, isLoading, error } = useDashboardMetrics(dateRange)

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, dateRange, setDateRange }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardContext() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider')
  }
  return context
} 