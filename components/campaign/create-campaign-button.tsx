"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/ui/icons"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, CheckCircle, AlertTriangle, XCircle, AlertCircle, ExternalLink } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { CampaignService } from "@/lib/campaign-service"
import { CampaignStatus } from "@/components/campaign/campaign-status"

interface CreateCampaignButtonProps {
  agentId: string
  sessionId: string
  briefingData: any
  className?: string
}

export function CreateCampaignButton({
  agentId,
  sessionId,
  briefingData,
  className,
}: CreateCampaignButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [requestStatus, setRequestStatus] = useState<{
    status: "idle" | "processing" | "success" | "error"
    message: string
    requestId?: string
  }>({
    status: "idle",
    message: "",
  })
  const { toast } = useToast()

  const handleCreateCampaign = async () => {
    if (!briefingData) return;
    
    try {
      setIsLoading(true);
      setRequestStatus({
        status: "processing",
        message: "Solicitação de campanha enviada com sucesso! Processando...",
      });
      
      // Gerar configuração da campanha com base no briefing
      const campaignConfig = CampaignService.createCampaignConfigFromBriefing(briefingData);
      
      // Chamar a API para criar a campanha
      const response = await fetch("/api/meta-ads/campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          briefingData,
          campaignConfig,
          agentId,
          sessionId
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar campanha");
      }
      
      // Armazenar o ID da solicitação
      const requestId = result.data?.requestId;
      
      setRequestStatus({
        status: "success",
        message: "Campanha criada com sucesso!",
        requestId
      });
      
      setIsDialogOpen(false);
      setStatusDialogOpen(true);
      
      // Iniciar polling de status
      if (requestId) {
        startStatusPolling(requestId);
      }
    } catch (err) {
      console.error("Erro ao criar campanha:", err);
      setRequestStatus({
        status: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao criar campanha",
      });
      toast({
        variant: "destructive",
        title: "Erro ao criar campanha",
        description: "Ocorreu um erro inesperado",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startStatusPolling = async (requestId: string) => {
    // Função para verificar o status
    const checkStatus = async () => {
      try {
        const result = await CampaignService.checkCampaignStatus(requestId)
        
        if (result.success && result.data) {
          const { status } = result.data
          
          if (status === "created") {
            setRequestStatus({
              status: "success",
              message: "Campanha criada com sucesso!",
              requestId,
            })
            return true // Encerra o polling
          } else if (status === "failed") {
            setRequestStatus({
              status: "error",
              message: result.data.errorDetails || "Falha ao criar campanha",
              requestId,
            })
            return true // Encerra o polling
          } else {
            // Ainda em processamento, atualiza a mensagem
            setRequestStatus({
              status: "processing",
              message: result.data.message || "Processando sua solicitação...",
              requestId,
            })
            return false // Continua o polling
          }
        } else {
          // Erro ao verificar status
          return false
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error)
        return false
      }
    }
    
    // Iniciar polling
    const poll = async () => {
      // Verificar imediatamente
      const done = await checkStatus()
      if (done) return
      
      // Continuar verificando a cada 3 segundos
      const interval = setInterval(async () => {
        const done = await checkStatus()
        if (done) {
          clearInterval(interval)
        }
      }, 3000)
      
      // Limpar intervalo após 2 minutos para evitar polling infinito
      setTimeout(() => {
        clearInterval(interval)
        // Se ainda estiver em processamento após 2 minutos, mostrar mensagem
        if (requestStatus.status === "processing") {
          setRequestStatus({
            status: "processing",
            message: "A solicitação está demorando mais que o esperado. Você pode fechar esta janela e verificar o status mais tarde.",
            requestId,
          })
        }
      }, 120000)
    }
    
    // Iniciar o polling
    poll()
  }

  return (
    <>
      <Button
        variant="default"
        onClick={() => setIsDialogOpen(true)}
        className={`bg-gradient-to-r from-[#58E877] to-[#35D754] hover:from-[#35D754] hover:to-[#28C947] text-black font-medium ${className}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Icons.megaphone className="mr-2 h-4 w-4" />
            Criar Campanha
          </>
        )}
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0A0A0B] border-[#272727] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-[#58E877] to-white bg-clip-text text-transparent">
              Criar Campanha no Meta Ads
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Sua campanha será criada automaticamente com base nas informações do briefing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-sm text-white/80">
              Nossa IA já analisou todas as informações do seu briefing e está pronta para 
              criar uma campanha personalizada no Meta Ads. 
              Após a criação, você poderá revisar e ativar a campanha quando estiver pronto.
            </p>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="bg-transparent border-[#272727] text-white hover:bg-[#272727] transition-colors"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCampaign}
                className="bg-[#58E877] text-black hover:bg-[#4EDB82] transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Criar Minha Campanha"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="bg-[#0A0A0B] border-[#272727] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-[#58E877] to-white bg-clip-text text-transparent">
              Status da Campanha
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {requestStatus.requestId ? (
              <CampaignStatus requestId={requestStatus.requestId} />
            ) : (
              <div className="flex items-center justify-center p-6 bg-[#121214] rounded-md border border-[#272727]">
                {requestStatus.status === "processing" && (
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-gradient-to-r from-[#58E877] to-[#35D754] p-3 mb-4">
                      <Loader2 className="h-6 w-6 animate-spin text-black" />
                    </div>
                    <h3 className="text-lg font-medium">Processando Solicitação</h3>
                    <p className="text-sm text-white/70 mt-2 max-w-xs">
                      {requestStatus.message}
                    </p>
                  </div>
                )}
                
                {requestStatus.status === "success" && (
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-gradient-to-r from-[#58E877] to-[#35D754] p-3 mb-4">
                      <CheckCircle className="h-6 w-6 text-black" />
                    </div>
                    <h3 className="text-lg font-medium">Campanha Criada</h3>
                    <p className="text-sm text-white/70 mt-2 max-w-xs">
                      {requestStatus.message}
                    </p>
                  </div>
                )}
                
                {requestStatus.status === "error" && (
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-red-500 p-3 mb-4">
                      <XCircle className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-medium">Erro</h3>
                    <p className="text-sm text-white/70 mt-2 max-w-xs">
                      {requestStatus.message}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setStatusDialogOpen(false)}
                className="bg-transparent border-[#272727] text-white hover:bg-[#272727] transition-colors"
              >
                Fechar
              </Button>
              {requestStatus.status === "success" && (
                <Button
                  className="bg-[#58E877] text-black hover:bg-[#4EDB82] transition-colors"
                  onClick={() => {
                    window.open(`https://business.facebook.com/adsmanager/manage/campaigns`, '_blank');
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir Meta Ads
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 