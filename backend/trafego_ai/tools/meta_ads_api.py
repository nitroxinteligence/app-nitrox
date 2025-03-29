"""
Implementação da integração com a API do Meta ADS (Facebook)
"""
import time
import json
import logging
from datetime import datetime, timedelta
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.targetingsearch import TargetingSearch
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.advideo import AdVideo
from facebook_business.exceptions import FacebookRequestError

from backend.trafego_ai.config.settings import (
    META_APP_ID,
    META_APP_SECRET,
    META_ACCESS_TOKEN,
    META_ACCOUNT_ID
)

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MetaAdsAPI:
    """
    Classe para interação com a API do Meta ADS (Facebook).
    Implementa métodos para criar e gerenciar campanhas, conjuntos de anúncios e anúncios.
    """

    def __init__(self, app_id=None, app_secret=None, access_token=None, account_id=None):
        """
        Inicializa a integração com a API do Meta ADS.
        
        Args:
            app_id (str, optional): ID da aplicação Meta. Default para o valor nas configurações.
            app_secret (str, optional): Segredo da aplicação Meta. Default para o valor nas configurações.
            access_token (str, optional): Token de acesso. Default para o valor nas configurações.
            account_id (str, optional): ID da conta publicitária. Default para o valor nas configurações.
        """
        self.app_id = app_id or META_APP_ID
        self.app_secret = app_secret or META_APP_SECRET
        self.access_token = access_token or META_ACCESS_TOKEN
        self.account_id = account_id or META_ACCOUNT_ID
        
        # Inicializar a API do Facebook
        try:
            FacebookAdsApi.init(self.app_id, self.app_secret, self.access_token)
            logger.info("Facebook Ads API inicializada com sucesso")
            
            # Validar a conta
            self.ad_account = AdAccount(f'act_{self.account_id}')
            self.check_account_access()
        except FacebookRequestError as e:
            logger.error(f"Erro ao inicializar a API do Facebook: {e}")
            raise
        except Exception as e:
            logger.error(f"Erro desconhecido ao inicializar a API do Facebook: {e}")
            raise
    
    def check_account_access(self):
        """
        Verifica se temos acesso à conta de anúncios.
        
        Returns:
            bool: True se o acesso for válido, False caso contrário
        """
        try:
            # Tenta acessar informações da conta para verificar as permissões
            self.ad_account.api_get(fields=['name', 'account_status'])
            return True
        except FacebookRequestError as e:
            logger.error(f"Erro ao acessar a conta: {e}")
            return False
    
    def criar_campanha(self, nome, objetivo, orcamento_diario=None, orcamento_lifetime=None, 
                      data_inicio=None, data_fim=None, status="PAUSED"):
        """
        Cria uma nova campanha publicitária no Meta ADS.
        
        Args:
            nome (str): Nome da campanha
            objetivo (str): Objetivo da campanha (Ex: REACH, TRAFFIC, CONVERSIONS)
            orcamento_diario (float, optional): Orçamento diário em centavos
            orcamento_lifetime (float, optional): Orçamento total da campanha em centavos
            data_inicio (datetime, optional): Data de início da campanha
            data_fim (datetime, optional): Data de término da campanha
            status (str, optional): Status inicial da campanha. Default para "PAUSED"
            
        Returns:
            str: ID da campanha criada
        """
        try:
            params = {
                'name': nome,
                'objective': objetivo,
                'status': status,
                'special_ad_categories': [],
            }
            
            # Configurar orçamento
            if orcamento_diario:
                params['daily_budget'] = int(orcamento_diario * 100)  # Converter para centavos
            elif orcamento_lifetime:
                params['lifetime_budget'] = int(orcamento_lifetime * 100)  # Converter para centavos
            
            # Configurar datas
            if data_inicio:
                params['start_time'] = data_inicio.strftime("%Y-%m-%dT%H:%M:%S%z")
            if data_fim:
                params['end_time'] = data_fim.strftime("%Y-%m-%dT%H:%M:%S%z")
            
            # Criar a campanha
            campaign = self.ad_account.create_campaign(params=params)
            campaign_id = campaign['id']
            logger.info(f"Campanha criada com sucesso: {campaign_id}")
            
            return campaign_id
        
        except FacebookRequestError as e:
            logger.error(f"Erro ao criar campanha: {e}")
            raise
    
    def criar_conjunto_anuncios(self, campanha_id, nome, objetivo_otimizacao, segmentacao, 
                              orcamento_diario=None, orcamento_lifetime=None, 
                              data_inicio=None, data_fim=None, status="PAUSED"):
        """
        Cria um novo conjunto de anúncios (Ad Set) no Meta ADS.
        
        Args:
            campanha_id (str): ID da campanha
            nome (str): Nome do conjunto de anúncios
            objetivo_otimizacao (str): Objetivo de otimização (Ex: REACH, LINK_CLICKS)
            segmentacao (dict): Configurações de segmentação
            orcamento_diario (float, optional): Orçamento diário em centavos
            orcamento_lifetime (float, optional): Orçamento total do conjunto em centavos
            data_inicio (datetime, optional): Data de início
            data_fim (datetime, optional): Data de término
            status (str, optional): Status inicial. Default para "PAUSED"
            
        Returns:
            str: ID do conjunto de anúncios criado
        """
        try:
            params = {
                'name': nome,
                'campaign_id': campanha_id,
                'optimization_goal': objetivo_otimizacao,
                'billing_event': 'IMPRESSIONS',  # ou LINK_CLICKS, APP_INSTALLS, etc.
                'status': status,
                'targeting': segmentacao,
            }
            
            # Configurar orçamento
            if orcamento_diario:
                params['daily_budget'] = int(orcamento_diario * 100)  # Converter para centavos
            elif orcamento_lifetime:
                params['lifetime_budget'] = int(orcamento_lifetime * 100)  # Converter para centavos
            
            # Configurar datas
            if data_inicio:
                params['start_time'] = data_inicio.strftime("%Y-%m-%dT%H:%M:%S%z")
            if data_fim:
                params['end_time'] = data_fim.strftime("%Y-%m-%dT%H:%M:%S%z")
            
            # Criar o conjunto de anúncios
            ad_set = self.ad_account.create_ad_set(params=params)
            ad_set_id = ad_set['id']
            logger.info(f"Conjunto de anúncios criado com sucesso: {ad_set_id}")
            
            return ad_set_id
        
        except FacebookRequestError as e:
            logger.error(f"Erro ao criar conjunto de anúncios: {e}")
            raise
    
    def criar_anuncio(self, conjunto_anuncios_id, nome, creative_id, status="PAUSED"):
        """
        Cria um novo anúncio no Meta ADS.
        
        Args:
            conjunto_anuncios_id (str): ID do conjunto de anúncios
            nome (str): Nome do anúncio
            creative_id (str): ID do criativo a ser usado
            status (str, optional): Status inicial. Default para "PAUSED"
            
        Returns:
            str: ID do anúncio criado
        """
        try:
            params = {
                'name': nome,
                'adset_id': conjunto_anuncios_id,
                'creative': {'creative_id': creative_id},
                'status': status,
            }
            
            # Criar o anúncio
            ad = self.ad_account.create_ad(params=params)
            ad_id = ad['id']
            logger.info(f"Anúncio criado com sucesso: {ad_id}")
            
            return ad_id
        
        except FacebookRequestError as e:
            logger.error(f"Erro ao criar anúncio: {e}")
            raise
    
    def criar_criativo(self, titulo, texto, cta, url_destino, imagem_url=None, imagem_hash=None, 
                      formato="LINK"):
        """
        Cria um novo criativo para anúncios no Meta ADS.
        
        Args:
            titulo (str): Título do anúncio
            texto (str): Texto principal do anúncio
            cta (str): Call-to-action (Ex: LEARN_MORE, SHOP_NOW)
            url_destino (str): URL de destino do anúncio
            imagem_url (str, optional): URL da imagem a ser usada
            imagem_hash (str, optional): Hash de uma imagem já carregada
            formato (str, optional): Formato do criativo. Default para "LINK"
            
        Returns:
            str: ID do criativo criado
        """
        try:
            # Verificar se temos uma imagem para usar
            if imagem_url and not imagem_hash:
                # Fazer upload da imagem
                image = AdImage(parent_id=f'act_{self.account_id}')
                image[AdImage.Field.filename] = imagem_url
                image.remote_create()
                imagem_hash = image[AdImage.Field.hash]
            
            params = {
                'name': f'Criativo - {titulo[:20]}',
                'object_story_spec': {
                    'page_id': '123456789',  # ID da Página do Facebook - deve ser substituído pelo ID real
                    'link_data': {
                        'message': texto,
                        'link': url_destino,
                        'name': titulo,
                        'call_to_action': {'type': cta},
                    }
                }
            }
            
            # Adicionar a imagem ao criativo
            if imagem_hash:
                params['object_story_spec']['link_data']['image_hash'] = imagem_hash
            
            # Criar o criativo
            creative = self.ad_account.create_ad_creative(params=params)
            creative_id = creative['id']
            logger.info(f"Criativo criado com sucesso: {creative_id}")
            
            return creative_id
        
        except FacebookRequestError as e:
            logger.error(f"Erro ao criar criativo: {e}")
            raise
    
    def obter_metricas_campanha(self, campanha_id, data_inicio=None, data_fim=None, 
                               metricas=None):
        """
        Obtém métricas de desempenho de uma campanha.
        
        Args:
            campanha_id (str): ID da campanha
            data_inicio (datetime, optional): Data inicial para as métricas
            data_fim (datetime, optional): Data final para as métricas
            metricas (list, optional): Lista de métricas a serem obtidas
            
        Returns:
            dict: Métricas da campanha
        """
        try:
            # Configurar datas padrão se não fornecidas
            if not data_inicio:
                data_inicio = datetime.now() - timedelta(days=30)
            if not data_fim:
                data_fim = datetime.now()
            
            # Configurar métricas padrão se não fornecidas
            if not metricas:
                metricas = [
                    'impressions',
                    'clicks',
                    'ctr',
                    'spend',
                    'cpc',
                    'reach',
                    'frequency',
                ]
            
            # Obter as métricas
            campaign = Campaign(campanha_id)
            insights = campaign.get_insights(
                params={
                    'time_range': {
                        'since': data_inicio.strftime("%Y-%m-%d"),
                        'until': data_fim.strftime("%Y-%m-%d"),
                    },
                    'fields': metricas,
                }
            )
            
            # Processar e retornar os resultados
            if insights:
                return insights[0]
            else:
                return {}
        
        except FacebookRequestError as e:
            logger.error(f"Erro ao obter métricas da campanha: {e}")
            raise
    
    def buscar_interesses(self, termo_busca, limite=10):
        """
        Busca interesses para segmentação com base em um termo.
        
        Args:
            termo_busca (str): Termo para busca de interesses
            limite (int, optional): Número máximo de resultados. Default para 10
            
        Returns:
            list: Lista de interesses encontrados
        """
        try:
            # Buscar interesses
            interests = TargetingSearch.search(
                params={
                    'q': termo_busca,
                    'type': 'adinterest',
                    'limit': limite,
                }
            )
            
            # Processar e retornar os resultados
            return interests
        
        except FacebookRequestError as e:
            logger.error(f"Erro ao buscar interesses: {e}")
            raise
    
    def atualizar_status_campanha(self, campanha_id, status):
        """
        Atualiza o status de uma campanha.
        
        Args:
            campanha_id (str): ID da campanha
            status (str): Novo status (ACTIVE, PAUSED, ARCHIVED)
            
        Returns:
            bool: True se a atualização for bem-sucedida, False caso contrário
        """
        try:
            # Atualizar o status da campanha
            campaign = Campaign(campanha_id)
            campaign.update(params={'status': status})
            
            logger.info(f"Status da campanha {campanha_id} atualizado para {status}")
            return True
        
        except FacebookRequestError as e:
            logger.error(f"Erro ao atualizar status da campanha: {e}")
            return False 