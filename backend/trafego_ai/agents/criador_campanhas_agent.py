"""
Implementação do Agente Criador de Campanhas no Meta ADS
"""
from backend.trafego_ai.agents.base_agent import BaseAgent
from backend.trafego_ai.config.settings import SYSTEM_MESSAGES


class CriadorCampanhasAgent(BaseAgent):
    """
    Agente especializado na criação e configuração técnica de campanhas no Meta ADS.
    """
    
    def __init__(self, tools=None, verbose=False):
        """
        Inicializa o Agente Criador de Campanhas.
        
        Args:
            tools (list, optional): Lista de ferramentas disponíveis para o agente
            verbose (bool, optional): Se deve imprimir logs detalhados
        """
        super().__init__(
            role="Especialista em Criação de Campanhas no Meta ADS",
            goal="Configurar campanhas otimizadas no Meta ADS seguindo as melhores práticas",
            backstory="""Você é um especialista técnico em Meta ADS com vasta experiência
            na configuração e otimização de campanhas. Você conhece profundamente todos os
            recursos, formatos, configurações e requisitos técnicos da plataforma. Você 
            sabe como estruturar campanhas, conjuntos de anúncios e anúncios para alcançar
            os melhores resultados possíveis, independente do objetivo.""",
            memory=True,
            verbose=verbose,
            tools=tools,
            temperature=0.2,
            allow_delegation=True
        )
    
    def criar_estrutura_campanha(self, estrategia, briefing):
        """
        Cria a estrutura completa da campanha com base na estratégia e briefing.
        
        Args:
            estrategia (dict): A estratégia de marketing desenvolvida
            briefing (dict): O briefing completo com as respostas do usuário
            
        Returns:
            dict: A estrutura completa da campanha para Meta ADS
        """
        # Preparar o contexto para o agente
        contexto = f"""
        Com base na estratégia e no briefing abaixo, elabore uma estrutura técnica 
        completa para implementação no Meta ADS. 
        
        ESTRATÉGIA:
        {estrategia.get('estrategia_completa', 'Não fornecida')}
        
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
        """
        
        # Executar o agente com o contexto
        result = self.agent.execute_task(contexto)
        
        # Processar e retornar a estrutura da campanha
        return {
            "estrutura_tecnica": result,
            "baseado_em": {
                "estrategia": estrategia,
                "briefing": briefing
            }
        }
    
    def gerar_especificacoes_anuncios(self, objetivos, targeting, criativos_disponiveis):
        """
        Gera especificações técnicas detalhadas para os anúncios.
        
        Args:
            objetivos (str): Objetivos da campanha
            targeting (dict): Configurações de segmentação
            criativos_disponiveis (list): Lista de criativos disponíveis
            
        Returns:
            dict: Especificações técnicas para os anúncios
        """
        # Converter a lista de criativos para texto
        criativos_texto = ""
        for i, criativo in enumerate(criativos_disponiveis):
            criativos_texto += f"Criativo {i+1}: {criativo.get('tipo', 'Não especificado')} - {criativo.get('descricao', 'Sem descrição')}\n"
        
        prompt = f"""
        Com base nos objetivos da campanha, configurações de segmentação e criativos disponíveis,
        gere especificações técnicas detalhadas para os anúncios no Meta ADS.
        
        OBJETIVOS DA CAMPANHA:
        {objetivos}
        
        TARGETING:
        {targeting}
        
        CRIATIVOS DISPONÍVEIS:
        {criativos_texto}
        
        Forneça especificações técnicas detalhadas para cada anúncio, incluindo:
        
        1. Formato de anúncio recomendado
        2. Especificações técnicas exatas (dimensões, duração, tamanho de arquivo)
        3. Texto principal do anúncio (com comprimento apropriado)
        4. Título do anúncio (com comprimento apropriado)
        5. Descrição (se aplicável)
        6. Call-to-action recomendado
        7. URL de destino (estrutura recomendada)
        8. Parâmetros UTM sugeridos
        9. Configurações de rastreamento de conversão
        
        Forneça estas especificações em um formato pronto para implementação, respeitando
        todas as limitações técnicas e melhores práticas do Meta ADS.
        """
        
        result = self.agent.execute_task(prompt)
        
        return {
            "especificacoes_anuncios": result,
            "objetivos": objetivos,
            "targeting": targeting,
            "criativos_utilizados": criativos_disponiveis
        }
    
    def definir_segmentacao(self, publico_alvo, objetivo_campanha, setor):
        """
        Define configurações detalhadas de segmentação para a campanha.
        
        Args:
            publico_alvo (str): Descrição do público-alvo
            objetivo_campanha (str): Objetivo da campanha
            setor (str): Setor ou nicho de mercado
            
        Returns:
            dict: Configurações detalhadas de segmentação
        """
        prompt = f"""
        Com base nas informações abaixo, defina configurações técnicas detalhadas de segmentação 
        para uma campanha no Meta ADS:
        
        PÚBLICO-ALVO: {publico_alvo}
        
        OBJETIVO DA CAMPANHA: {objetivo_campanha}
        
        SETOR/NICHO: {setor}
        
        Forneça configurações técnicas detalhadas de segmentação, incluindo:
        
        1. Tipo de segmentação recomendada (interesse, comportamental, demográfica, personalizada, etc.)
        2. Parâmetros demográficos específicos (idade, gênero, localização, etc.)
        3. Interesses específicos a serem direcionados (seja específico e técnico)
        4. Comportamentos a serem incluídos
        5. Segmentações a serem excluídas
        6. Tamanho estimado do público resultante
        7. Configurações de expansão de público (devem ser usadas ou não)
        8. Otimização de entrega recomendada
        
        Forneça estas configurações em formato técnico, como seriam implementadas
        diretamente na plataforma Meta ADS, com valores específicos para cada parâmetro.
        """
        
        result = self.agent.execute_task(prompt)
        
        return {
            "configuracoes_segmentacao": result,
            "publico_alvo": publico_alvo,
            "objetivo": objetivo_campanha,
            "setor": setor
        } 