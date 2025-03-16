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