"""
Implementação da ferramenta de pesquisa na web usando a API da OpenAI
"""
import json
import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI
from pydantic import BaseModel

from backend.trafego_ai.config.settings import OPENAI_API_KEY, OPENAI_MODEL
from backend.trafego_ai.models.schemas import WebSearchResult

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OpenAIWebSearch:
    """
    Classe para realizar pesquisas na web utilizando a API de ferramentas do OpenAI.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Inicializa a ferramenta de pesquisa na web.
        
        Args:
            api_key (str, optional): Chave de API do OpenAI. Se não fornecida, usa a das configurações.
            model (str, optional): Modelo de linguagem a ser usado. Se não fornecido, usa o das configurações.
        """
        self.api_key = api_key or OPENAI_API_KEY
        self.model = model or OPENAI_MODEL
        self.client = OpenAI(api_key=self.api_key)
    
    def search(self, query: str, max_results: int = 5) -> List[WebSearchResult]:
        """
        Realiza uma pesquisa na web usando a API de ferramentas do OpenAI.
        
        Args:
            query (str): O termo de pesquisa
            max_results (int, optional): Número máximo de resultados a retornar. Default para 5.
            
        Returns:
            List[WebSearchResult]: Lista de resultados da pesquisa
        """
        try:
            logger.info(f"Realizando pesquisa na web para: {query}")
            
            # Realizar a pesquisa usando a ferramenta de pesquisa web do OpenAI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Você é um assistente de pesquisa preciso e detalhado."},
                    {"role": "user", "content": f"Encontre informações sobre: {query}"}
                ],
                tools=[{"type": "web_search"}],
                tool_choice={"type": "web_search"}
            )
            
            # Extrair resultados da resposta
            if hasattr(response.choices[0].message, 'tool_calls') and response.choices[0].message.tool_calls:
                tool_call = response.choices[0].message.tool_calls[0]
                
                if tool_call.function.name == "web_search":
                    # Transformar a string JSON em objeto
                    search_results = json.loads(tool_call.function.arguments).get('results', [])
                    
                    # Converter para nosso formato de resultados
                    results = []
                    for result in search_results[:max_results]:
                        results.append(
                            WebSearchResult(
                                title=result.get('title', 'Sem título'),
                                url=result.get('link', 'https://example.com'),
                                snippet=result.get('snippet', 'Sem descrição')
                            )
                        )
                    
                    logger.info(f"Pesquisa concluída. Encontrados {len(results)} resultados.")
                    return results
            
            logger.warning("Nenhum resultado encontrado na pesquisa web.")
            return []
            
        except Exception as e:
            logger.error(f"Erro ao realizar pesquisa na web: {e}")
            # Em caso de erro, retornar lista vazia
            return []
    
    def search_with_summary(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Realiza uma pesquisa na web e gera um resumo dos resultados.
        
        Args:
            query (str): O termo de pesquisa
            max_results (int, optional): Número máximo de resultados a retornar. Default para 5.
            
        Returns:
            Dict[str, Any]: Dicionário contendo resultados da pesquisa e o resumo
        """
        # Primeiro, realizar a pesquisa
        results = self.search(query, max_results)
        
        if not results:
            return {
                "query": query,
                "results": [],
                "summary": "Nenhum resultado encontrado."
            }
        
        # Gerar resumo dos resultados
        results_text = "\n\n".join([
            f"TÍTULO: {r.title}\nURL: {r.url}\nDESCRIÇÃO: {r.snippet}"
            for r in results
        ])
        
        try:
            summary_response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Você é um assistente que resume informações de forma concisa e precisa."},
                    {"role": "user", "content": f"Com base nos seguintes resultados de pesquisa sobre '{query}', forneça um resumo objetivo e informativo destacando os pontos mais importantes e relevantes:\n\n{results_text}"}
                ]
            )
            
            summary = summary_response.choices[0].message.content.strip()
            
            return {
                "query": query,
                "results": [r.dict() for r in results],
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar resumo da pesquisa: {e}")
            return {
                "query": query,
                "results": [r.dict() for r in results],
                "summary": "Não foi possível gerar um resumo devido a um erro."
            }
    
    def research_topic(self, topic: str, specific_questions: List[str] = None) -> Dict[str, Any]:
        """
        Realiza uma pesquisa aprofundada sobre um tópico, respondendo a perguntas específicas.
        
        Args:
            topic (str): O tópico a ser pesquisado
            specific_questions (List[str], optional): Lista de perguntas específicas a serem respondidas
            
        Returns:
            Dict[str, Any]: Resultados da pesquisa organizada por perguntas/tópicos
        """
        if not specific_questions:
            specific_questions = [
                f"O que é {topic}?",
                f"Quais são as principais características de {topic}?",
                f"Quais são as melhores práticas atuais relacionadas a {topic}?",
                f"Quais são as tendências recentes em {topic}?",
                f"Quais são os desafios comuns relacionados a {topic}?"
            ]
        
        results = {}
        
        # Pesquisar o tópico geral
        general_results = self.search_with_summary(topic)
        results["visão_geral"] = general_results
        
        # Pesquisar cada pergunta específica
        for question in specific_questions:
            question_results = self.search_with_summary(question)
            # Usar a pergunta como chave
            key = question.lower().replace("?", "").replace(" ", "_")
            results[key] = question_results
        
        return {
            "topic": topic,
            "research_results": results
        } 