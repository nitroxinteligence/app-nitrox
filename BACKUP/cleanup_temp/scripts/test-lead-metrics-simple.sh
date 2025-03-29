#!/bin/bash
# Versão simplificada do script para testar a extração de métricas de leads

# Ativar modo de depuração para mostrar cada comando executado
set -x

echo "=== Teste de Métricas de Leads (Versão Simplificada) ==="

# Configurações diretas sem usar variáveis de ambiente
N8N_API_URL="https://node.clinicadopovo.onpsbu.easypanel.host/api/v1"
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2QwNzdlNS1lMzdiLTQ1NzQtOGQ5YS04OGNhNjUyN2VjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQwNTE5OTYyfQ.MrXNBTi13d_VMpCCbKoveb43d8hwpNQa4EFEn4PGVHQ"
SUPABASE_URL="https://dkvqjisxtdlrdgseiooq.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdnFqaXN4dGRscmRnc2Vpb29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzg2MDY5NSwiZXhwIjoyMDUzNDM2Njk1fQ.kFV65mUt9ljbP9sFaaKQ7JlzL5aiEf-ZOsgdmOk1Lqo" # Adicione sua chave aqui se necessário

# Verificação básica
echo "Testando se o curl está instalado..."
if ! command -v curl &> /dev/null; then
    echo "Erro: curl não está instalado. Por favor, instale-o e tente novamente."
    exit 1
fi

# Define a URL base
BASE_URL="http://localhost:3000"

echo "Acessando API de métricas em $BASE_URL/api/metrics/lead-metrics"

# Configuração temporária das variáveis de ambiente para o curl
export NEXT_PUBLIC_N8N_API_URL="$N8N_API_URL"
export NEXT_PUBLIC_N8N_API_KEY="$N8N_API_KEY" 
export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY"

# 1. Teste primeiro se o servidor está acessível
echo "Verificando se o servidor está acessível..."
SERVER_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$SERVER_TEST" != "200" ]; then
    echo "AVISO: O servidor em $BASE_URL retornou código $SERVER_TEST"
    echo "Seu servidor Next.js está rodando? Se estiver em outra URL, use: export APP_URL=sua-url"
fi

# 2. Chama a API de métricas simplificada
echo "Chamando API de métricas..."
RESPONSE=$(curl -s "$BASE_URL/api/metrics/lead-metrics")
echo "Resposta da API:"
echo "$RESPONSE" | grep -o '"success":[a-z]*\|"total_leads":[0-9]*\|"qualified_leads":[0-9]*\|"unqualified_leads":[0-9]*\|"conversion_rate":[0-9.]*' || echo "Não foi possível extrair métricas da resposta"

echo "=== Teste Concluído ==="
echo "Se você não viu métricas extraídas acima, tente estas verificações:"
echo "1. Certifique-se que seu servidor Next.js está rodando em $BASE_URL"
echo "2. Verifique os logs do servidor para ver erros específicos"
echo "3. Tente o script Node.js com: node scripts/test-lead-metrics.js"
echo "4. Veja a saída completa do comando curl para diagnóstico:"
echo "$RESPONSE" 