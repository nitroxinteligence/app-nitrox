import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";

interface CampaignStatusProps {
  requestId: string;
}

export function CampaignStatus({ requestId }: CampaignStatusProps) {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Função para carregar status da campanha
  const fetchCampaignStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/meta-ads/campaign/status?requestId=${requestId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar status da campanha");
      }
      
      setCampaign(result.data);
    } catch (err) {
      console.error("Erro ao buscar status da campanha:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar status manualmente
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaignStatus();
    setRefreshing(false);
  };

  // Carregar dados inicialmente
  useEffect(() => {
    if (requestId) {
      fetchCampaignStatus();
    }
  }, [requestId]);

  // Renderizar estado de loading
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex flex-col items-center">
          <Spinner size="lg" className="mb-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Carregando status da campanha...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Renderizar estado de erro
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="mt-4 w-full"
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Renderizar dados da campanha
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Status da Campanha</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription>
          Informações sobre sua campanha no Meta Ads
        </CardDescription>
      </CardHeader>
      <CardContent>
        {campaign ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="flex items-center">
                <StatusBadge status={campaign.status} />
                {campaign.status === "created" && (
                  <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                )}
              </div>
            </div>
            
            {campaign.campaignId && (
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">ID da Campanha</span>
                <span className="font-mono text-sm">{campaign.campaignId}</span>
              </div>
            )}
            
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground">Última atualização</span>
              <span className="text-sm">
                {new Date(campaign.updatedAt).toLocaleString()}
              </span>
            </div>
            
            {campaign.campaignUrl && (
              <Button 
                variant="outline" 
                className="w-full mt-2"
                asChild
              >
                <a 
                  href={campaign.campaignUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visualizar no Meta Ads
                </a>
              </Button>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado disponível
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para exibir badge de status
function StatusBadge({ status }: { status: string }) {
  let variant = "outline";
  let label = status;
  
  switch (status) {
    case "pending":
      variant = "outline";
      label = "Pendente";
      break;
    case "processing":
      variant = "outline";
      label = "Processando";
      break;
    case "created":
      variant = "success";
      label = "Criada";
      break;
    case "failed":
      variant = "destructive";
      label = "Falhou";
      break;
    default:
      break;
  }
  
  return (
    <Badge variant={variant as any}>{label}</Badge>
  );
} 