"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { DateRange } from "react-day-picker"

interface ExportMetricsButtonProps {
  dateRange?: DateRange
  className?: string
}

export function ExportMetricsButton({ dateRange, className }: ExportMetricsButtonProps) {
  const handleExport = async () => {
    // Implementação da função de exportação
    console.log('Exportando métricas:', dateRange)
  }

  return (
    <Button
      onClick={handleExport}
      className="bg-[#1E1E1E] hover:bg-[#272727] text-white border border-[#272727] transition-colors"
    >
      <Download className="w-4 h-4 mr-2" />
      Exportar Métricas
    </Button>
  )
} 