#!/usr/bin/env python
"""
Script para inicialização do servidor de IA de Gestão de Tráfego.
Este script carrega todas as dependências e inicia o servidor FastAPI.
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Garantir que o diretório raiz do projeto está no sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(root_dir))

# Carregar variáveis de ambiente
env_file = os.path.join(root_dir, '.env')
if os.path.exists(env_file):
    load_dotenv(env_file)
else:
    print(f"Arquivo .env não encontrado em {env_file}")
    print("Usando variáveis de ambiente do sistema ou valores padrão.")

# Configurar logging
logging.basicConfig(
    level=logging.INFO if os.getenv("DEBUG", "False").lower() != "true" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(root_dir, "trafego_ai.log"))
    ]
)

logger = logging.getLogger(__name__)

def main():
    """
    Função principal para iniciar o servidor.
    """
    try:
        logger.info("Inicializando o servidor de IA de Gestão de Tráfego...")
        
        # Importar aqui para garantir que as variáveis de ambiente já foram carregadas
        import uvicorn
        from backend.trafego_ai.config.settings import settings
        
        # Iniciar o servidor FastAPI
        logger.info(f"Iniciando servidor em {settings.host}:{settings.port}")
        uvicorn.run(
            "backend.trafego_ai.api.main:app",
            host=settings.host,
            port=settings.port,
            reload=settings.debug
        )
    except Exception as e:
        logger.error(f"Erro ao iniciar o servidor: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 