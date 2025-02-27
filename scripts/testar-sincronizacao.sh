#!/bin/bash

# Script para testar e corrigir sincronização N8N-Supabase
# Este script executa os procedimentos de diagnóstico e correção

# Cores para melhor legibilidade
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}Ferramenta de Diagnóstico e Correção de Sincronização N8N-Supabase${NC}"
echo "=============================================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERRO: Este script deve ser executado na raiz do projeto.${NC}"
    echo "Por favor, execute: cd /caminho/para/lealflow && ./scripts/testar-sincronizacao.sh"
    exit 1
fi

# Verificar se temos o curl instalado
if ! command -v curl &> /dev/null; then
    echo -e "${RED}ERRO: curl não está instalado. Por favor, instale o curl primeiro.${NC}"
    exit 1
fi

# Verificar variáveis de ambiente
echo -e "${BOLD}1. Verificando variáveis de ambiente...${NC}"

# Verificar .env.local
if [ -f ".env.local" ]; then
    echo -e "  ${GREEN}✓${NC} Arquivo .env.local encontrado"
    
    # Verificar variáveis específicas no .env.local
    if grep -q "SUPABASE_SERVICE_KEY" .env.local; then
        echo -e "  ${GREEN}✓${NC} SUPABASE_SERVICE_KEY encontrada em .env.local"
        # Carregar variáveis de ambiente
        export $(grep -v '^#' .env.local | xargs)
    else
        echo -e "  ${RED}✗${NC} SUPABASE_SERVICE_KEY não encontrada em .env.local"
        echo -e "      ${YELLOW}Adicione SUPABASE_SERVICE_KEY ao .env.local${NC}"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo -e "  ${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL encontrada em .env.local"
    else
        echo -e "  ${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL não encontrada em .env.local"
    fi
    
    if grep -q "NEXT_PUBLIC_N8N_API_URL" .env.local; then
        echo -e "  ${GREEN}✓${NC} NEXT_PUBLIC_N8N_API_URL encontrada em .env.local"
    else
        echo -e "  ${RED}✗${NC} NEXT_PUBLIC_N8N_API_URL não encontrada em .env.local"
    fi
    
    if grep -q "NEXT_PUBLIC_N8N_API_KEY" .env.local; then
        echo -e "  ${GREEN}✓${NC} NEXT_PUBLIC_N8N_API_KEY encontrada em .env.local"
    else
        echo -e "  ${RED}✗${NC} NEXT_PUBLIC_N8N_API_KEY não encontrada em .env.local"
    fi
else
    echo -e "  ${RED}✗${NC} Arquivo .env.local não encontrado"
    echo -e "      ${YELLOW}Crie o arquivo .env.local com as variáveis necessárias${NC}"
fi

# 2. Testar conexão com Supabase
echo -e "\n${BOLD}2. Testando conexão com Supabase...${NC}"

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "  ${RED}✗${NC} Variáveis de ambiente Supabase não definidas adequadamente"
    exit 1
fi

echo -e "  Conectando a: ${NEXT_PUBLIC_SUPABASE_URL}..."

SUPABASE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/")

if [ "$SUPABASE_RESPONSE" -eq 200 ]; then
    echo -e "  ${GREEN}✓${NC} Conectado ao Supabase com sucesso"
else
    echo -e "  ${RED}✗${NC} Falha na conexão com Supabase (código: $SUPABASE_RESPONSE)"
    echo -e "      ${YELLOW}Verifique URL e chave de serviço${NC}"
    exit 1
fi

# 3. Testar tabela openai_usage
echo -e "\n${BOLD}3. Verificando tabela openai_usage...${NC}"

TABLE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/openai_usage?limit=1")

if [ "$TABLE_RESPONSE" -eq 200 ]; then
    echo -e "  ${GREEN}✓${NC} Tabela openai_usage acessível"
else
    echo -e "  ${RED}✗${NC} Não foi possível acessar a tabela openai_usage (código: $TABLE_RESPONSE)"
    echo -e "      ${YELLOW}Verifique se a tabela existe e tem permissões adequadas${NC}"
fi

# 4. Testar carga manual para sincronização
echo -e "\n${BOLD}4. Testando endpoint de sincronização...${NC}"

echo -e "  Enviando solicitação para /api/n8n/sync-usage..."

SYNC_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    --data '{"forceSync": true, "debug": true}' \
    "http://localhost:3000/api/n8n/sync-usage")

if echo "$SYNC_RESPONSE" | grep -q "success"; then
    echo -e "  ${GREEN}✓${NC} Endpoint de sincronização respondeu com sucesso"
    echo -e "  Resposta: $SYNC_RESPONSE"
else
    echo -e "  ${RED}✗${NC} Falha no endpoint de sincronização"
    echo -e "  Resposta: $SYNC_RESPONSE"
fi

# 5. Criar pasta para diagnósticos se não existir
echo -e "\n${BOLD}5. Configurando pasta de diagnósticos...${NC}"

DIAGNOSTICS_DIR="diagnósticos"
mkdir -p "$DIAGNOSTICS_DIR"
echo -e "  ${GREEN}✓${NC} Pasta de diagnósticos configurada: $DIAGNOSTICS_DIR"

# 6. Executar diagnóstico completo nos webhooks
echo -e "\n${BOLD}6. Executando diagnóstico completo...${NC}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DIAG_FILE="${DIAGNOSTICS_DIR}/diagnostico_${TIMESTAMP}.txt"

echo -e "  Executando diagnóstico... Aguarde, isso pode levar alguns minutos."
echo -e "  Os resultados serão salvos em: ${BLUE}${DIAG_FILE}${NC}"

# Executar diagnóstico através do endpoint de sincronização com flags especiais
curl -s -X POST \
    -H "Content-Type: application/json" \
    --data '{"forceSync": true, "debug": true, "diagnostic": true}' \
    "http://localhost:3000/api/n8n/sync-usage" > "$DIAG_FILE"

echo -e "  ${GREEN}✓${NC} Diagnóstico concluído e salvo"

# 7. Perguntar se usuário quer aplicar a correção no workflow N8N
echo -e "\n${BOLD}7. Aplicar correção no workflow N8N?${NC}"
echo -e "   Esta ação irá:"
echo -e "   - Atualizar o script no workflow OpenAI Usage Sync"
echo -e "   - Corrigir o formato de dados enviados para o Supabase"
echo -e "   - Assegurar a correta normalização de modelos OpenAI"
echo -e ""
read -p "   Deseja aplicar a correção? (S/n): " APPLY_FIX

if [[ "$APPLY_FIX" =~ ^[Ss]$ ]] || [[ -z "$APPLY_FIX" ]]; then
    echo -e "   ${GREEN}✓${NC} Iniciando aplicação da correção..."
    
    # Avisar sobre a necessidade de fazer isso manualmente
    echo -e "   ${YELLOW}IMPORTANTE:${NC} A correção precisa ser aplicada manualmente no N8N:"
    echo -e "   1. Faça login no N8N"
    echo -e "   2. Abra o workflow 'OpenAI Usage Sync'"
    echo -e "   3. Edite o nó 'Sync OpenAI Usage'"
    echo -e "   4. Substitua o código atual pelo seguinte arquivo:"
    echo -e "      ${BLUE}$(pwd)/scripts/correcao-n8n-workflow.js${NC}"
    echo -e "   5. Salve o workflow e execute-o manualmente para testar"
    
    echo -e "\n   ${GREEN}Os arquivos de correção foram preparados com sucesso.${NC}"
else
    echo -e "   Correção não aplicada. Você pode aplicar manualmente depois."
fi

# 8. Conclusão
echo -e "\n${BOLD}8. Diagnóstico e correção concluídos!${NC}"
echo -e "   Revise os resultados em: ${BLUE}${DIAG_FILE}${NC}"
echo -e "   Se necessário, aplique as correções manuais conforme instruções."
echo -e ""
echo -e "   Para forçar uma nova sincronização após corrigir, execute:"
echo -e "   ${BLUE}curl -X POST http://localhost:3000/api/n8n/sync-usage -H 'Content-Type: application/json' --data '{\"forceSync\": true}'${NC}"
echo -e ""
echo -e "${BOLD}Processo concluído!${NC}" 