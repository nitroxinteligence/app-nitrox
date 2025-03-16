"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useDashboardContext } from "@/contexts/DashboardContext"

interface UpdateMetricsButtonProps {
  className?: string
}

export function UpdateMetricsButton({ className }: UpdateMetricsButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { data } = useDashboardContext()
  
  // Obter contagem atual de métricas para mostrar a diferença depois
  const currentLeads = data.leadMetrics.length > 0 
    ? data.leadMetrics[data.leadMetrics.length - 1].total_leads || 0 
    : 0
  const currentQualified = data.leadMetrics.length > 0 
    ? data.leadMetrics[data.leadMetrics.length - 1].qualified_leads || 0 
    : 0

  const updateMetrics = async () => {
    try {
      setIsLoading(true)
      toast({
        title: "Atualizando métricas",
        description: "Extraindo dados do N8N e atualizando métricas...",
        duration: 3000,
      })

      // Chamar a API para atualização de métricas
      const response = await fetch("/api/metrics/lead-metrics")
      const data = await response.json()

      if (data.success) {
        // Calcular diferenças
        const newLeads = data.metrics.total_leads - currentLeads
        const newQualified = data.metrics.qualified_leads - currentQualified
        
        // Mostrar mensagem de sucesso com as diferenças
        toast({
          title: "Métricas atualizadas com sucesso",
          description: `
            Total: ${data.metrics.total_leads} leads (${newLeads >= 0 ? '+' : ''}${newLeads})
            Qualificados: ${data.metrics.qualified_leads} (${newQualified >= 0 ? '+' : ''}${newQualified})
            Taxa de conversão: ${data.metrics.conversion_rate}%
          `,
          variant: "default",
          duration: 5000,
        })

        // Recarregar a página para mostrar os dados atualizados
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        throw new Error(data.error || "Falha ao atualizar métricas")
      }
    } catch (error) {
      console.error("Erro ao atualizar métricas:", error)
      toast({
        title: "Erro ao atualizar métricas",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar sua solicitação",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={updateMetrics}
      disabled={isLoading}
      className={`relative overflow-hidden bg-[#1E1E1E] text-white border border-[#272727] hover:bg-[#272727] transition-all duration-300 ${className}`}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
      <span className="relative z-10">
        {isLoading ? "Atualizando..." : "Atualizar Métricas"}
      </span>
      {!isLoading && (
        <span className="absolute inset-0 bg-gradient-to-r from-[#58E877]/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </Button>
  )
} 