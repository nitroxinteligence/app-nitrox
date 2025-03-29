"""
Implementação dos roteadores da API FastAPI para o sistema de IA de Gestão de Tráfego.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from typing import List, Dict, Any, Optional
import json
from pydantic import ValidationError
import uuid
import os
import asyncio
from datetime import datetime

from backend.trafego_ai.models import (
    BriefingSchema,
    MessageSchema,
    CampanhaSchema,
    CriativoSchema,
    CampanhaResponse,
    MensagemResponse
)
from backend.trafego_ai.utils import CrewManager
from backend.trafego_ai.config.settings import settings

# Instanciar o router principal
router = APIRouter(prefix="/api/trafego", tags=["trafego"])

# Dicionário para armazenar os gerenciadores de equipe por sessão
crew_managers = {}

# Dicionário para armazenar o histórico de mensagens por sessão
message_history = {}

# Pasta para armazenar uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/session", response_model=Dict[str, str])
async def criar_sessao():
    """
    Cria uma nova sessão para o usuário.
    """
    session_id = str(uuid.uuid4())
    crew_managers[session_id] = CrewManager(verbose=settings.debug)
    message_history[session_id] = []
    
    return {"session_id": session_id}

def get_crew_manager(session_id: str) -> CrewManager:
    """
    Obtém o gerenciador de equipe para uma sessão específica.
    """
    if session_id not in crew_managers:
        # Criar um novo se não existir
        crew_managers[session_id] = CrewManager(verbose=settings.debug)
        message_history[session_id] = []
    
    return crew_managers[session_id]

@router.post("/message", response_model=MensagemResponse)
async def enviar_mensagem(
    message: MessageSchema,
    background_tasks: BackgroundTasks
):
    """
    Processa uma mensagem do usuário e retorna a resposta.
    """
    session_id = message.session_id
    
    # Verificar se a sessão existe
    if session_id not in crew_managers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada. Por favor, crie uma nova sessão."
        )
    
    # Adicionar mensagem ao histórico
    message_history[session_id].append({
        "role": "user",
        "content": message.content,
        "timestamp": datetime.now().isoformat()
    })
    
    # Obter o gerenciador de equipe
    crew_mgr = get_crew_manager(session_id)
    
    # Preparar a resposta inicial (typing indicator)
    response = {
        "id": str(uuid.uuid4()),
        "content": "",
        "is_complete": False,
        "error": None
    }
    
    # Processar a mensagem em segundo plano
    async def process_message():
        try:
            # Lógica para processar a mensagem com base no tipo
            if message.type == "briefing":
                try:
                    briefing_data = json.loads(message.content)
                    briefing = BriefingSchema(**briefing_data)
                    result = crew_mgr.criar_estrategia_campanha(briefing.dict())
                    response_content = f"Estratégia desenvolvida com sucesso.\n\n{result['estrategia']}"
                except ValidationError as e:
                    response_content = f"Erro ao processar o briefing: {str(e)}"
                except Exception as e:
                    response_content = f"Erro ao desenvolver estratégia: {str(e)}"
            
            elif message.type == "criativo":
                try:
                    criativo_data = json.loads(message.content)
                    result = crew_mgr.analisar_criativo(
                        descricao_criativo=criativo_data.get("descricao", ""),
                        formato=criativo_data.get("formato", "Não especificado"),
                        objetivo_campanha=criativo_data.get("objetivo", "Não especificado")
                    )
                    response_content = f"Análise do criativo concluída.\n\n{result['avaliacao_criativo']}"
                except Exception as e:
                    response_content = f"Erro ao analisar criativo: {str(e)}"
            
            else:  # mensagem comum
                # Implementação simplificada - em produção, seria analisada pelo NLU
                if "briefing" in message.content.lower():
                    response_content = ("Vamos elaborar seu briefing. Por favor, forneça as seguintes informações:\n\n"
                                      "1. Objetivo da campanha\n"
                                      "2. Público-alvo\n"
                                      "3. Orçamento\n"
                                      "4. Duração da campanha\n"
                                      "5. Métricas importantes\n"
                                      "6. Experiência prévia com anúncios")
                elif "analisar" in message.content.lower() and "criativo" in message.content.lower():
                    response_content = ("Para analisar seu criativo, preciso das seguintes informações:\n\n"
                                      "1. Descrição detalhada do criativo\n"
                                      "2. Formato (imagem, vídeo, carrossel, etc.)\n"
                                      "3. Objetivo da campanha")
                else:
                    response_content = ("Como posso ajudar com sua campanha de tráfego pago hoje? "
                                      "Posso ajudar com:\n\n"
                                      "- Elaboração de briefing\n"
                                      "- Estratégia de campanha\n"
                                      "- Análise de criativos\n"
                                      "- Criação de estrutura de campanha")
                
            # Atualizar a resposta
            response["content"] = response_content
            response["is_complete"] = True
            
            # Adicionar ao histórico
            message_history[session_id].append({
                "role": "assistant",
                "content": response_content,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            response["error"] = str(e)
            response["is_complete"] = True
    
    # Iniciar o processamento em segundo plano
    background_tasks.add_task(process_message)
    
    return response

@router.post("/upload", response_model=Dict[str, str])
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    file_type: str = Form(...)
):
    """
    Faz upload de um arquivo (criativo) para a sessão.
    """
    if session_id not in crew_managers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada."
        )
    
    # Criar diretório para a sessão
    session_dir = os.path.join(UPLOAD_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    # Salvar o arquivo
    file_ext = os.path.splitext(file.filename)[1]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_filename = f"{file_type}_{timestamp}{file_ext}"
    file_path = os.path.join(session_dir, safe_filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Obter URL relativa para o arquivo
    relative_path = os.path.join(session_id, safe_filename)
    
    return {
        "file_path": relative_path,
        "message": "Arquivo enviado com sucesso."
    }

@router.post("/campanha", response_model=CampanhaResponse)
async def criar_campanha(
    briefing: BriefingSchema,
    session_id: str,
    background_tasks: BackgroundTasks
):
    """
    Cria uma campanha completa com base no briefing fornecido.
    """
    if session_id not in crew_managers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada."
        )
    
    crew_mgr = get_crew_manager(session_id)
    
    # Preparar resposta inicial
    response = CampanhaResponse(
        id=str(uuid.uuid4()),
        is_complete=False,
        error=None
    )
    
    # Processar em segundo plano
    async def process_campanha():
        try:
            # Obter criativos da sessão (para um sistema real, isto seria mais sofisticado)
            session_dir = os.path.join(UPLOAD_DIR, session_id)
            criativos = []
            
            if os.path.exists(session_dir):
                for file in os.listdir(session_dir):
                    criativos.append({
                        "tipo": file.split("_")[0],
                        "caminho": os.path.join(session_dir, file),
                        "descricao": f"Arquivo {file}"
                    })
            
            # Executar o processo completo
            result = crew_mgr.processo_completo_campanha(
                briefing=briefing.dict(),
                criativos=criativos
            )
            
            # Atualizar a resposta
            response.estrategia = result["processo_completo"]["estrategia"]
            response.estrutura_tecnica = result["processo_completo"]["estrutura_tecnica"]
            response.especificacoes_anuncios = result["processo_completo"]["especificacoes_anuncios"]
            response.is_complete = True
            
            # Adicionar ao histórico
            message_history[session_id].append({
                "role": "system",
                "content": f"Campanha criada: {briefing.nome_campanha}",
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            response.error = str(e)
            response.is_complete = True
    
    # Iniciar o processamento em segundo plano
    background_tasks.add_task(process_campanha)
    
    return response

@router.get("/history/{session_id}", response_model=List[Dict[str, Any]])
async def obter_historico(session_id: str):
    """
    Obtém o histórico de mensagens para uma sessão.
    """
    if session_id not in message_history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada."
        )
    
    return message_history[session_id] 