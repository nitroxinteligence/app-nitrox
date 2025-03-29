#!/bin/bash
# Script para testar a extração de métricas de leads do N8N e sua exibição no dashboard

echo "=== Teste de Métricas de Leads ==="
echo "Verificando variáveis de ambiente..."

# Valores padrão para as variáveis (serão usados se não estiverem definidas no ambiente)
DEFAULT_N8N_API_URL="https://node.clinicadopovo.onpsbu.easypanel.host/api/v1"
DEFAULT_N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2QwNzdlNS1lMzdiLTQ1NzQtOGQ5YS04OGNhNjUyN2VjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQwNTE5OTYyfQ.MrXNBTi13d_VMpCCbKoveb43d8hwpNQa4EFEn4PGVHQ"
DEFAULT_SUPABASE_URL="https://dkvqjisxtdlrdgseiooq.supabase.co"
DEFAULT_SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdnFqaXN4dGRscmRnc2Vpb29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzg2MDY5NSwiZXhwIjoyMDUzNDM2Njk1fQ.kFV65mUt9ljbP9sFaaKQ7JlzL5aiEf-ZOsgdmOk1Lqo" # Deixe em branco se não tiver um valor padrão

# Utiliza as variáveis de ambiente se definidas, ou os valores padrão caso contrário
N8N_API_URL=${NEXT_PUBLIC_N8N_API_URL:-$DEFAULT_N8N_API_URL}
N8N_API_KEY=${NEXT_PUBLIC_N8N_API_KEY:-$DEFAULT_N8N_API_KEY}
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$DEFAULT_SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-$DEFAULT_SUPABASE_KEY}

echo "Usando as seguintes configurações:"
echo "- N8N API URL: $N8N_API_URL"
echo "- Supabase URL: $SUPABASE_URL"
echo "- Chaves de API: *** (omitidas por segurança)"

# Função para mostrar mensagem de erro e sair
error_exit() {
  echo "ERRO: $1"
  exit 1
}

# Define a URL base para as chamadas de API (usando o localhost por padrão)
BASE_URL="http://localhost:3000"
if [ -n "$APP_URL" ]; then
  BASE_URL="$APP_URL"
fi

echo -e "\n1. Extraindo métricas de leads dos workflows do N8N..."
echo "Enviando requisição para $BASE_URL/api/metrics/lead-metrics"

# Sobrescrever as variáveis de ambiente temporariamente apenas para este script
export NEXT_PUBLIC_N8N_API_URL="$N8N_API_URL"
export NEXT_PUBLIC_N8N_API_KEY="$N8N_API_KEY"
export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY"

# Enviar a requisição e armazenar a resposta
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/metrics/lead-metrics")
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$ d')

# Verificar o status HTTP
if [ "$HTTP_STATUS" -ne 200 ]; then
  error_exit "A API retornou status HTTP $HTTP_STATUS. Resposta: $RESPONSE_BODY"
fi

# Verificar se a resposta indica sucesso
SUCCESS=$(echo "$RESPONSE_BODY" | grep -o '"success":true' || echo "")
if [ -z "$SUCCESS" ]; then
  error_exit "A API não retornou sucesso. Resposta: $RESPONSE_BODY"
fi

echo -e "\n✅ API de métricas retornou com sucesso!"

# Extrair e mostrar os dados da resposta
TOTAL_LEADS=$(echo "$RESPONSE_BODY" | grep -o '"total_leads":[0-9]*' | cut -d':' -f2)
QUALIFIED_LEADS=$(echo "$RESPONSE_BODY" | grep -o '"qualified_leads":[0-9]*' | cut -d':' -f2)
UNQUALIFIED_LEADS=$(echo "$RESPONSE_BODY" | grep -o '"unqualified_leads":[0-9]*' | cut -d':' -f2)
CONVERSION_RATE=$(echo "$RESPONSE_BODY" | grep -o '"conversion_rate":[0-9.]*' | cut -d':' -f2)

echo -e "\nMétricas extraídas:"
echo "- Leads Capturados: $TOTAL_LEADS"
echo "- Leads Qualificados: $QUALIFIED_LEADS"
echo "- Leads Desqualificados: $UNQUALIFIED_LEADS"
echo "- Taxa de Conversão: $CONVERSION_RATE%"

# Verificar se os dados foram salvos no Supabase (opcional)
echo -e "\n2. Verificando se os dados foram salvos no Supabase..."

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  # Usar data atual formatada como YYYY-MM-DD
  TODAY=$(date +"%Y-%m-%d")
  
  SUPABASE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "$SUPABASE_URL/rest/v1/lead_metrics?date=eq.$TODAY&select=*")
  
  SUPABASE_STATUS=$(echo "$SUPABASE_RESPONSE" | tail -n1)
  SUPABASE_BODY=$(echo "$SUPABASE_RESPONSE" | sed '$ d')
  
  if [ "$SUPABASE_STATUS" -ne 200 ]; then
    echo "AVISO: Não foi possível verificar os dados no Supabase. Status: $SUPABASE_STATUS"
  else
    if [ "$SUPABASE_BODY" = "[]" ]; then
      echo "AVISO: Nenhum registro encontrado para hoje ($TODAY) no Supabase."
    else
      echo "✅ Dados encontrados no Supabase para a data de hoje ($TODAY)!"
      echo "Dados salvos no Supabase:"
      echo "$SUPABASE_BODY" | sed 's/,/,\n/g' | sed 's/{/{\n/g' | sed 's/}/\n}/g'
    fi
  fi
else
  echo "AVISO: Verificação do Supabase ignorada devido a variáveis de ambiente ausentes."
fi

echo -e "\n3. Testando a rota CRON (opcional)..."
read -p "Deseja testar também a rota CRON? (s/n): " TEST_CRON

if [ "$TEST_CRON" = "s" ] || [ "$TEST_CRON" = "S" ]; then
  echo "Enviando requisição para $BASE_URL/cron/metrics"
  
  CRON_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/cron/metrics")
  CRON_STATUS=$(echo "$CRON_RESPONSE" | tail -n1)
  CRON_BODY=$(echo "$CRON_RESPONSE" | sed '$ d')
  
  if [ "$CRON_STATUS" -ne 200 ]; then
    echo "AVISO: A rota CRON retornou status HTTP $CRON_STATUS. Resposta: $CRON_BODY"
  else
    CRON_SUCCESS=$(echo "$CRON_BODY" | grep -o '"success":true' || echo "")
    if [ -z "$CRON_SUCCESS" ]; then
      echo "AVISO: A rota CRON não retornou sucesso. Resposta: $CRON_BODY"
    else
      echo "✅ Rota CRON funcionou corretamente!"
    fi
  fi
else
  echo "Teste da rota CRON ignorado."
fi

echo -e "\n=== Teste Concluído ==="
echo "Para visualizar as métricas na interface, acesse: $BASE_URL/metricas"
echo "Você também pode clicar no botão de atualização na interface para buscar novas métricas."
echo "Lembre-se que o reload da página pode ser necessário após a atualização das métricas." 