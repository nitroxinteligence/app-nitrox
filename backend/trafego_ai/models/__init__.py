"""
Pacote de modelos para o sistema de IA de Gestão de Tráfego
"""

from backend.trafego_ai.models.schemas import (
    Message, 
    Attachment, 
    Briefing, 
    BriefingResponse,
    Campaign,
    ChatRequest,
    ChatResponse,
    WebSearchRequest,
    WebSearchResponse,
    WebSearchResult,
    MetaAdsMetrics,
    OptimizationSuggestion
)

__all__ = [
    "Message",
    "Attachment",
    "Briefing",
    "BriefingResponse",
    "Campaign",
    "ChatRequest",
    "ChatResponse",
    "WebSearchRequest",
    "WebSearchResponse",
    "WebSearchResult",
    "MetaAdsMetrics",
    "OptimizationSuggestion"
] 