#!/bin/bash

# Script para sincronizar automaticamente dados de uso da OpenAI
# Este script deve ser executado periodicamente via cron job

# Cores para logs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Obter o diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Função para log
log() {
  echo -e "$(date "+%Y-%m-%d %H:%M:%S") - $1"
}

# Função para mostrar valor parcial de variável (para logs)
show_partial() {
  local val="$1"
  local name="$2"
  if [ -z "$val" ]; then
    echo "${RED}$name não definido${NC}"
  else
    local len=${#val}
    if [ $len -gt 20 ]; then
      echo "${name}=${val:0:8}...${val: -8} (${len} caracteres)"
    else
      echo "${name}=<valor definido> (${len} caracteres)"
    fi
  fi
}

log "Iniciando sincronização de uso da OpenAI"
log "Diretório do projeto: $PROJECT_DIR"

# Carregar variáveis de ambiente
if [ -f "$PROJECT_DIR/.env.local" ]; then
  log "Carregando variáveis de ambiente de .env.local"
  set -o allexport
  source "$PROJECT_DIR/.env.local"
  set +o allexport
else
  log "${RED}Arquivo .env.local não encontrado!${NC}"
  
  # Tentar carregar do .env como alternativa
  if [ -f "$PROJECT_DIR/.env" ]; then
    log "${YELLOW}Tentando carregar de .env em vez disso...${NC}"
    set -o allexport
    source "$PROJECT_DIR/.env"
    set +o allexport
  else
    log "${RED}Nenhum arquivo de ambiente encontrado. Abortando.${NC}"
    exit 1
  fi
fi

# Verificar variáveis essenciais
log "${BLUE}Verificando variáveis de ambiente necessárias...${NC}"
log "$(show_partial "$NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_URL")"
log "$(show_partial "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_SUPABASE_ANON_KEY")"
log "$(show_partial "$SUPABASE_SERVICE_KEY" "SUPABASE_SERVICE_KEY")"
log "$(show_partial "$NEXT_PUBLIC_N8N_API_URL" "NEXT_PUBLIC_N8N_API_URL")"
log "$(show_partial "$NEXT_PUBLIC_N8N_API_KEY" "NEXT_PUBLIC_N8N_API_KEY")"

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  log "${RED}NEXT_PUBLIC_SUPABASE_URL não definido no arquivo de ambiente!${NC}"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ] && [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  log "${RED}Nenhuma chave do Supabase encontrada no arquivo de ambiente!${NC}"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_N8N_API_URL" ]; then
  log "${YELLOW}NEXT_PUBLIC_N8N_API_URL não definido, usando URL padrão${NC}"
fi

# Definir a URL base para a API
BASE_URL="http://localhost:3000"

if [ -n "$SERVICE_BASE_URL" ]; then
  BASE_URL="$SERVICE_BASE_URL"
fi

# URL completa da API de sincronização
API_URL="${BASE_URL}/api/n8n/sync-usage"

log "URL da API: $API_URL"
log "Parâmetros da requisição: forceSync=true"

# Executar a sincronização com retry
MAX_RETRIES=2
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$SUCCESS" = false ]; do
  if [ $RETRY_COUNT -gt 0 ]; then
    log "${YELLOW}Tentativa $((RETRY_COUNT+1)) de $MAX_RETRIES...${NC}"
    sleep 5
  fi
  
  log "${BLUE}Enviando requisição HTTP para $API_URL...${NC}"
  
  # Usar um arquivo temporário para o output
  TEMP_OUTPUT=$(mktemp)
  TEMP_HEADERS=$(mktemp)
  
  # Realizar a chamada com Content-Type adequado e timeout
  curl -s -D "$TEMP_HEADERS" -o "$TEMP_OUTPUT" -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{"forceSync": true, "debug": true}' \
    --max-time 120 \
    "$API_URL"
  
  CURL_STATUS=$?
  
  # Verificar se o curl foi executado com sucesso
  if [ $CURL_STATUS -ne 0 ]; then
    log "${RED}Erro na execução do curl: $CURL_STATUS${NC}"
    cat "$TEMP_HEADERS" "$TEMP_OUTPUT"
    RETRY_COUNT=$((RETRY_COUNT+1))
    continue
  fi
  
  # Verificar o status HTTP a partir dos headers
  STATUS_CODE=$(grep -E "^HTTP/[0-9.]+ " "$TEMP_HEADERS" | tail -n 1 | awk '{print $2}')
  
  if [ "$STATUS_CODE" != "200" ]; then
    log "${RED}Erro na resposta HTTP: Status $STATUS_CODE${NC}"
    log "${YELLOW}Headers da resposta:${NC}"
    cat "$TEMP_HEADERS"
    log "${YELLOW}Corpo da resposta:${NC}"
    cat "$TEMP_OUTPUT"
    RETRY_COUNT=$((RETRY_COUNT+1))
    continue
  fi
  
  # Ler o conteúdo do arquivo
  RESPONSE_BODY=$(cat "$TEMP_OUTPUT")
  
  # Limpar arquivos temporários
  rm -f "$TEMP_HEADERS" "$TEMP_OUTPUT"
  
  # Verificar se a resposta é um JSON válido com um teste mais simples
  if [ -z "$RESPONSE_BODY" ] || ! echo "$RESPONSE_BODY" | grep -q "{"; then
    log "${RED}Resposta vazia ou não parece ser um JSON:${NC}"
    log "$RESPONSE_BODY"
    RETRY_COUNT=$((RETRY_COUNT+1))
    continue
  fi
  
  # Verificar sucesso/falha diretamente do conteúdo
  if echo "$RESPONSE_BODY" | grep -q '"success":true'; then
    SUCCESS=true
    MESSAGE=$(echo "$RESPONSE_BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    log "${GREEN}Sincronização concluída com sucesso:${NC} $MESSAGE"
    
    # Mostrar mais detalhes da resposta
    log "${BLUE}Resposta completa:${NC}"
    echo "$RESPONSE_BODY" | jq -r '.' || echo "$RESPONSE_BODY"
    
    # Mostrar estatísticas de forma mais simples
    WORKFLOWS=$(echo "$RESPONSE_BODY" | grep -o '"workflows_processed":[0-9]*' | cut -d':' -f2)
    RECORDS=$(echo "$RESPONSE_BODY" | grep -o '"total_records":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$WORKFLOWS" ] && [ -n "$RECORDS" ]; then
      log "${GREEN}Estatísticas:${NC}"
      log "- Workflows processados: $WORKFLOWS"
      log "- Registros inseridos: $RECORDS"
    fi
  else
    ERROR=$(echo "$RESPONSE_BODY" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$ERROR" ]; then
      ERROR="Erro desconhecido"
    fi
    log "${RED}Erro na sincronização:${NC} $ERROR"
    log "${YELLOW}Resposta completa:${NC}"
    echo "$RESPONSE_BODY"
    RETRY_COUNT=$((RETRY_COUNT+1))
  fi
done

if [ "$SUCCESS" = false ]; then
  log "${RED}Falha após $MAX_RETRIES tentativas. Verifique os logs para mais detalhes.${NC}"
  exit 1
fi

log "${GREEN}Sincronização concluída${NC}"
log "-------------------------------------"
exit 0 