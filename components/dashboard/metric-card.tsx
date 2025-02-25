import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  className
}: MetricCardProps) {
  return (
    <Card className={cn(
      "bg-[#1E1E1E] border-[#272727] p-6",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#E8F3ED]/60">{title}</p>
          <h4 className="mt-2 text-2xl font-semibold text-white">{value}</h4>
          {description && (
            <p className="mt-1 text-sm text-[#E8F3ED]/60">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              {trend.isPositive ? (
                <svg
                  className="w-4 h-4 text-[#58E877]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-[#58E877]" : "text-red-500"
                )}
              >
                {trend.value}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-[#272727] rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
} 