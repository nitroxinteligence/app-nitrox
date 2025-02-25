import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  variant?: "default" | "card" | "metric" | "chart"
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#101114]",
        {
          "h-4 w-full": variant === "default",
          "h-[240px] w-full": variant === "card",
          "h-[120px] w-full": variant === "metric",
          "h-[300px] w-full": variant === "chart",
        },
        className
      )}
      {...props}
    />
  )
}

export function MetricSkeleton() {
  return (
    <div className="space-y-3 p-6 bg-[#1E1E1E] rounded-lg border border-[#272727]">
      <Skeleton className="h-4 w-[120px]" />
      <Skeleton className="h-8 w-[180px]" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3 p-6 bg-[#1E1E1E] rounded-lg border border-[#272727]">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-[150px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <Skeleton variant="chart" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <MetricSkeleton key={i} />
      ))}
      <div className="md:col-span-2 lg:col-span-3">
        <ChartSkeleton />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 p-6 bg-[#1E1E1E] rounded-lg border border-[#272727]">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-8 w-[180px]" />
          </div>
        ))}
      </div>
    </div>
  )
}
