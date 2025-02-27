import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OpenAIUsageSummary } from "@/lib/openai-tracker"
import { Database } from "lucide-react"

interface ModelUsageTableProps {
  usageData: OpenAIUsageSummary | null
}

export default function ModelUsageTable({ usageData }: ModelUsageTableProps) {
  // Se não houver dados, mostrar mensagem
  if (!usageData || !usageData.modelUsage || usageData.modelUsage.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <Database className="h-8 w-8 text-white/30" />
        <p className="text-white/60">Sem dados de uso por modelo disponíveis</p>
      </div>
    )
  }

  // Formatar valores monetários em USD
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value)
  }

  // Formatar números com separadores de milhar
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  return (
    <div className="relative overflow-x-auto rounded-md border border-white/10">
      <Table>
        <TableHeader className="bg-black/30">
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white/70">Modelo</TableHead>
            <TableHead className="text-right text-white/70">Tokens</TableHead>
            <TableHead className="text-right text-white/70">Custo</TableHead>
            <TableHead className="text-right text-white/70">% do Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usageData.modelUsage.map((model, index) => {
            const percentOfTotal = (model.cost / usageData.currentMonthTotal) * 100

            return (
              <TableRow 
                key={index} 
                className="border-white/10 hover:bg-white/5 transition-colors"
              >
                <TableCell className="font-medium text-white/90">{model.model}</TableCell>
                <TableCell className="text-right text-white/70">{formatNumber(model.totalTokens)}</TableCell>
                <TableCell className="text-right text-[#58E877]">{formatCurrency(model.cost)}</TableCell>
                <TableCell className="text-right text-white/70">{percentOfTotal.toFixed(1)}%</TableCell>
              </TableRow>
            )
          })}
          <TableRow className="border-white/10 bg-black/20 hover:bg-black/30">
            <TableCell className="font-bold text-white">Total</TableCell>
            <TableCell className="text-right font-bold text-white">
              {formatNumber(usageData.modelUsage.reduce((sum, model) => sum + model.totalTokens, 0))}
            </TableCell>
            <TableCell className="text-right font-bold text-[#58E877]">
              {formatCurrency(usageData.currentMonthTotal)}
            </TableCell>
            <TableCell className="text-right font-bold text-white">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
} 