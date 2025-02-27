# Instruções para Configuração do Sistema de Monitoramento OpenAI

Este documento contém instruções para configurar corretamente o sistema de monitoramento de uso da OpenAI, permitindo que os dados fluam do N8N para o Supabase e sejam exibidos na interface.

## 1. Configuração do Ambiente

### 1.1. Arquivo .env.local (Aplicação Next.js)

Certifique-se de que seu arquivo `.env.local` contenha as seguintes variáveis:

```
# OpenAI
OPENAI_API_KEY=sua-chave-da-openai

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://sua-instancia.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_KEY=sua-chave-de-servico

# N8N API Configuration
NEXT_PUBLIC_N8N_API_URL=https://seu-servidor-n8n/api/v1
NEXT_PUBLIC_N8N_API_KEY=sua-chave-api-n8n
```

A `SUPABASE_SERVICE_KEY` é essencial para permitir que as rotas de API Next.js escrevam no banco de dados.

### 1.2. Configuração do N8N

O workflow do N8N "OpenAI Usage Sync" precisa das seguintes variáveis de ambiente:

1. `SUPABASE_URL` - URL da sua instância Supabase
2. `SUPABASE_SERVICE_KEY` - Chave de serviço (service_role) do Supabase
3. `N8N_API_URL` - URL da API do próprio N8N
4. `N8N_API_KEY` - Chave de API do N8N

Para configurar estas variáveis no N8N, você pode:

- Usar o script `scripts/setup-n8n-env.sh` (requer acesso via API)
- Configurar manualmente através da interface do N8N em Configurações > Variáveis

## 2. Banco de Dados Supabase

### 2.1. Tabelas Necessárias

As seguintes tabelas devem existir no Supabase:

- `openai_usage` - Registros individuais de uso
- `openai_usage_daily` - Uso agregado por dia
- `openai_usage_summary` - Resumo de uso por período

### 2.2. Configuração de Políticas RLS

Certifique-se de que as políticas RLS permitam:

1. Inserções anônimas (para o N8N)
2. Leitura para usuários autenticados
3. Todas as operações para o role "service_role"

As migrações criadas anteriormente já configuram isso corretamente.

## 3. Fluxo de Dados

### 3.1. Coleta de Dados pelo N8N

1. O workflow "OpenAI Usage Sync" é executado a cada 4 horas
2. Ele busca as execuções recentes de workflows marcados com a tag "agent"
3. Extrai informações de uso da OpenAI dessas execuções
4. Insere os registros na tabela `openai_usage` do Supabase
5. Chama a função `update_openai_usage_aggregations` para atualizar as tabelas de agregação

### 3.2. Exibição de Dados na Interface

A página `/creditos` usa o hook `useOpenAIUsage` para:

1. Buscar dados do Supabase
2. Formatar e preparar visualizações
3. Permitir sincronização manual com o botão "Sincronizar com N8N"

## 4. Solução de Problemas

### 4.1. Verificando Logs do N8N

Acesse o painel do N8N e verifique:

1. Se o workflow "OpenAI Usage Sync" está ativo
2. Os logs de execução para identificar erros
3. Se as variáveis de ambiente estão configuradas corretamente

### 4.2. Testando Conexão com Supabase

Use a rota `/api/n8n/sync-usage` para testar a sincronização e verificar erros:

```bash
curl -X POST http://localhost:3000/api/n8n/sync-usage
```

### 4.3. Problemas Comuns

- **Erro de Permissão**: Verifique se está usando a chave SERVICE_KEY e não a ANON_KEY
- **Coluna não encontrada**: Certifique-se de usar "Model" com M maiúsculo
- **Dados não aparecem na interface**: Verifique se a função de agregação está sendo executada

## 5. Configuração Passo a Passo

1. Execute as migrações no Supabase para criar as tabelas necessárias
2. Configure as variáveis de ambiente no arquivo `.env.local`
3. Execute o script `scripts/setup-n8n-env.sh` para configurar o N8N
4. Verifique se o workflow "OpenAI Usage Sync" está ativo no N8N
5. Teste a sincronização manual pela interface em `/creditos`

## 6. Manutenção

- Monitore o uso de armazenamento no Supabase
- Considere criar rotinas de limpeza para dados antigos
- Verifique periodicamente os logs do N8N para garantir que a sincronização continue funcionando 