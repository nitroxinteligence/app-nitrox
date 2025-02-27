import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OpenAIUsageSummary } from "@/lib/openai-tracker"
import { ReactNode } from "react"

interface UsageCardProps {
  title: string
  value: number
  previousValue?: number
  progress?: number
  usageData: OpenAIUsageSummary | null
  icon?: ReactNode
}

export default function UsageCard({
  title,
  value,
  previousValue,
  progress,
  usageData,
  icon
}: UsageCardProps) {
  // Formatar valores monetários em USD
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Calcular a variação percentual
  const percentageChange = previousValue
    ? ((value - previousValue) / previousValue) * 100
    : 0

  return (
    <Card className="border-white/10 bg-black/20 backdrop-blur-sm shadow-md overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/80">
          {title}
        </CardTitle>
        <div className="p-1.5 rounded-full bg-[#1a1a1c] border border-white/5">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {value !== undefined && title.includes("Créditos") 
            ? formatCurrency(value)
            : formatCurrency(value)}
        </div>
        
        {previousValue !== undefined && (
          <p className="text-xs text-white/60 mt-1">
            <span className={percentageChange > 0 ? "text-red-400" : "text-[#58E877]"}>
              {percentageChange > 0 ? "+" : ""}
              {percentageChange.toFixed(1)}%
            </span>{" "}
            comparado ao mês anterior
          </p>
        )}
        
        {progress !== undefined && (
          <div className="mt-4">
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  progress > 0.8 ? "bg-red-400" : progress > 0.5 ? "bg-yellow-400" : "bg-[#58E877]"
                } transition-all duration-500 ease-in-out`}
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-white/60 mt-1">
              {(progress * 100).toFixed(0)}% do limite utilizado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 