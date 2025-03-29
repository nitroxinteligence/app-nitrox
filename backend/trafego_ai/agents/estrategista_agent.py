"""
Implementação do Agente Estrategista de Marketing Digital
"""
from backend.trafego_ai.agents.base_agent import BaseAgent
from backend.trafego_ai.config.settings import SYSTEM_MESSAGES


class EstrategistaAgent(BaseAgent):
    """
    Agente Estrategista de Marketing Digital especializado em definir
    estratégias para campanhas no Meta ADS.
    """
    
    def __init__(self, tools=None, verbose=False):
        """
        Inicializa o Agente Estrategista.
        
        Args:
            tools (list, optional): Lista de ferramentas disponíveis para o agente
            verbose (bool, optional): Se deve imprimir logs detalhados
        """
        super().__init__(
            role="Estrategista de Marketing Digital",
            goal="Desenvolver estratégias eficazes de marketing digital para campanhas no Meta ADS",
            backstory="""Você é um estrategista sênior de marketing digital com mais de 10 anos 
            de experiência em campanhas de Facebook e Instagram Ads. Você já trabalhou com empresas 
            de diversos tamanhos e segmentos, alcançando resultados excepcionais através de 
            estratégias bem fundamentadas. Você é orientado por dados, mas também compreende 
            o lado criativo e humano do marketing digital.""",
            memory=True,
            verbose=verbose,
            tools=tools,
            temperature=0.2,
            allow_delegation=True
        )
    
    def analisar_briefing(self, briefing):
        """
        Analisa o briefing fornecido pelo usuário e gera uma estratégia de marketing.
        
        Args:
            briefing (dict): O briefing completo com as respostas do usuário
            
        Returns:
            dict: A estratégia de marketing digital proposta
        """
        # Preparar o contexto para o agente com o briefing
        contexto = f"""
        Com base no briefing a seguir, desenvolva uma estratégia completa de marketing digital 
        para uma campanha no Meta ADS (Facebook e Instagram).
        
        BRIEFING:
        
        Objetivo da campanha: {briefing.get('objetivo', 'Não especificado')}
        
        Público-alvo: {briefing.get('publico_alvo', 'Não especificado')}
        
        Orçamento: {briefing.get('orcamento', 'Não especificado')}
        
        Duração da campanha: {briefing.get('duracao', 'Não especificado')}
        
        Status dos criativos: {briefing.get('criativos', 'Não especificado')}
        
        Métricas principais: {briefing.get('metricas', 'Não especificado')}
        
        Experiência prévia: {briefing.get('experiencia_previa', 'Não especificado')}
        
        Por favor, desenvolva uma estratégia detalhada incluindo:
        1. Abordagem geral recomendada
        2. Estrutura de campanha sugerida
        3. Segmentação de público recomendada
        4. Estratégia de orçamento e lances
        5. Canais e posicionamentos prioritários
        6. Recomendações para os criativos
        7. KPIs para monitoramento
        """
        
        # Executar o agente com o contexto
        result = self.agent.execute_task(contexto)
        
        # Processar e retornar a estratégia
        return {
            "estrategia_completa": result,
            "briefing_analisado": briefing,
            "timestamp": "2023-11-20T12:00:00Z"  # Substituir por timestamp real
        }
    
    def recomendar_objetivos(self, contexto_negocio):
        """
        Recomenda objetivos de campanha com base no contexto do negócio.
        
        Args:
            contexto_negocio (str): Descrição do negócio e suas necessidades
            
        Returns:
            list: Lista de objetivos recomendados com justificativas
        """
        prompt = f"""
        Com base no contexto de negócio a seguir, recomende os objetivos de campanha 
        mais adequados no Meta ADS, explicando por que cada um é apropriado:
        
        CONTEXTO DO NEGÓCIO:
        {contexto_negocio}
        
        Forneça uma lista priorizada de objetivos de campanha do Meta ADS que seriam 
        mais adequados para este caso, com uma breve justificativa para cada um.
        """
        
        result = self.agent.execute_task(prompt)
        
        # Processar e formatar a resposta
        # Na implementação real, poderíamos processar o texto para extrair estrutura
        return result
    
    def analisar_concorrencia(self, setor, produtos):
        """
        Analisa a concorrência no setor específico para informar a estratégia.
        
        Args:
            setor (str): O setor ou nicho de mercado
            produtos (list): Lista de produtos ou serviços oferecidos
            
        Returns:
            dict: Análise da concorrência e recomendações estratégicas
        """
        prompt = f"""
        Realize uma análise estratégica da concorrência no Meta ADS para o seguinte setor e produtos:
        
        SETOR: {setor}
        
        PRODUTOS/SERVIÇOS: {', '.join(produtos)}
        
        Por favor, forneça:
        
        1. Principais concorrentes prováveis neste setor
        2. Estratégias comuns utilizadas por concorrentes no Meta ADS
        3. Possíveis diferenciais competitivos a explorar
        4. Recomendações para se destacar da concorrência
        5. Armadilhas comuns a evitar neste setor
        """
        
        result = self.agent.execute_task(prompt)
        
        return {
            "analise_completa": result,
            "setor": setor,
            "produtos": produtos
        } 