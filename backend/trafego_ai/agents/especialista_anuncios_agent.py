"""
Implementação do Agente Especialista em Criação de Anúncios para Meta ADS
"""
from backend.trafego_ai.agents.base_agent import BaseAgent
from backend.trafego_ai.config.settings import SYSTEM_MESSAGES


class EspecialistaAnunciosAgent(BaseAgent):
    """
    Agente especializado na avaliação de criativos e criação de anúncios otimizados para Meta ADS.
    """
    
    def __init__(self, tools=None, verbose=False):
        """
        Inicializa o Agente Especialista em Anúncios.
        
        Args:
            tools (list, optional): Lista de ferramentas disponíveis para o agente
            verbose (bool, optional): Se deve imprimir logs detalhados
        """
        super().__init__(
            role="Especialista em Criação de Anúncios para Meta ADS",
            goal="Avaliar criativos e criar anúncios otimizados para maximizar o desempenho",
            backstory="""Você é um especialista em criação de anúncios para Meta ADS com anos de 
            experiência na otimização de criativos. Você entende profundamente os formatos de 
            anúncios, requisitos técnicos, e práticas recomendadas para cada tipo de objetivo. 
            Você sabe avaliar imagens e vídeos para determinar seu potencial de desempenho e 
            sabe criar textos persuasivos que geram resultados.""",
            memory=True,
            verbose=verbose,
            tools=tools,
            temperature=0.4,  # Um pouco mais de criatividade para textos publicitários
            allow_delegation=True
        )
    
    def avaliar_criativo(self, descricao_criativo, formato, objetivo_campanha):
        """
        Avalia um criativo enviado pelo usuário e fornece feedback.
        
        Args:
            descricao_criativo (str): Descrição detalhada do criativo
            formato (str): Formato do criativo (imagem, vídeo, carrossel, etc.)
            objetivo_campanha (str): Objetivo da campanha
            
        Returns:
            dict: Avaliação detalhada do criativo
        """
        prompt = f"""
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
        """
        
        result = self.agent.execute_task(prompt)
        
        return {
            "avaliacao_completa": result,
            "criativo": {
                "descricao": descricao_criativo,
                "formato": formato
            },
            "objetivo": objetivo_campanha
        }
    
    def criar_textos_anuncio(self, produto, publico_alvo, objetivo, usp):
        """
        Cria textos persuasivos para anúncios no Meta ADS.
        
        Args:
            produto (str): Descrição do produto ou serviço
            publico_alvo (str): Descrição do público-alvo
            objetivo (str): Objetivo da campanha
            usp (str): Proposta única de venda ou diferencial
            
        Returns:
            dict: Textos otimizados para anúncios
        """
        prompt = f"""
        Crie textos persuasivos e otimizados para anúncios no Meta ADS com base nas informações abaixo:
        
        PRODUTO/SERVIÇO: {produto}
        
        PÚBLICO-ALVO: {publico_alvo}
        
        OBJETIVO DA CAMPANHA: {objetivo}
        
        DIFERENCIAL/USP: {usp}
        
        Crie:
        
        1. 3 variantes de texto principal (Primary Text) com até 125 caracteres
        2. 5 opções de título (Headline) com até 27 caracteres cada
        3. 3 opções de descrição (Description) com até 75 caracteres cada
        4. Sugestão de Call-to-Action mais adequado
        
        Os textos devem ser persuasivos, alinhados ao objetivo da campanha, relevantes para o 
        público-alvo e destacar claramente o diferencial. Evite clichês e garanta que os textos 
        sejam conformes às políticas do Meta ADS (sem textos discriminatórios, sem referências 
        a atributos pessoais, sem promessas irrealistas, etc.).
        """
        
        result = self.agent.execute_task(prompt)
        
        return {
            "textos_anuncios": result,
            "contexto": {
                "produto": produto,
                "publico_alvo": publico_alvo,
                "objetivo": objetivo,
                "usp": usp
            }
        }
    
    def recomendar_formatos(self, objetivo_campanha, tipo_produto, recursos_disponiveis):
        """
        Recomenda os melhores formatos de anúncios para a campanha.
        
        Args:
            objetivo_campanha (str): Objetivo da campanha
            tipo_produto (str): Tipo de produto ou serviço
            recursos_disponiveis (list): Lista de recursos disponíveis (imagens, vídeos, etc.)
            
        Returns:
            dict: Recomendações de formatos de anúncios
        """
        # Converter a lista de recursos para texto
        recursos_texto = ", ".join(recursos_disponiveis)
        
        prompt = f"""
        Com base nas informações abaixo, recomende os formatos de anúncios mais adequados para o Meta ADS:
        
        OBJETIVO DA CAMPANHA: {objetivo_campanha}
        
        TIPO DE PRODUTO/SERVIÇO: {tipo_produto}
        
        RECURSOS DISPONÍVEIS: {recursos_texto}
        
        Forneça recomendações detalhadas sobre:
        
        1. Os 3 melhores formatos de anúncios para este caso, em ordem de prioridade
        2. Justificativa detalhada para cada formato recomendado
        3. Especificações técnicas para cada formato (dimensões, duração, etc.)
        4. Como os recursos disponíveis podem ser melhor utilizados
        5. Recomendações para criação de recursos adicionais, se necessário
        6. Melhores práticas específicas para cada formato recomendado
        
        Sua recomendação deve ser específica, técnica e baseada nas melhores práticas atuais do Meta ADS.
        """
        
        result = self.agent.execute_task(prompt)
        
        return {
            "recomendacoes_formatos": result,
            "objetivo": objetivo_campanha,
            "tipo_produto": tipo_produto,
            "recursos_disponiveis": recursos_disponiveis
        }
    
    def otimizar_anuncio_existente(self, detalhes_anuncio, metricas_desempenho):
        """
        Fornece recomendações para otimizar um anúncio existente com base em seu desempenho.
        
        Args:
            detalhes_anuncio (dict): Detalhes do anúncio existente
            metricas_desempenho (dict): Métricas de desempenho do anúncio
            
        Returns:
            dict: Recomendações de otimização
        """
        # Extrair informações relevantes do anúncio
        titulo = detalhes_anuncio.get("titulo", "Não fornecido")
        texto_principal = detalhes_anuncio.get("texto_principal", "Não fornecido")
        descricao = detalhes_anuncio.get("descricao", "Não fornecido")
        cta = detalhes_anuncio.get("cta", "Não fornecido")
        formato = detalhes_anuncio.get("formato", "Não fornecido")
        
        # Extrair métricas relevantes
        ctr = metricas_desempenho.get("ctr", "Não fornecido")
        cpc = metricas_desempenho.get("cpc", "Não fornecido")
        conversoes = metricas_desempenho.get("conversoes", "Não fornecido")
        frequencia = metricas_desempenho.get("frequencia", "Não fornecido")
        
        prompt = f"""
        Analise o anúncio existente e suas métricas de desempenho, e forneça recomendações 
        detalhadas para otimização:
        
        DETALHES DO ANÚNCIO:
        Título: {titulo}
        Texto Principal: {texto_principal}
        Descrição: {descricao}
        Call-to-Action: {cta}
        Formato: {formato}
        
        MÉTRICAS DE DESEMPENHO:
        CTR: {ctr}
        CPC: {cpc}
        Conversões: {conversoes}
        Frequência: {frequencia}
        
        Com base nessas informações, forneça:
        
        1. Diagnóstico dos problemas ou limitações do anúncio atual
        2. Recomendações específicas para melhorar o texto do anúncio
        3. Sugestões para otimizar elementos visuais (se aplicável)
        4. Alterações recomendadas no Call-to-Action
        5. Ajustes no formato ou configurações técnicas
        6. Variantes A/B que deveriam ser testadas
        
        Suas recomendações devem ser específicas, baseadas nas métricas fornecidas, 
        e seguindo as melhores práticas atuais do Meta ADS.
        """
        
        result = self.agent.execute_task(prompt)
        
        return {
            "recomendacoes_otimizacao": result,
            "anuncio_original": detalhes_anuncio,
            "metricas_analisadas": metricas_desempenho
        } 