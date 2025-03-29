import { createClient } from '@/lib/supabase/client';

export interface CampaignConfig {
  name: string;
  objective: string;
  dailyBudget: number;
  audience: {
    ageMin: number;
    ageMax: number;
    genders: string[];
    locations: {
      type: string;
      key: string;
    }[];
    interests: string[];
  };
  adCreative: {
    title: string;
    description: string;
    primaryText: string;
    callToAction: string;
    websiteUrl: string;
  };
}

export interface CampaignRequest {
  id: string;
  user_id: string;
  agent_id: string;
  chat_session_id: string;
  briefing_data: any;
  campaign_config: CampaignConfig;
  status: 'pending' | 'processing' | 'created' | 'failed';
  campaign_id?: string;
  error_details?: string;
  created_at: string;
  updated_at: string;
}

// Cliente Supabase
const supabase = createClient();

export class CampaignService {
  /**
   * Solicita a criação de uma nova campanha
   */
  static async requestCampaign(
    agentId: string,
    sessionId: string,
    briefingData: any,
    campaignConfig: CampaignConfig
  ): Promise<{ success: boolean; data?: CampaignRequest; error?: string }> {
    try {
      // Verificar autenticação
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Enviar para o endpoint
      const response = await fetch('/api/meta-ads/campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          briefingData,
          campaignConfig,
          agentId,
          sessionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao solicitar campanha:', result);
        return {
          success: false,
          error: result.error || 'Erro ao processar solicitação',
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Erro ao solicitar campanha:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Verifica o status de uma solicitação de campanha
   */
  static async checkCampaignStatus(
    requestId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`/api/meta-ads/status?requestId=${requestId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao verificar status:', result);
        return {
          success: false,
          error: result.error || 'Erro ao verificar status',
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém as campanhas do usuário
   */
  static async getUserCampaigns(): Promise<{
    success: boolean;
    data?: CampaignRequest[];
    error?: string;
  }> {
    try {
      const response = await fetch('/api/meta-ads/campaign', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao buscar campanhas:', result);
        return {
          success: false,
          error: result.error || 'Erro ao buscar campanhas',
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Converte as informações do briefing em uma configuração de campanha
   */
  static createCampaignConfigFromBriefing(briefingData: any): CampaignConfig {
    const defaultConfig: CampaignConfig = {
      name: `Campanha ${new Date().toISOString().split('T')[0]}`,
      objective: 'CONVERSIONS',
      dailyBudget: 50,
      audience: {
        ageMin: 18,
        ageMax: 65,
        genders: ['1', '2'], // 1=homem, 2=mulher
        locations: [
          {
            type: 'country',
            key: 'BR',
          },
        ],
        interests: [],
      },
      adCreative: {
        title: 'Novo Produto',
        description: 'Experimente agora!',
        primaryText: 'Descubra nosso produto incrível.',
        callToAction: 'LEARN_MORE',
        websiteUrl: 'https://example.com',
      },
    };

    // Lógica para extrair e mapear informações do briefing para a configuração
    // Esta é uma implementação básica que deve ser expandida com base na estrutura real do briefing
    try {
      if (briefingData.businessName) {
        defaultConfig.name = `Campanha ${briefingData.businessName} - ${new Date().toISOString().split('T')[0]}`;
      }

      if (briefingData.objective) {
        // Mapear objetivos de negócio para objetivos do Meta Ads
        const objectiveMap: Record<string, string> = {
          brand_awareness: 'BRAND_AWARENESS',
          reach: 'REACH',
          traffic: 'TRAFFIC',
          engagement: 'ENGAGEMENT',
          lead_generation: 'LEAD_GENERATION',
          conversions: 'CONVERSIONS',
          sales: 'CONVERSIONS',
        };
        
        const normalizedObjective = briefingData.objective.toLowerCase().replace(/\s+/g, '_');
        defaultConfig.objective = objectiveMap[normalizedObjective] || 'CONVERSIONS';
      }

      if (briefingData.budget) {
        // Extrair valor numérico do orçamento
        const budget = parseFloat(briefingData.budget.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(budget)) {
          defaultConfig.dailyBudget = budget;
        }
      }

      if (briefingData.audience) {
        // Extrair informações de público
        if (briefingData.audience.ageRange) {
          const ageRange = briefingData.audience.ageRange.split('-');
          if (ageRange.length === 2) {
            defaultConfig.audience.ageMin = parseInt(ageRange[0]);
            defaultConfig.audience.ageMax = parseInt(ageRange[1]);
          }
        }

        if (briefingData.audience.gender) {
          const genderMap: Record<string, string[]> = {
            male: ['1'],
            female: ['2'],
            both: ['1', '2'],
          };
          defaultConfig.audience.genders = genderMap[briefingData.audience.gender] || ['1', '2'];
        }

        if (briefingData.audience.locations) {
          defaultConfig.audience.locations = briefingData.audience.locations.map((loc: string) => ({
            type: 'country',
            key: loc,
          }));
        }

        if (briefingData.audience.interests) {
          defaultConfig.audience.interests = briefingData.audience.interests;
        }
      }

      if (briefingData.message) {
        defaultConfig.adCreative.primaryText = briefingData.message;
      }

      if (briefingData.title) {
        defaultConfig.adCreative.title = briefingData.title;
      }

      if (briefingData.website) {
        defaultConfig.adCreative.websiteUrl = briefingData.website;
      }

      return defaultConfig;
    } catch (error) {
      console.error('Erro ao criar configuração de campanha a partir do briefing:', error);
      return defaultConfig;
    }
  }
} 