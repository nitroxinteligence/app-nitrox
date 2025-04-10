"""
Schemas Pydantic para o sistema de IA de Gestão de Tráfego
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any, Literal, Union
from datetime import datetime
import uuid


class Attachment(BaseModel):
    """Schema para representar anexos (imagens, documentos, etc.)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_url: str
    file_name: str
    file_type: str
    file_size: int
    extracted_text: Optional[str] = None


class Message(BaseModel):
    """Schema para representar mensagens no chat"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: datetime = Field(default_factory=datetime.now)
    attachments: Optional[List[Attachment]] = None


class BriefingResponse(BaseModel):
    """Schema para representar respostas de briefing"""
    question: str
    answer: str


class Briefing(BaseModel):
    """Schema para representar o briefing completo"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    responses: List[BriefingResponse]
    campaign_objective: Optional[str] = None
    target_audience: Optional[Dict[str, Any]] = None
    budget: Optional[float] = None
    duration: Optional[Dict[str, Any]] = None
    metrics: Optional[List[str]] = None
    creatives: Optional[List[Attachment]] = None
    status: str = "in_progress"  # in_progress, completed, archived


class Campaign(BaseModel):
    """Schema para representar campanhas"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    objective: str
    status: str = "draft"  # draft, active, paused, archived
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: float
    budget_type: str  # daily, lifetime
    bid_strategy: Optional[str] = None
    targeting: Dict[str, Any]
    placements: Optional[List[str]] = None
    ad_sets: Optional[List[Dict[str, Any]]] = None
    ads: Optional[List[Dict[str, Any]]] = None
    results: Optional[Dict[str, Any]] = None
    briefing_id: Optional[str] = None


class ChatRequest(BaseModel):
    """Schema para receber mensagens do frontend"""
    message: str
    attachments: Optional[List[Attachment]] = None
    user_id: str
    chat_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Schema para enviar respostas para o frontend"""
    message: str
    attachments: Optional[List[Attachment]] = None
    suggested_actions: Optional[List[str]] = None
    data: Optional[Dict[str, Any]] = None


class WebSearchRequest(BaseModel):
    """Schema para solicitação de pesquisa na web"""
    query: str
    num_results: int = 5


class WebSearchResult(BaseModel):
    """Schema para resultados de pesquisa na web"""
    title: str
    url: HttpUrl
    snippet: str


class WebSearchResponse(BaseModel):
    """Schema para resposta de pesquisa na web"""
    results: List[WebSearchResult]
    query: str


class MetaAdsMetrics(BaseModel):
    """Schema para métricas do Meta ADS"""
    campaign_id: str
    impressions: int
    clicks: int
    spend: float
    conversions: Optional[int] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    cpm: Optional[float] = None
    frequency: Optional[float] = None
    reach: Optional[int] = None
    relevance_score: Optional[float] = None
    date: datetime = Field(default_factory=datetime.now)


class OptimizationSuggestion(BaseModel):
    """Schema para sugestões de otimização"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    created_at: datetime = Field(default_factory=datetime.now)
    type: str  # budget, targeting, creative, bid
    suggestion: str
    expected_impact: str
    status: str = "pending"  # pending, implemented, ignored
    metrics_before: Optional[Dict[str, Any]] = None
    metrics_after: Optional[Dict[str, Any]] = None


class BriefingSchema(BaseModel):
    """
    Schema para o briefing de uma campanha.
    """
    nome_campanha: str = Field(..., title="Nome da Campanha", description="Nome identificador da campanha")
    objetivo: str = Field(..., title="Objetivo", description="Objetivo da campanha (conversões, tráfego, etc.)")
    publico_alvo: str = Field(..., title="Público-alvo", description="Descrição do público-alvo da campanha")
    orcamento: Optional[float] = Field(None, title="Orçamento", description="Orçamento disponível para a campanha")
    duracao: Optional[int] = Field(None, title="Duração", description="Duração da campanha em dias")
    criativos: Optional[str] = Field(None, title="Status dos Criativos", 
                                   description="Descrição dos criativos disponíveis ou necessários")
    metricas: Optional[str] = Field(None, title="Métricas", description="Métricas principais para avaliar a campanha")
    experiencia_previa: Optional[str] = Field(None, title="Experiência Prévia", 
                                            description="Experiência prévia com anúncios pagos")
    observacoes: Optional[str] = Field(None, title="Observações Adicionais", 
                                     description="Observações adicionais sobre a campanha")


class MessageSchema(BaseModel):
    """
    Schema para mensagens enviadas pelo usuário.
    """
    content: str = Field(..., title="Conteúdo", description="Conteúdo da mensagem")
    session_id: str = Field(..., title="ID da Sessão", description="Identificador da sessão do usuário")
    type: Optional[str] = Field("text", title="Tipo", 
                              description="Tipo da mensagem (text, briefing, criativo, etc.)")
    metadata: Optional[Dict[str, Any]] = Field(None, title="Metadados", 
                                              description="Metadados adicionais da mensagem")


class CriativoSchema(BaseModel):
    """
    Schema para um criativo de campanha.
    """
    descricao: str = Field(..., title="Descrição", description="Descrição detalhada do criativo")
    formato: str = Field(..., title="Formato", description="Formato do criativo (imagem, vídeo, carrossel, etc.)")
    objetivo: Optional[str] = Field(None, title="Objetivo", description="Objetivo específico do criativo")
    url_arquivo: Optional[str] = Field(None, title="URL do Arquivo", description="URL do arquivo do criativo")
    dimensoes: Optional[str] = Field(None, title="Dimensões", description="Dimensões do criativo (se aplicável)")
    texto_principal: Optional[str] = Field(None, title="Texto Principal", description="Texto principal do anúncio")
    texto_secundario: Optional[str] = Field(None, title="Texto Secundário", description="Texto secundário do anúncio")
    call_to_action: Optional[str] = Field(None, title="Call to Action", description="Chamada para ação do anúncio")


class CampanhaSchema(BaseModel):
    """
    Schema para uma campanha completa.
    """
    briefing: BriefingSchema = Field(..., title="Briefing", description="Briefing da campanha")
    criativos: List[CriativoSchema] = Field([], title="Criativos", description="Lista de criativos da campanha")
    metadados: Optional[Dict[str, Any]] = Field(None, title="Metadados", 
                                                description="Metadados adicionais da campanha")


class MensagemResponse(BaseModel):
    """
    Schema para resposta a uma mensagem.
    """
    id: str = Field(..., title="ID", description="Identificador único da resposta")
    content: str = Field("", title="Conteúdo", description="Conteúdo da resposta")
    is_complete: bool = Field(False, title="Completo", 
                             description="Indica se o processamento da mensagem foi concluído")
    error: Optional[str] = Field(None, title="Erro", description="Mensagem de erro, se houver")
    metadata: Optional[Dict[str, Any]] = Field(None, title="Metadados", 
                                              description="Metadados adicionais da resposta")


class CampanhaResponse(BaseModel):
    """
    Schema para resposta à criação de uma campanha.
    """
    id: str = Field(..., title="ID", description="Identificador único da resposta")
    estrategia: Optional[str] = Field(None, title="Estratégia", 
                                     description="Estratégia de marketing desenvolvida")
    estrutura_tecnica: Optional[str] = Field(None, title="Estrutura Técnica", 
                                           description="Estrutura técnica da campanha")
    especificacoes_anuncios: Optional[str] = Field(None, title="Especificações de Anúncios", 
                                                 description="Especificações detalhadas para os anúncios")
    is_complete: bool = Field(False, title="Completo", 
                             description="Indica se o processamento da campanha foi concluído")
    error: Optional[str] = Field(None, title="Erro", description="Mensagem de erro, se houver")
    metadata: Optional[Dict[str, Any]] = Field(None, title="Metadados", 
                                              description="Metadados adicionais da resposta") 