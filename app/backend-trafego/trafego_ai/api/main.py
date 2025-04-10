"""
Ponto de entrada principal da API FastAPI para o sistema de IA de Gestão de Tráfego.
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from backend.trafego_ai.api.routers import router
from backend.trafego_ai.config.settings import settings

# Criar a aplicação FastAPI
app = FastAPI(
    title="SiaFlow - API de Gestão de Tráfego",
    description="API para interação com o sistema de IA de Gestão de Tráfego",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir os roteadores
app.include_router(router)

# Configurar diretório de uploads para ser acessível via HTTP
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Rota raiz
@app.get("/")
async def root():
    """
    Rota raiz da API.
    """
    return {
        "message": "API de Gestão de Tráfego funcionando!",
        "docs": "/docs",
        "endpoints": [
            "/api/trafego/session",
            "/api/trafego/message",
            "/api/trafego/upload",
            "/api/trafego/campanha",
            "/api/trafego/history/{session_id}"
        ]
    }

# Ponto de entrada para execução direta
if __name__ == "__main__":
    uvicorn.run(
        "backend.trafego_ai.api.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    ) 