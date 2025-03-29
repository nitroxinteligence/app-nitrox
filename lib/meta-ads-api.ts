import { initSDK, BizSdkInterface } from 'facebook-nodejs-business-sdk';

// Classes do SDK do Facebook
const { 
  FacebookAdsApi, 
  AdAccount, 
  Campaign, 
  AdSet, 
  Ad, 
  AdCreative, 
  TargetingSearch
} = require('facebook-nodejs-business-sdk') as BizSdkInterface;

// Carregar credenciais do ambiente
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_ACCOUNT_ID = process.env.META_ACCOUNT_ID;

export interface CampaignParams {
  name: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  targetingSpec?: TargetingSpec;
}

export interface AdSetParams {
  name: string;
  campaignId: string;
  optimizationGoal: string;
  billingEvent?: string;
  bidAmount?: number;
  targetingSpec: TargetingSpec;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

export interface AdCreativeParams {
  name: string;
  adAccountId: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageHash?: string;
  linkUrl: string;
  callToAction: string;
}

export interface AdParams {
  name: string;
  adsetId: string;
  creativeId: string;
  status?: string;
}

export interface TargetingSpec {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    cities?: any[];
    regions?: any[];
  };
  interests?: any[];
  behaviors?: any[];
  device_platforms?: string[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
}

export interface MetaAdsResponse {
  success: boolean;
  data?: any;
  error?: string;
  details?: any;
}

export interface CreateCampaignResponse extends MetaAdsResponse {
  data?: {
    campaignId?: string;
    adSetId?: string;
    adCreativeId?: string;
    adId?: string;
  };
}

/**
 * Classe para integração com a API do Meta Ads
 */
export class MetaAdsAPI {
  private api: typeof FacebookAdsApi;
  private adAccount: any;

  constructor() {
    if (!META_APP_ID || !META_APP_SECRET || !META_ACCESS_TOKEN || !META_ACCOUNT_ID) {
      throw new Error('Credenciais do Meta Ads não configuradas corretamente');
    }

    // Inicializar a API do Facebook
    this.api = FacebookAdsApi.init(META_ACCESS_TOKEN);
    this.adAccount = new AdAccount(`act_${META_ACCOUNT_ID}`);
    
    // Configurar modo de debug quando necessário
    if (process.env.NODE_ENV === 'development') {
      this.api.setDebug(true);
    }
  }

  /**
   * Cria uma campanha no Meta Ads
   */
  async createCampaign(params: CampaignParams): Promise<MetaAdsResponse> {
    try {
      // Validar parâmetros obrigatórios
      if (!params.name || !params.objective) {
        throw new Error('Nome e objetivo da campanha são obrigatórios');
      }

      // Configurar parâmetros da campanha
      const campaignParams: any = {
        name: params.name,
        objective: params.objective,
        status: params.status || 'PAUSED',
        special_ad_categories: [],
      };

      // Configurar orçamento (diário ou lifetime)
      if (params.dailyBudget) {
        campaignParams.daily_budget = Math.round(params.dailyBudget * 100); // Converter para centavos
      } else if (params.lifetimeBudget) {
        campaignParams.lifetime_budget = Math.round(params.lifetimeBudget * 100);
      }

      // Configurar datas
      if (params.startDate) {
        campaignParams.start_time = params.startDate.toISOString();
      }
      if (params.endDate) {
        campaignParams.end_time = params.endDate.toISOString();
      }

      // Criar campanha
      console.log('Criando campanha com parâmetros:', campaignParams);
      const campaign = await this.adAccount.createCampaign([], campaignParams);

      console.log('Campanha criada com sucesso:', campaign);
      return {
        success: true,
        data: {
          campaignId: campaign.id
        }
      };

    } catch (error: any) {
      console.error('Erro ao criar campanha:', error);
      return {
        success: false,
        error: 'Falha ao criar campanha',
        details: error.message || error
      };
    }
  }

  /**
   * Cria um conjunto de anúncios (AdSet) no Meta Ads
   */
  async createAdSet(params: AdSetParams): Promise<MetaAdsResponse> {
    try {
      // Validar parâmetros obrigatórios
      if (!params.name || !params.campaignId || !params.optimizationGoal || !params.targetingSpec) {
        throw new Error('Parâmetros insuficientes para criar conjunto de anúncios');
      }

      // Configurar parâmetros do conjunto de anúncios
      const adSetParams: any = {
        name: params.name,
        campaign_id: params.campaignId,
        optimization_goal: params.optimizationGoal,
        billing_event: params.billingEvent || 'IMPRESSIONS',
        status: params.status || 'PAUSED',
        targeting: params.targetingSpec,
      };

      // Configurar orçamento (diário ou lifetime)
      if (params.dailyBudget) {
        adSetParams.daily_budget = Math.round(params.dailyBudget * 100);
      } else if (params.lifetimeBudget) {
        adSetParams.lifetime_budget = Math.round(params.lifetimeBudget * 100);
      }

      // Configurar datas
      if (params.startDate) {
        adSetParams.start_time = params.startDate.toISOString();
      }
      if (params.endDate) {
        adSetParams.end_time = params.endDate.toISOString();
      }

      // Criar conjunto de anúncios
      console.log('Criando conjunto de anúncios com parâmetros:', adSetParams);
      const adSet = await this.adAccount.createAdSet([], adSetParams);

      console.log('Conjunto de anúncios criado com sucesso:', adSet);
      return {
        success: true,
        data: {
          adSetId: adSet.id
        }
      };

    } catch (error: any) {
      console.error('Erro ao criar conjunto de anúncios:', error);
      return {
        success: false,
        error: 'Falha ao criar conjunto de anúncios',
        details: error.message || error
      };
    }
  }

  /**
   * Cria um criativo de anúncio no Meta Ads
   */
  async createAdCreative(params: AdCreativeParams): Promise<MetaAdsResponse> {
    try {
      // Validar parâmetros obrigatórios
      if (!params.name || !params.title || !params.body || !params.linkUrl) {
        throw new Error('Parâmetros insuficientes para criar criativo');
      }

      // Obter o hash da imagem se for fornecida uma URL de imagem
      let imageHash = params.imageHash;
      if (!imageHash && params.imageUrl) {
        try {
          // Fazer upload da imagem
          const image = new AdImage(null, `act_${params.adAccountId}`);
          image.filename = params.imageUrl;
          await image.create();
          imageHash = image.hash;
        } catch (error) {
          console.error('Erro ao fazer upload de imagem:', error);
          // Continuar sem imagem
        }
      }

      // Configurar parâmetros do criativo
      const creativeParams: any = {
        name: params.name,
        object_story_spec: {
          page_id: process.env.META_PAGE_ID || '123456789', // ID da página do Facebook
          link_data: {
            message: params.body,
            link: params.linkUrl,
            name: params.title,
            call_to_action: {
              type: params.callToAction
            }
          }
        }
      };

      // Adicionar imagem se disponível
      if (imageHash) {
        creativeParams.object_story_spec.link_data.image_hash = imageHash;
      }

      // Criar criativo
      console.log('Criando criativo com parâmetros:', creativeParams);
      const creative = await this.adAccount.createAdCreative([], creativeParams);

      console.log('Criativo criado com sucesso:', creative);
      return {
        success: true,
        data: {
          adCreativeId: creative.id
        }
      };

    } catch (error: any) {
      console.error('Erro ao criar criativo:', error);
      return {
        success: false,
        error: 'Falha ao criar criativo',
        details: error.message || error
      };
    }
  }

  /**
   * Cria um anúncio no Meta Ads
   */
  async createAd(params: AdParams): Promise<MetaAdsResponse> {
    try {
      // Validar parâmetros obrigatórios
      if (!params.name || !params.adsetId || !params.creativeId) {
        throw new Error('Parâmetros insuficientes para criar anúncio');
      }

      // Configurar parâmetros do anúncio
      const adParams: any = {
        name: params.name,
        adset_id: params.adsetId,
        creative: {
          creative_id: params.creativeId
        },
        status: params.status || 'PAUSED'
      };

      // Criar anúncio
      console.log('Criando anúncio com parâmetros:', adParams);
      const ad = await this.adAccount.createAd([], adParams);

      console.log('Anúncio criado com sucesso:', ad);
      return {
        success: true,
        data: {
          adId: ad.id
        }
      };

    } catch (error: any) {
      console.error('Erro ao criar anúncio:', error);
      return {
        success: false,
        error: 'Falha ao criar anúncio',
        details: error.message || error
      };
    }
  }

  /**
   * Cria uma campanha completa com conjunto de anúncios e anúncio
   */
  async createFullCampaign(
    campaignParams: CampaignParams,
    adSetParams: Omit<AdSetParams, 'campaignId'>,
    creativeParams: AdCreativeParams,
    adParams: Omit<AdParams, 'adsetId' | 'creativeId'>
  ): Promise<CreateCampaignResponse> {
    try {
      // 1. Criar campanha
      const campaignResult = await this.createCampaign(campaignParams);
      if (!campaignResult.success) {
        return campaignResult;
      }
      const campaignId = campaignResult.data?.campaignId;

      // 2. Criar conjunto de anúncios
      const adSetResult = await this.createAdSet({
        ...adSetParams,
        campaignId
      });
      if (!adSetResult.success) {
        return {
          success: false,
          error: 'Falha ao criar conjunto de anúncios',
          details: adSetResult.details,
          data: {
            campaignId
          }
        };
      }
      const adSetId = adSetResult.data?.adSetId;

      // 3. Criar criativo
      const creativeResult = await this.createAdCreative({
        ...creativeParams,
        adAccountId: META_ACCOUNT_ID || ''
      });
      if (!creativeResult.success) {
        return {
          success: false,
          error: 'Falha ao criar criativo',
          details: creativeResult.details,
          data: {
            campaignId,
            adSetId
          }
        };
      }
      const adCreativeId = creativeResult.data?.adCreativeId;

      // 4. Criar anúncio
      const adResult = await this.createAd({
        ...adParams,
        adsetId: adSetId,
        creativeId: adCreativeId
      });
      if (!adResult.success) {
        return {
          success: false,
          error: 'Falha ao criar anúncio',
          details: adResult.details,
          data: {
            campaignId,
            adSetId,
            adCreativeId
          }
        };
      }
      const adId = adResult.data?.adId;

      // Retornar IDs de todos os componentes criados
      return {
        success: true,
        data: {
          campaignId,
          adSetId,
          adCreativeId,
          adId
        }
      };

    } catch (error: any) {
      console.error('Erro ao criar campanha completa:', error);
      return {
        success: false,
        error: 'Falha ao criar campanha completa',
        details: error.message || error
      };
    }
  }
} 