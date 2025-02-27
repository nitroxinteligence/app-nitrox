#!/bin/bash

# Script para configurar variáveis de ambiente no N8N
# Este script deve ser executado no servidor onde o N8N está hospedado

# Carregar variáveis do arquivo .env.n8n
echo "Carregando variáveis de ambiente do arquivo .env.n8n"

# URL do servidor N8N
N8N_SERVER="https://node.clinicadopovo.onpsbu.easypanel.host"
# Token de API para acessar o N8N (deve ser o mesmo definido em NEXT_PUBLIC_N8N_API_KEY)
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2QwNzdlNS1lMzdiLTQ1NzQtOGQ5YS04OGNhNjUyN2VjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQwNTE5OTYyfQ.MrXNBTi13d_VMpCCbKoveb43d8hwpNQa4EFEn4PGVHQ"

echo "Configurando variáveis no servidor N8N via API"
echo "URL do servidor: $N8N_SERVER"

# Verificar se o curl está disponível
if ! command -v curl &> /dev/null; then
    echo "Erro: curl não está instalado, necessário para executar este script."
    exit 1
fi

# Ler variáveis do arquivo .env.n8n
if [ -f ".env.n8n" ]; then
    echo "Lendo variáveis de .env.n8n"
    source .env.n8n
else
    echo "Erro: Arquivo .env.n8n não encontrado!"
    exit 1
fi

# Verificar se as variáveis essenciais foram carregadas
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "Erro: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidas no arquivo .env.n8n"
    exit 1
fi

# Função para definir uma variável de ambiente no N8N via API
set_n8n_variable() {
    local key="$1"
    local value="$2"
    local description="$3"
    
    echo "Configurando variável: $key"
    
    # Verificar se a variável já existe
    response=$(curl -s -X GET "$N8N_SERVER/api/v1/variables" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json")
    
    # Extrair ID da variável se existir (simplificado - em produção use jq ou ferramentas adequadas)
    var_id=$(echo "$response" | grep -o "\"id\":\"[^\"]*\",\"key\":\"$key\"" | cut -d'"' -f3)
    
    if [ -n "$var_id" ]; then
        # Atualizar variável existente
        curl -s -X PATCH "$N8N_SERVER/api/v1/variables/$var_id" \
            -H "X-N8N-API-KEY: $N8N_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"key\": \"$key\",
                \"value\": \"$value\",
                \"description\": \"$description\"
            }" > /dev/null
        
        echo "  ✅ Variável $key atualizada com sucesso"
    else
        # Criar nova variável
        curl -s -X POST "$N8N_SERVER/api/v1/variables" \
            -H "X-N8N-API-KEY: $N8N_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"key\": \"$key\",
                \"value\": \"$value\",
                \"description\": \"$description\"
            }" > /dev/null
        
        echo "  ✅ Variável $key criada com sucesso"
    fi
}

# Configurar as variáveis no N8N
set_n8n_variable "SUPABASE_URL" "$SUPABASE_URL" "URL do servidor Supabase"
set_n8n_variable "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_KEY" "Chave de serviço do Supabase com permissões de escrita"
set_n8n_variable "SERVICE_BASE_URL" "$SERVICE_BASE_URL" "URL base do serviço para callbacks e webhooks"
set_n8n_variable "WEBHOOK_SECRET" "$WEBHOOK_SECRET" "Chave secreta para validar webhooks"
set_n8n_variable "OPENAI_API_KEY" "$OPENAI_API_KEY" "Chave da API OpenAI para testes"

echo ""
echo "✅ Configuração das variáveis de ambiente no N8N concluída com sucesso!"
echo "Agora você precisa ativar o workflow 'OpenAI Usage Sync' no painel do N8N"
echo "URL do painel: $N8N_SERVER"

# Adicionar cron job para sincronização automática de uso da OpenAI
echo ""
echo "Configurando sincronização automática de uso da OpenAI..."

# Verificar se o diretório de scripts existe
if [ ! -d "scripts" ]; then
  mkdir -p scripts
  echo "Diretório de scripts criado"
fi

# Criar script de sincronização
cat > scripts/sync-openai-usage.sh << 'EOF'
#!/bin/bash

# Script para sincronizar automaticamente dados de uso da OpenAI
# Este script deve ser executado periodicamente via cron job

# Cores para logs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Obter o diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Carregar variáveis de ambiente
if [ -f "$PROJECT_DIR/.env.local" ]; then
  source "$PROJECT_DIR/.env.local"
else
  echo -e "${RED}Arquivo .env.local não encontrado!${NC}"
  exit 1
fi

# Log
echo "$(date) - Iniciando sincronização de uso da OpenAI"

# Verificar variáveis necessárias
if [ -z "$NEXT_PUBLIC_N8N_API_URL" ] || [ -z "$NEXT_PUBLIC_N8N_API_KEY" ]; then
  echo -e "${RED}Configuração do N8N ausente em .env.local${NC}"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo -e "${RED}Configuração do Supabase ausente em .env.local${NC}"
  exit 1
fi

# URL da API de sincronização
API_URL="http://localhost:3000/api/n8n/sync-usage"

# Realizar a sincronização
echo "Chamando API de sincronização: $API_URL"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"forceSync": true}' \
  "$API_URL")

# Exibir resultado
if [[ $RESPONSE == *"success\":true"* ]]; then
  echo -e "${GREEN}Sincronização concluída com sucesso${NC}"
  echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4
  STATS=$(echo "$RESPONSE" | grep -o '"stats":{[^}]*}' | sed 's/"stats"://')
  echo "Estatísticas: $STATS"
else
  echo -e "${RED}Erro na sincronização${NC}"
  echo "$RESPONSE"
fi

echo "$(date) - Sincronização concluída"
echo "-------------------------------------"
EOF

# Tornar o script executável
chmod +x scripts/sync-openai-usage.sh

# Criar entrada no crontab 
if command -v crontab &> /dev/null; then
  echo "Configurando cron job para sincronização a cada hora..."
  
  # Verificar se já existe um cron job
  EXISTING_CRON=$(crontab -l 2>/dev/null | grep "sync-openai-usage.sh")
  
  if [ -z "$EXISTING_CRON" ]; then
    # Obter crontab atual e adicionar novo job
    CURRENT_DIR=$(pwd)
    (crontab -l 2>/dev/null; echo "0 * * * * cd $CURRENT_DIR && ./scripts/sync-openai-usage.sh >> ./logs/openai-sync.log 2>&1") | crontab -
    
    # Verificar se o diretório de logs existe
    if [ ! -d "logs" ]; then
      mkdir -p logs
      echo "Diretório de logs criado"
    fi
    
    echo "Cron job adicionado para executar a cada hora"
  else
    echo "Cron job já configurado para sincronização de uso da OpenAI"
  fi
else
  echo "Comando crontab não disponível. Configure a sincronização manualmente."
  echo "Sugestão: Execute o script 'scripts/sync-openai-usage.sh' periodicamente."
fi

echo "Configuração de sincronização automática concluída!" 