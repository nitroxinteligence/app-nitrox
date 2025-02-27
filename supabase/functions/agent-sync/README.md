# Função Edge Agent Sync

Esta é uma Edge Function do Supabase para sincronizar dados de execuções de agentes no N8N com o banco de dados Supabase.

## Funcionalidades

- Busca workflows com tag 'agent' no N8N
- Extrai dados de uso da API da OpenAI das execuções
- Calcula custos baseados nos modelos e tokens usados
- Salva dados na tabela openai_usage do Supabase
- Atualiza tabelas de agregação para visualização no dashboard

## Pré-requisitos

- Docker Desktop em execução
- CLI do Supabase instalada (`brew install supabase/tap/supabase`)
- Projeto Supabase configurado

## Como implantar

1. Certifique-se de que o Docker Desktop está em execução
2. Execute o comando a seguir no diretório raiz do projeto supabase:

```bash
supabase functions deploy agent-sync
```

3. Configure as variáveis de ambiente no Dashboard do Supabase (Settings > API):

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico
N8N_API_URL=https://seu-n8n.example.com
N8N_API_KEY=sua-chave-api-n8n
```

4. Adicione autorizações para a Edge Function no Dashboard do Supabase (Settings > API > Edge Functions):
   - Selecione a função `agent-sync`
   - Ative a opção "Service Role"

## Teste

Após a implantação, você pode testar a função usando a API do Next.js:

```bash
curl -X POST http://localhost:3000/api/agent/sync
```

Ou diretamente através da URL da Edge Function:

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/agent-sync \
  -H "Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"forceSync": true}'
```

## Uso na aplicação

A função pode ser acessada através do endpoint `/api/agent/sync` na aplicação Next.js, que irá repassar a requisição para a Edge Function do Supabase. 