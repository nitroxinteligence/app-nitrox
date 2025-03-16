# SiaFlow - Métricas de Leads

## API de Métricas de Leads

A API de métricas de leads é responsável por extrair, processar e armazenar dados sobre leads capturados e qualificados dos workflows do N8N. Esta solução foi projetada para ser robusta e fornecer informações valiosas sobre o desempenho das suas automações.

### Funcionamento

A API de métricas de leads funciona da seguinte forma:

1. **Busca de Workflows**: A API busca workflows no N8N que possuam a tag "main agent" ou variações dessa tag.
2. **Extração de Execuções**: Para cada workflow encontrado, a API extrai todas as execuções recentes (por padrão, dos últimos 30 dias).
3. **Processamento de Leads**: A API analisa os dados de cada execução para extrair informações sobre leads, incluindo:
   - Número de telefone ou ID remoto
   - Status do lead (capturado, qualificado, desqualificado)
   - Fonte e campanha
   - Tags e outros metadados
4. **Cálculo de Métricas**: A API calcula métricas agregadas por dia, incluindo:
   - Total de leads
   - Leads qualificados
   - Leads desqualificados
   - Taxa de conversão
5. **Armazenamento**: As métricas são salvas na tabela `lead_metrics` do Supabase.

### Endpoints

#### GET /api/metrics/lead-metrics

Extrai métricas de leads dos workflows do N8N e retorna os resultados.

**Resposta**:

```json
{
  "success": true,
  "message": "Lead metrics extracted and saved successfully",
  "metrics": [...],
  "config_status": {
    "n8n_configured": true,
    "n8n_connected": true,
    "workflows_found": true,
    "workflows_count": 3,
    "executions_count": 150,
    "executions_with_data": 120,
    "leads_found": true,
    "leads_count": 75,
    "metrics_count": 30
  }
}
```

#### POST /api/metrics/lead-metrics

Permite salvar manualmente uma métrica de lead no Supabase.

**Corpo da Requisição**:

```json
{
  "date": "2023-03-10",
  "total_leads": 50,
  "qualified_leads": 20,
  "unqualified_leads": 30,
  "conversion_rate": 0.4,
  "workflow_id": "workflow-123",
  "workflow_name": "Lead Generation Workflow",
  "agent_name": "Bot Maria",
  "tags": ["whatsapp", "website"],
  "source": "whatsapp",
  "campaign": "Campaign 2023"
}
```

**Resposta**:

```json
{
  "success": true,
  "message": "Metric saved successfully",
  "data": {...}
}
```

### Dados de Demonstração

A API gera automaticamente dados de demonstração nas seguintes situações:

1. **Configuração N8N Ausente**: Quando as variáveis de ambiente do N8N não estão configuradas.
2. **Falha de Conexão**: Quando não é possível conectar-se ao N8N.
3. **Nenhum Workflow Encontrado**: Quando não existem workflows com a tag "main agent".
4. **Dados Incompletos**: Quando as execuções não contêm dados completos (ocorre nas versões mais recentes do N8N).
5. **Nenhum Lead Encontrado**: Quando não é possível extrair dados de leads das execuções.

Isso garante que você sempre tenha dados para visualizar no dashboard, mesmo que a integração com o N8N não esteja completamente configurada ou funcional.

### Status de Configuração

A resposta da API inclui um objeto `config_status` que fornece informações detalhadas sobre o estado da integração com o N8N:

```json
"config_status": {
  "n8n_configured": true,        // Se as variáveis de ambiente estão configuradas
  "n8n_connected": true,         // Se foi possível conectar-se ao N8N
  "workflows_found": true,       // Se foram encontrados workflows com a tag "main agent"
  "workflows_count": 3,          // Número de workflows encontrados
  "executions_count": 150,       // Número total de execuções encontradas
  "executions_with_data": 120,   // Número de execuções com dados completos
  "leads_found": true,           // Se foram encontrados leads nas execuções
  "leads_count": 75,             // Número de leads encontrados
  "metrics_count": 30            // Número de métricas calculadas
}
```

Este objeto permite diagnosticar facilmente problemas de configuração ou dados.

### Configuração

A API utiliza as seguintes variáveis de ambiente:

- `NEXT_PUBLIC_N8N_API_URL`: URL da API do N8N (ex: "https://node.seudominio.com/api/v1")
- `NEXT_PUBLIC_N8N_API_KEY`: Chave de API do N8N
- `NEXT_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase
- `SUPABASE_SERVICE_KEY`: Chave de serviço do Supabase

## Solução de Problemas

### Mensagem "Usando dados de demonstração"

Se você ver esta mensagem, a API está gerando dados de demonstração por um dos seguintes motivos:

1. **N8N não configurado**: Verifique se as variáveis de ambiente `NEXT_PUBLIC_N8N_API_URL` e `NEXT_PUBLIC_N8N_API_KEY` estão definidas.
2. **Falha de conexão**: Verifique se a URL do N8N está correta e acessível.
3. **Nenhum workflow com tag "main agent"**: Adicione a tag "main agent" ao seu workflow principal no N8N.
4. **Execuções sem dados**: Esta é uma limitação conhecida do N8N mais recente, onde as execuções retornadas pela API não contêm dados completos.

### Restrições Conhecidas da API do N8N

- Em versões mais recentes do N8N, a API retorna execuções com a propriedade `hasData: false`. Isso significa que não é possível extrair dados de execuções diretamente. A melhor alternativa é implementar um webhook no N8N que envie dados diretamente para o Supabase após cada execução bem-sucedida.

## Melhores Práticas

1. **Tagging de Workflows**: Use a tag "main agent" em todos os workflows que devem ser monitorados para métricas de leads.
2. **Estrutura de Dados**: Mantenha uma estrutura consistente para dados de leads em seus workflows, incluindo sempre um campo para o número de telefone ou ID remoto.
3. **Webhooks para Supabase**: Considere implementar webhooks no N8N que enviem dados diretamente para o Supabase após cada execução.

## Motivação

Esta solução foi desenvolvida para fornecer insights valiosos sobre o desempenho dos seus fluxos de trabalho de atendimento, permitindo que você tome decisões informadas sobre suas estratégias de captação e qualificação de leads. Mesmo quando a integração direta com o N8N não é possível, a API fornece dados de demonstração realistas para permitir que você visualize e teste o dashboard sem interrupções.

## Métricas de Leads do N8N

O SiaFlow agora inclui uma integração completa para extrair métricas de leads dos workflows do N8N com a tag "main agent". Esta integração permite:

1. **Extração Automática de Métricas**: Captura dados de leads (capturados, qualificados, desqualificados) dos workflows do N8N.
2. **Armazenamento no Supabase**: As métricas são armazenadas na tabela `lead_metrics` do Supabase.
3. **Visualização em Dashboard**: Interface gráfica para visualizar as métricas em tempo real.
4. **Atualização Manual e Automática**: Possibilidade de atualizar as métricas manualmente ou via CRON.

### Componentes da Solução

- **API de Métricas**: `/api/metrics/lead-metrics` - Extrai e processa métricas do N8N.
- **CRON Endpoint**: `/api/cron/update-lead-metrics` - Permite atualizações automáticas via serviços CRON.
- **Dashboard de Métricas**: `/metricas/leads` - Interface para visualização das métricas.
- **Workflow N8N**: Modelo de workflow para integração com o sistema de métricas.

### Configuração

Para configurar a integração de métricas:

1. Configure as variáveis de ambiente necessárias:
   ```
   NEXT_PUBLIC_N8N_API_URL=https://seu-servidor-n8n/api/v1
   NEXT_PUBLIC_N8N_API_KEY=sua-chave-api-n8n
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico-supabase
   CRON_SECRET=um-segredo-para-proteger-a-api-cron
   ```

2. Importe o workflow modelo para o N8N (disponível em `n8n-workflows/lead-metrics-workflow.json`).

3. Configure o workflow conforme as instruções em `docs/configuracao-workflow-metricas.md`.

4. Configure um serviço CRON externo para chamar `/api/cron/update-lead-metrics` periodicamente.

### Uso

Acesse a página de métricas em `/metricas/leads` para visualizar:

- Total de leads capturados
- Leads qualificados e desqualificados
- Taxa de conversão
- Gráficos de evolução temporal
- Funil de conversão

Use o botão "Atualizar Métricas" para forçar uma atualização manual dos dados. 