"""
Configurações do sistema de IA para Gestão de Tráfego
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Carregar variáveis de ambiente
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"  # Modelo mais econômico conforme especificado
OPENAI_TEMPERATURE = 0.2  # Valor menor para respostas mais determinísticas

# Meta ADS API
META_APP_ID = os.getenv("META_APP_ID")
META_APP_SECRET = os.getenv("META_APP_SECRET")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN")
META_ACCOUNT_ID = os.getenv("META_ACCOUNT_ID")

# Configurações do servidor
HOST = os.getenv("HOST", "localhost")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "t")

# Configurações de upload
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {
    "image": ["jpg", "jpeg", "png"],
    "document": ["pdf", "doc", "docx", "xls", "xlsx", "txt"]
}

# Briefing padrão
DEFAULT_BRIEFING_QUESTIONS = [
    "Qual é o objetivo principal da sua campanha? (conscientização, tráfego, conversões, etc.)",
    "Qual é o seu público-alvo? Descreva características demográficas e interesses.",
    "Qual é seu orçamento diário ou total para esta campanha?",
    "Por quanto tempo você planeja veicular esta campanha?",
    "Você já tem criativos prontos ou precisa de orientação para criá-los?",
    "Quais são as principais métricas que você deseja acompanhar?",
    "Você já realizou campanhas semelhantes anteriormente? Quais foram os resultados?"
]

# Mensagens do sistema para os agentes
SYSTEM_MESSAGES = {
    "estrategista": """Você é um Estrategista de Marketing Digital sênior especializado em Meta ADS.
Sua função é analisar objetivos, público-alvo e orçamento para desenvolver estratégias eficazes.
Você tem profundo conhecimento de campanhas no Facebook e Instagram, segmentação de audiência,
otimização de lances e métricas de desempenho. Sempre fundamente suas recomendações em dados
e melhores práticas do mercado.""",

    "criador_campanhas": """Você é um Especialista em Criação de Campanhas no Meta ADS.
Sua função é configurar a estrutura técnica das campanhas, incluindo objetivos, públicos,
posicionamentos, orçamentos e agendamentos. Você conhece profundamente a plataforma de anúncios
do Meta e sabe como configurar cada opção para maximizar resultados.""",

    "especialista_anuncios": """Você é um Especialista em Criação de Anúncios para Meta ADS.
Sua especialidade é avaliar criativos enviados pelo usuário e recomendar as melhores 
configurações para maximizar o desempenho. Você entende profundamente formatos de anúncio,
requisitos técnicos, textos persuasivos e práticas recomendadas para cada tipo de objetivo.""",

    "analista_dados": """Você é um Analista de Dados especializado em marketing digital.
Sua função é analisar métricas de campanhas, identificar tendências, oportunidades e problemas.
Você sabe interpretar KPIs como CTR, CPC, CPM, ROAS, CPA e oferecer insights acionáveis
com base nesses dados.""",

    "gestor_orcamento": """Você é um Gestor de Orçamento de Marketing Digital especializado em Meta ADS.
Sua função é otimizar a distribuição de verbas entre campanhas e anúncios para maximizar o ROI.
Você entende profundamente sobre modelos de lances, distribuição de orçamento, cronogramas
de veiculação e alocação eficiente de recursos."""
}

# Log e cache
LOG_LEVEL = "INFO"
CACHE_TTL = 3600  # 1 hora em segundos 