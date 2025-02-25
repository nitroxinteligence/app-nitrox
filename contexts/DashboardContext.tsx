"use client"

import { createContext, useContext, ReactNode } from 'react'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { DateRange } from 'react-day-picker'

interface DashboardContextProps {
  data: ReturnType<typeof useDashboardMetrics>['data']
  isLoading: boolean
  error: string | null
  dateRange?: DateRange
  setDateRange: (range: DateRange | undefined) => void
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined)

interface DashboardProviderProps {
  children: ReactNode
  dateRange?: DateRange
  setDateRange: (range: DateRange | undefined) => void
}

export function DashboardProvider({ children, dateRange, setDateRange }: DashboardProviderProps) {
  const { data, isLoading, error } = useDashboardMetrics(dateRange, true)

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, dateRange, setDateRange }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardContext() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider')
  }
  return context
} 