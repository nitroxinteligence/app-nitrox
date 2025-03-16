# Scripts de Teste de Métricas de Leads

Este diretório contém scripts para testar a extração de métricas de leads dos workflows do N8N, salvá-las no Supabase e verificar se estão sendo exibidas corretamente na página `/metricas`.

## Novidade: Valores padrão incorporados

Os scripts agora incluem valores padrão para as principais variáveis de ambiente, o que facilita a execução sem precisar definir manualmente todas as variáveis. Os valores padrão incluem:

- URL da API do N8N
- Chave da API do N8N
- URL do Supabase

Se quiser usar seus próprios valores em vez dos padrões, você ainda pode definir as variáveis de ambiente conforme descrito abaixo.

## Execução Rápida

Para executar rapidamente os scripts usando os valores padrão:

**Usuários Linux/Mac:**
```bash
chmod +x scripts/test-lead-metrics.sh
./scripts/test-lead-metrics.sh
```

**Usuários Windows:**
```cmd
node scripts/test-lead-metrics.js
```

## Personalização via Variáveis de Ambiente (Opcional)

Se você quiser personalizar os valores em vez de usar os padrões:

### Script Shell (para Linux/Mac)

1. Configure as variáveis de ambiente:
   ```bash
   export NEXT_PUBLIC_N8N_API_URL="https://seu-n8n-url/api/v1"
   export NEXT_PUBLIC_N8N_API_KEY="sua-chave-api"
   export NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="sua-chave-supabase"
   ```

2. Opcionalmente, defina a URL do seu aplicativo (se não estiver rodando em localhost:3000):
   ```bash
   export APP_URL="https://seu-site.com"
   ```

3. Execute o script:
   ```bash
   ./scripts/test-lead-metrics.sh
   ```

### Script Node.js (para Windows/Linux/Mac)

1. Configure as variáveis de ambiente:

   **Windows (PowerShell):**
   ```powershell
   $env:NEXT_PUBLIC_N8N_API_URL="https://seu-n8n-url/api/v1"
   $env:NEXT_PUBLIC_N8N_API_KEY="sua-chave-api"
   $env:NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="sua-chave-supabase"
   ```

   **Windows (CMD):**
   ```cmd
   set NEXT_PUBLIC_N8N_API_URL=https://seu-n8n-url/api/v1
   set NEXT_PUBLIC_N8N_API_KEY=sua-chave-api
   set NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   set SUPABASE_SERVICE_ROLE_KEY=sua-chave-supabase
   ```

   **Linux/Mac:**
   ```bash
   export NEXT_PUBLIC_N8N_API_URL="https://seu-n8n-url/api/v1"
   export NEXT_PUBLIC_N8N_API_KEY="sua-chave-api"
   export NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="sua-chave-supabase"
   ```

2. Execute o script:
   ```bash
   node scripts/test-lead-metrics.js
   ```

## O que os scripts fazem

Os scripts executam as seguintes etapas:

1. Usam as variáveis de ambiente definidas ou os valores padrão incorporados.
2. Chamam a API `/api/metrics/lead-metrics` para extrair métricas de leads dos workflows do N8N com tag "agent".
3. Verificam se os dados foram salvos corretamente na tabela `lead_metrics` no Supabase.
4. (Opcional) Testam a rota CRON `/cron/metrics` que também atualiza as métricas.
5. Exibem os resultados no terminal.

Após a execução, você pode acessar a página `/metricas` para verificar se os dados estão sendo exibidos corretamente no dashboard.

## Solução de problemas

- Se você quiser usar suas próprias credenciais/URLs em vez dos valores padrão, defina as variáveis de ambiente necessárias.
- Se a API retornar erro 404, verifique se o servidor está em execução e se as rotas estão configuradas corretamente.
- Se a API retornar erro 500, verifique os logs do servidor para mais detalhes.
- Se a verificação do Supabase falhar, certifique-se de que as credenciais estão corretas e que a tabela `lead_metrics` existe. 