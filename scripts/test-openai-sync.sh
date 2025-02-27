#!/bin/bash

# Script para testar a sincronização de uso da OpenAI
# Este script executa testes para verificar se o fluxo de dados está funcionando corretamente

# Cores para melhor legibilidade
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}Teste de Sincronização de Uso da OpenAI${NC}"
echo "====================================="
echo ""

# 1. Verificar variáveis de ambiente
echo -e "${BOLD}1. Verificando variáveis de ambiente...${NC}"

# Verificar .env.local
if [ -f ".env.local" ]; then
    echo -e "  ${GREEN}✓${NC} Arquivo .env.local encontrado"
    
    # Verificar variáveis específicas no .env.local
    grep -q "SUPABASE_SERVICE_KEY" .env.local
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} SUPABASE_SERVICE_KEY encontrada em .env.local"
    else
        echo -e "  ${RED}✗${NC} SUPABASE_SERVICE_KEY não encontrada em .env.local"
        echo -e "      ${YELLOW}Adicione SUPABASE_SERVICE_KEY ao .env.local${NC}"
    fi
else
    echo -e "  ${RED}✗${NC} Arquivo .env.local não encontrado"
    echo -e "      ${YELLOW}Crie o arquivo .env.local com as variáveis necessárias${NC}"
fi

# Verificar .env.n8n
if [ -f ".env.n8n" ]; then
    echo -e "  ${GREEN}✓${NC} Arquivo .env.n8n encontrado"
    
    # Verificar variáveis específicas no .env.n8n
    grep -q "SUPABASE_URL" .env.n8n
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} SUPABASE_URL encontrada em .env.n8n"
    else
        echo -e "  ${RED}✗${NC} SUPABASE_URL não encontrada em .env.n8n"
    fi
    
    grep -q "SUPABASE_SERVICE_KEY" .env.n8n
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} SUPABASE_SERVICE_KEY encontrada em .env.n8n"
    else
        echo -e "  ${RED}✗${NC} SUPABASE_SERVICE_KEY não encontrada em .env.n8n"
    fi
else
    echo -e "  ${RED}✗${NC} Arquivo .env.n8n não encontrado"
    echo -e "      ${YELLOW}Crie o arquivo .env.n8n com as variáveis necessárias${NC}"
fi

echo ""

# 2. Verificar se o script de configuração do N8N está disponível
echo -e "${BOLD}2. Verificando script de configuração do N8N...${NC}"

if [ -f "scripts/setup-n8n-env.sh" ]; then
    echo -e "  ${GREEN}✓${NC} Script setup-n8n-env.sh encontrado"
    
    # Verificar se o script é executável
    if [ -x "scripts/setup-n8n-env.sh" ]; then
        echo -e "  ${GREEN}✓${NC} Script tem permissão de execução"
    else
        echo -e "  ${RED}✗${NC} Script não tem permissão de execução"
        echo -e "      ${YELLOW}Execute: chmod +x scripts/setup-n8n-env.sh${NC}"
    fi
else
    echo -e "  ${RED}✗${NC} Script setup-n8n-env.sh não encontrado"
    echo -e "      ${YELLOW}Crie o script para configurar variáveis no N8N${NC}"
fi

echo ""

# 3. Testar a rota de sincronização (se o servidor estiver rodando)
echo -e "${BOLD}3. Testando a rota de sincronização...${NC}"
echo -e "  ${YELLOW}Nota: Este teste requer que o servidor Next.js esteja rodando${NC}"
echo -e "  ${YELLOW}Se o servidor não estiver rodando, inicie-o com 'npm run dev'${NC}"
echo ""

read -p "O servidor Next.js está rodando? (s/n): " server_running

if [ "$server_running" = "s" ] || [ "$server_running" = "S" ]; then
    echo "Testando a rota de sincronização..."
    
    # Se curl estiver disponível, usá-lo para testar
    if command -v curl &> /dev/null; then
        echo "Executando: curl -X POST http://localhost:3000/api/n8n/sync-usage"
        curl -X POST http://localhost:3000/api/n8n/sync-usage
        echo ""
    else
        echo -e "  ${RED}✗${NC} curl não está disponível"
        echo -e "      ${YELLOW}Instale curl ou teste manualmente a rota${NC}"
    fi
else
    echo "Teste de rota ignorado. Execute manualmente mais tarde."
fi

echo ""

# 4. Verificar arquivos de código-fonte
echo -e "${BOLD}4. Verificando arquivos de código-fonte...${NC}"

# Verificar n8n-service.ts
if [ -f "lib/n8n-service.ts" ]; then
    echo -e "  ${GREEN}✓${NC} Arquivo lib/n8n-service.ts encontrado"
    
    # Verificar se usa a coluna 'Model' corretamente
    grep -q 'Model: cost.model' lib/n8n-service.ts
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} lib/n8n-service.ts usa 'Model' (maiúsculo) corretamente"
    else
        echo -e "  ${YELLOW}⚠${NC} Não foi possível verificar se lib/n8n-service.ts usa 'Model' corretamente"
        echo -e "      ${YELLOW}Verifique manualmente se está usando 'Model' em vez de 'model'${NC}"
    fi
else
    echo -e "  ${RED}✗${NC} Arquivo lib/n8n-service.ts não encontrado"
fi

# Verificar route.ts
if [ -f "app/api/n8n/sync-usage/route.ts" ]; then
    echo -e "  ${GREEN}✓${NC} Arquivo app/api/n8n/sync-usage/route.ts encontrado"
    
    # Verificar se usa a chave de serviço
    grep -q 'SUPABASE_SERVICE_KEY' app/api/n8n/sync-usage/route.ts
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} route.ts usa SUPABASE_SERVICE_KEY corretamente"
    else
        echo -e "  ${RED}✗${NC} route.ts não usa SUPABASE_SERVICE_KEY"
        echo -e "      ${YELLOW}Ajuste o arquivo para usar SUPABASE_SERVICE_KEY${NC}"
    fi
else
    echo -e "  ${RED}✗${NC} Arquivo app/api/n8n/sync-usage/route.ts não encontrado"
fi

# Verificar useOpenAIUsage.ts
if [ -f "hooks/useOpenAIUsage.ts" ]; then
    echo -e "  ${GREEN}✓${NC} Arquivo hooks/useOpenAIUsage.ts encontrado"
    
    # Verificar se usa a coluna 'Model' corretamente
    grep -q 'Model:' hooks/useOpenAIUsage.ts
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} useOpenAIUsage.ts usa 'Model' (maiúsculo) corretamente"
    else
        echo -e "  ${YELLOW}⚠${NC} Não foi possível verificar se useOpenAIUsage.ts usa 'Model' corretamente"
        echo -e "      ${YELLOW}Verifique manualmente se está usando 'Model' em vez de 'model'${NC}"
    fi
else
    echo -e "  ${RED}✗${NC} Arquivo hooks/useOpenAIUsage.ts não encontrado"
fi

echo ""
echo -e "${BOLD}Sumário de Verificação:${NC}"
echo "====================

Este teste verificou se as configurações básicas para o fluxo de dados OpenAI estão corretas.

Próximos passos:
1. Se algum erro foi encontrado, corrija-o seguindo as instruções em amarelo
2. Execute o script de configuração no servidor N8N:
   $ ./scripts/setup-n8n-env.sh
3. Verifique se o workflow 'OpenAI Usage Sync' está ativo no N8N
4. Teste a sincronização manual pela página de créditos (/creditos)
5. Verifique no Supabase se os dados estão sendo inseridos corretamente

Para mais detalhes, consulte os arquivos:
- SETUP_INSTRUCTIONS.md (Instruções detalhadas de configuração)
- README_CREDITOS.md (Resumo das correções implementadas)
"

echo -e "${GREEN}Teste concluído!${NC}" 