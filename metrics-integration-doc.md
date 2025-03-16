# Integração de Métricas do N8N com Dashboard

Esta documentação descreve a implementação de extração de métricas de leads de workflows do N8N com a tag "agent" e como essas métricas são salvas na tabela `lead_metrics` do Supabase para exibição no dashboard.

## Visão Geral

A solução implementada permite extrair automaticamente métricas relacionadas a leads dos workflows do N8N sem modificar os workflows existentes. As métricas extraídas são:

- **Leads Capturados** - Total de leads processados pelos workflows
- **Leads Qualificados** - Leads identificados como qualificados
- **Leads Desqualificados** - Leads identificados como não qualificados
- **Taxa de Conversão** - Porcentagem de leads qualificados em relação ao total

## Componentes da Solução

### 1. API de Extração de Métricas

**Endpoint**: `/api/metrics/lead-metrics`

Esta API é responsável por:
1. Buscar todos os workflows do N8N com a tag "agent"
2. Para cada workflow, buscar as execuções das últimas 24 horas
3. Analisar os dados de resultado de cada execução para extrair as métricas
4. Calcular a taxa de conversão
5. Salvar as métricas na tabela `lead_metrics` do Supabase

A análise é feita inspecionando os dados de saída de cada nó do workflow, procurando por padrões que identifiquem leads e seu status de qualificação.

### 2. API CRON para Atualização Automática

**Endpoint**: `/api/cron/update-lead-metrics`

Esta API permite configurar uma execução automática da extração de métricas:
1. Pode ser chamada por um serviço de CRON externo (como cron-job.org, GitHub Actions, etc.)
2. Inclui verificação de autenticação opcional via token
3. Chama internamente a API de extração de métricas

### 3. Rota Pública para CRON

**Endpoint**: `/cron/metrics`

Uma rota pública configurada no `next.config.mjs` que redireciona para a API CRON, facilitando a configuração de serviços CRON externos.

### 4. Interface de Atualização Manual

Foi adicionado um botão de atualização manual no componente `LeadsDashboard` que permite aos usuários:
1. Atualizar as métricas sob demanda
2. Ver feedback visual durante a atualização
3. Receber notificações de sucesso ou erro

## Configuração

### Variáveis de Ambiente Necessárias

```
NEXT_PUBLIC_N8N_API_URL=https://seu-servidor-n8n/api/v1
NEXT_PUBLIC_N8N_API_KEY=sua-chave-api-n8n
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-servico-supabase
CRON_SECRET=um-segredo-para-proteger-a-api-cron
```

### Configurando um CRON Externo

Para configurar a atualização automática diária, você pode usar serviços como:

1. **cron-job.org**:
   - URL: `https://seu-site.com/cron/metrics`
   - Método: GET
   - Cabeçalhos: `Authorization: Bearer seu-cron-secret` (se configurado)
   - Frequência: Diária (recomendado às 00:05)

2. **GitHub Actions**:
   Crie um workflow em `.github/workflows/update-metrics.yml`:

   ```yaml
   name: Update Lead Metrics
   on:
     schedule:
       - cron: '5 0 * * *'  # 00:05 UTC todos os dias
   
   jobs:
     update-metrics:
       runs-on: ubuntu-latest
       steps:
         - name: Call metrics update API
           run: |
             curl -X GET "https://seu-site.com/cron/metrics" \
                  -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```

## Estrutura da Tabela lead_metrics

A tabela `lead_metrics` no Supabase tem a seguinte estrutura:

```sql
CREATE TABLE lead_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_leads INTEGER NOT NULL DEFAULT 0,
    qualified_leads INTEGER NOT NULL DEFAULT 0,
    unqualified_leads INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Funcionamento da Análise de Métricas

1. **Identificação de Leads**: Cada item de dados de saída nos nós do workflow é considerado um lead potencial.

2. **Qualificação de Leads**: A análise busca por palavras-chave ou propriedades específicas que indiquem o status:
   - Qualificados: "qualified", "qualificado", "aprovado", "accepted"
   - Desqualificados: "unqualified", "desqualificado", "rejeitado", "rejected"

3. **Taxa de Conversão**: Calculada como `(qualified_leads / total_leads) * 100`

## Customização

Para personalizar a lógica de detecção, modifique a função `analyzeExecution()` em `app/api/metrics/lead-metrics/route.ts`:

```typescript
// Exemplo de personalização
if (
  // Adicione suas próprias condições customizadas aqui
  jsonStr.includes('interessado') || 
  item.json.status === 'interested'
) {
  qualifiedLeads++;
}
```

## Troubleshooting

Se você encontrar problemas:

1. **Métricas não estão sendo extraídas**:
   - Verifique se os workflows têm a tag "agent" corretamente configurada
   - Verifique as credenciais da API do N8N
   - Verifique os logs do servidor para erros específicos

2. **Dados não aparecem no dashboard**:
   - Verifique as permissões da tabela `lead_metrics` no Supabase
   - Verifique se a API está retornando dados com sucesso
   - Use o botão de atualização manual para forçar uma atualização

3. **Falhas no CRON automático**:
   - Verifique o segredo de CRON se configurado
   - Verifique se o endpoint CRON está acessível publicamente
   - Verifique os registros do serviço de CRON para erros de rede 