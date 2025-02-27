#!/bin/bash

# Script para instalar cronjob de sincronização N8N -> Supabase
# Este script deve ser executado com permissões de usuário (não root)

# Obter caminho absoluto da aplicação
APP_PATH=$(pwd)
SITE_URL="http://localhost:3000"

# Se a variável SITE_URL estiver definida no ambiente, usá-la
if [ -n "$NEXT_PUBLIC_SITE_URL" ]; then
  SITE_URL="$NEXT_PUBLIC_SITE_URL"
fi

echo "=== Instalando Cronjob de Sincronização N8N -> Supabase ==="
echo "Aplicação: $APP_PATH"
echo "URL do site: $SITE_URL"

# Verificar se o site está rodando
if ! curl -s --head "$SITE_URL" > /dev/null; then
  echo "AVISO: O site não parece estar acessível no momento."
  echo "Certifique-se de que a aplicação esteja rodando quando o cron for executado."
fi

# Criar linha do crontab
CRON_LINE="0 */2 * * * curl -s -X GET \"$SITE_URL/api/cron/sync-n8n?token=sync-n8n-cron-secret\" > $APP_PATH/logs/cron-sync-$(date +\%Y\%m\%d).log 2>&1"

# Criar diretório de logs se não existir
mkdir -p "$APP_PATH/logs"

# Verificar se o cron já existe
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -F "sync-n8n?token=sync-n8n-cron-secret")

if [ -n "$EXISTING_CRON" ]; then
  echo "O cronjob já está instalado. Deseja reinstalá-lo? (s/n)"
  read -r REINSTALL
  if [ "$REINSTALL" != "s" ]; then
    echo "Instalação cancelada."
    exit 0
  fi
  
  # Remover cron existente
  crontab -l 2>/dev/null | grep -v "sync-n8n?token=sync-n8n-cron-secret" | crontab -
  echo "Cronjob anterior removido."
fi

# Adicionar nova linha ao crontab
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo "Cronjob instalado com sucesso!"
echo "Agora a sincronização será executada automaticamente a cada 2 horas."
echo "Os logs serão salvos em: $APP_PATH/logs/" 