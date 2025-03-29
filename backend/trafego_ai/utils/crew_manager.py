"""
Implementação do gerenciador de equipe (Crew) de agentes utilizando CrewAI
"""
import logging
from typing import List, Dict, Any, Optional, Union
from crewai import Crew, Process, Task

from backend.trafego_ai.agents import (
    EstrategistaAgent,
    CriadorCampanhasAgent,
    EspecialistaAnunciosAgent
)
from backend.trafego_ai.tools import (
    MetaAdsAPI,
    OpenAIWebSearch
)


class CrewManager:
    """
    Gerenciador da equipe de agentes para o sistema de IA de Gestão de Tráfego.
    
    Esta classe é responsável por criar e gerenciar a equipe de agentes utilizando 
    o framework CrewAI, orquestrando suas interações e atribuindo tarefas.
    """
    
    def __init__(self, verbose=False):
        """
        Inicializa o gerenciador de equipe.
        
        Args:
            verbose (bool, optional): Se deve imprimir logs detalhados. Default para False.
        """
        self.verbose = verbose
        self.logger = logging.getLogger(__name__)
        
        # Inicializar as ferramentas
        self.web_search = OpenAIWebSearch()
        self.meta_ads_api = None  # Inicializado sob demanda

        # Inicializar os agentes
        self.estrategista = EstrategistaAgent(tools=[self.web_search.search], verbose=verbose)
        self.criador_campanhas = CriadorCampanhasAgent(verbose=verbose)
        self.especialista_anuncios = EspecialistaAnunciosAgent(verbose=verbose)
        
        # Inicializar a equipe (crew)
        self._crew = None
    
    def inicializar_meta_ads_api(self, app_id=None, app_secret=None, access_token=None, account_id=None):
        """
        Inicializa a API do Meta ADS.
        
        Args:
            app_id (str, optional): ID da aplicação Meta
            app_secret (str, optional): Segredo da aplicação Meta
            access_token (str, optional): Token de acesso
            account_id (str, optional): ID da conta publicitária
        """
        try:
            self.meta_ads_api = MetaAdsAPI(
                app_id=app_id,
                app_secret=app_secret,
                access_token=access_token,
                account_id=account_id
            )
            
            # Adicionar a ferramenta aos agentes
            for agent in [self.criador_campanhas, self.especialista_anuncios]:
                # Adicionar métodos relevantes da API como ferramentas
                for method_name in ['criar_campanha', 'criar_conjunto_anuncios', 'criar_anuncio', 
                                  'criar_criativo', 'buscar_interesses']:
                    agent.add_tool(getattr(self.meta_ads_api, method_name))
            
            self.logger.info("Meta ADS API inicializada e adicionada aos agentes")
            return True
        except Exception as e:
            self.logger.error(f"Erro ao inicializar Meta ADS API: {e}")
            return False
    
    def _criar_crew(self, agentes=None, processo=Process.sequential):
        """
        Cria a equipe (Crew) de agentes.
        
        Args:
            agentes (List, optional): Lista de agentes a serem incluídos na equipe.
                                    Se None, usa todos os agentes disponíveis.
            processo (Process, optional): Processo de execução a ser utilizado.
                                        Default para sequencial.
        
        Returns:
            Crew: Instância da equipe de agentes
        """
        if agentes is None:
            agentes = [
                self.estrategista.get_agent(),
                self.criador_campanhas.get_agent(),
                self.especialista_anuncios.get_agent()
            ]
        
        return Crew(
            agents=agentes,
            process=processo,
            verbose=self.verbose,
            memory=True
        )
    
    def criar_estrategia_campanha(self, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria uma estratégia completa de campanha com base no briefing.
        
        Args:
            briefing (Dict[str, Any]): Dados do briefing obtidos do usuário
            
        Returns:
            Dict[str, Any]: Estratégia completa de campanha
        """
        # Criar tarefa para o estrategista
        estrategia_task = Task(
            description=f"""
            Analise o briefing a seguir e desenvolva uma estratégia completa de marketing para uma 
            campanha no Meta ADS (Facebook e Instagram).
            
            BRIEFING:
            Objetivo da campanha: {briefing.get('objetivo', 'Não especificado')}
            Público-alvo: {briefing.get('publico_alvo', 'Não especificado')}
            Orçamento: {briefing.get('orcamento', 'Não especificado')}
            Duração: {briefing.get('duracao', 'Não especificado')}
            Status dos criativos: {briefing.get('criativos', 'Não especificado')}
            Métricas principais: {briefing.get('metricas', 'Não especificado')}
            Experiência prévia: {briefing.get('experiencia_previa', 'Não especificado')}
            
            Desenvolva uma estratégia detalhada incluindo:
            1. Abordagem geral recomendada
            2. Estrutura de campanha sugerida
            3. Segmentação de público recomendada
            4. Estratégia de orçamento e lances
            5. Canais e posicionamentos prioritários
            6. Recomendações para os criativos
            7. KPIs para monitoramento
            
            Se necessário, faça uma pesquisa na web para obter informações sobre tendências atuais,
            melhores práticas ou informações sobre o setor relacionado à campanha.
            """,
            agent=self.estrategista.get_agent(),
            expected_output="Uma estratégia de marketing digital detalhada e fundamentada para a campanha no Meta ADS."
        )
        
        # Criar e executar a equipe
        crew = self._criar_crew(agentes=[self.estrategista.get_agent()])
        result = crew.kickoff(tasks=[estrategia_task])
        
        return {
            "estrategia": result,
            "briefing_original": briefing,
            "analise": {
                "viabilidade": "alta",  # Isso poderia ser determinado por um outro agente
                "complexidade": "média"
            }
        }
    
    def criar_estrutura_tecnica_campanha(self, estrategia: str, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria a estrutura técnica completa da campanha para implementação no Meta ADS.
        
        Args:
            estrategia (str): Estratégia de marketing desenvolvida
            briefing (Dict[str, Any]): Dados do briefing obtidos do usuário
            
        Returns:
            Dict[str, Any]: Estrutura técnica da campanha para Meta ADS
        """
        # Criar tarefa para o criador de campanhas
        estrutura_task = Task(
            description=f"""
            Com base na estratégia e no briefing abaixo, elabore uma estrutura técnica completa 
            para implementação no Meta ADS.
            
            ESTRATÉGIA:
            {estrategia}
            
            BRIEFING:
            Objetivo da campanha: {briefing.get('objetivo', 'Não especificado')}
            Público-alvo: {briefing.get('publico_alvo', 'Não especificado')}
            Orçamento: {briefing.get('orcamento', 'Não especificado')}
            Duração: {briefing.get('duracao', 'Não especificado')}
            
            Forneça a estrutura técnica completa incluindo:
            1. Objetivo da campanha no Meta ADS (escolha o objetivo técnico específico)
            2. Estrutura de campanha completa (campanha, conjuntos de anúncios, anúncios)
            3. Configurações detalhadas para cada nível:
               - Campanha: objetivo, compra, orçamento, agenda
               - Conjuntos de anúncios: público-alvo, posicionamentos, otimizações, lances
               - Anúncios: formatos, requisitos de imagem/vídeo, textos
            4. Segmentações específicas para cada conjunto de anúncios
            5. Configurações de rastreamento e conversão
            
            Forneça esta estrutura em um formato detalhado e técnico, como seria implementado 
            na plataforma Meta ADS, incluindo todas as configurações específicas.
            """,
            agent=self.criador_campanhas.get_agent(),
            expected_output="Uma estrutura técnica detalhada para implementação no Meta ADS."
        )
        
        # Criar e executar a equipe
        crew = self._criar_crew(agentes=[self.criador_campanhas.get_agent()])
        result = crew.kickoff(tasks=[estrutura_task])
        
        return {
            "estrutura_tecnica": result,
            "baseado_em": {
                "estrategia": estrategia[:500] + "...",  # Versão resumida para o log
                "briefing": briefing
            }
        }
    
    def analisar_criativo(self, descricao_criativo: str, formato: str, objetivo_campanha: str) -> Dict[str, Any]:
        """
        Analisa um criativo enviado pelo usuário e fornece feedback.
        
        Args:
            descricao_criativo (str): Descrição detalhada do criativo
            formato (str): Formato do criativo (imagem, vídeo, carrossel, etc.)
            objetivo_campanha (str): Objetivo da campanha
            
        Returns:
            Dict[str, Any]: Avaliação detalhada do criativo
        """
        # Criar tarefa para o especialista em anúncios
        analise_task = Task(
            description=f"""
            Avalie o criativo descrito abaixo para uma campanha de Meta ADS:
            
            DESCRIÇÃO DO CRIATIVO:
            {descricao_criativo}
            
            FORMATO: {formato}
            
            OBJETIVO DA CAMPANHA: {objetivo_campanha}
            
            Forneça uma avaliação detalhada deste criativo, incluindo:
            
            1. Adequação ao objetivo da campanha (de 1 a 10)
            2. Pontos fortes do criativo
            3. Áreas que precisam de melhoria
            4. Conformidade com as políticas do Meta ADS
            5. Potencial de desempenho esperado
            6. Recomendações específicas para otimização
            7. Sugestões de variantes para teste
            
            Seja específico e técnico em sua avaliação, considerando os aspectos visuais, 
            textuais e estratégicos do criativo.
            """,
            agent=self.especialista_anuncios.get_agent(),
            expected_output="Uma avaliação técnica detalhada do criativo para Meta ADS."
        )
        
        # Criar e executar a equipe
        crew = self._criar_crew(agentes=[self.especialista_anuncios.get_agent()])
        result = crew.kickoff(tasks=[analise_task])
        
        return {
            "avaliacao_criativo": result,
            "criativo": {
                "descricao": descricao_criativo[:200] + "..." if len(descricao_criativo) > 200 else descricao_criativo,
                "formato": formato,
                "objetivo": objetivo_campanha
            }
        }
    
    def processo_completo_campanha(self, briefing: Dict[str, Any], criativos: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executa o processo completo de criação de campanha, desde a estratégia até as especificações de anúncios.
        
        Args:
            briefing (Dict[str, Any]): Dados do briefing obtidos do usuário
            criativos (List[Dict[str, Any]], optional): Lista de criativos disponíveis
            
        Returns:
            Dict[str, Any]: Resultado completo do processo
        """
        # Inicializar criativos se não fornecidos
        if criativos is None:
            criativos = []
        
        # Tarefa 1: Desenvolver estratégia
        estrategia_task = Task(
            description=f"""
            Analise o briefing do cliente e desenvolva uma estratégia abrangente de marketing
            para campanha no Meta ADS.
            
            BRIEFING:
            {briefing}
            
            Se necessário, faça pesquisas na web para encontrar tendências atuais e melhores práticas.
            """,
            agent=self.estrategista.get_agent(),
            expected_output="Estratégia de marketing digital detalhada."
        )
        
        # Tarefa 2: Criar estrutura técnica da campanha
        estrutura_task = Task(
            description="""
            Com base na estratégia desenvolvida pelo Estrategista de Marketing Digital,
            crie uma estrutura técnica detalhada para implementação no Meta ADS.
            
            A estrutura deve incluir todas as configurações técnicas necessárias para
            implementação imediata na plataforma.
            """,
            agent=self.criador_campanhas.get_agent(),
            context=["A análise do briefing e a estratégia desenvolvida"],
            expected_output="Estrutura técnica completa da campanha."
        )
        
        # Tarefa 3: Avaliar criativos e criar especificações de anúncios
        criativos_texto = "\n".join([f"Criativo {i+1}: {c.get('tipo', 'N/A')} - {c.get('descricao', 'N/A')}" 
                                    for i, c in enumerate(criativos)])
        
        anuncios_task = Task(
            description=f"""
            Com base na estratégia e estrutura técnica desenvolvidas, avalie os criativos
            disponíveis e crie especificações detalhadas para os anúncios.
            
            CRIATIVOS DISPONÍVEIS:
            {criativos_texto if criativos else "Nenhum criativo fornecido. Crie especificações genéricas."}
            
            Forneça especificações técnicas detalhadas para cada anúncio, incluindo:
            1. Formato recomendado
            2. Especificações técnicas
            3. Textos sugeridos
            4. Call-to-action recomendado
            """,
            agent=self.especialista_anuncios.get_agent(),
            context=["A estratégia e a estrutura técnica da campanha"],
            expected_output="Especificações completas de anúncios."
        )
        
        # Criar e configurar a equipe
        crew = self._criar_crew(
            agentes=[
                self.estrategista.get_agent(),
                self.criador_campanhas.get_agent(),
                self.especialista_anuncios.get_agent()
            ],
            processo=Process.sequential
        )
        
        # Executar as tarefas
        resultado = crew.kickoff(tasks=[estrategia_task, estrutura_task, anuncios_task])
        
        return {
            "processo_completo": {
                "estrategia": resultado[0],
                "estrutura_tecnica": resultado[1],
                "especificacoes_anuncios": resultado[2]
            },
            "briefing": briefing,
            "criativos_utilizados": criativos
        } 