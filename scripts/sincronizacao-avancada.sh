#!/bin/bash

# Verificar ambiente Node.js
if ! command -v node &> /dev/null || ! command -v npx &> /dev/null; then
    echo "Erro: Node.js e npx são necessários para executar este script."
    exit 1
fi

# Instalar dependências necessárias
echo "Instalando dependências necessárias..."
npm install --no-save @supabase/supabase-js dotenv

# Executar o script principal com parâmetros
echo "Iniciando extração avançada de dados OpenAI..."
echo "Período: últimos 90 dias"

# Chamada do script com parâmetros
npx ts-node scripts/extrair-dados-openai.ts --dias=90

# Verificar resultado
if [ $? -eq 0 ]; then
    echo "Sincronização concluída com sucesso!"
    echo "Verifique a tabela 'openai_usage' no Supabase para os dados extraídos."
else
    echo "Erro ao executar a sincronização."
    exit 1
fi

echo "Para verificar os dados, acesse a página de monitoramento." 