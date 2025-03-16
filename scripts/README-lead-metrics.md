# Guia de Implementação: Métricas de Leads do N8N

Este guia explica como implementar e testar a extração de métricas de leads dos workflows do N8N para exibição na página `/metricas` do SiaFlow.

## Visão Geral da Solução

A solução consiste em três componentes:

1. **API REST em Next.js**: Endpoint para receber e armazenar métricas de leads no Supabase
2. **Script N8N**: Código para contar leads e enviar para a API
3. **Interface Web**: Página `/metricas` para visualizar as métricas

## 1. API de Métricas de Leads

A API está implementada em `app/api/metrics/lead-metrics/route.ts` e oferece dois endpoints:

- **GET /api/metrics/lead-metrics**: Retorna dados de métricas do Supabase
- **POST /api/metrics/lead-metrics**: Webhook para receber métricas enviadas pelo N8N

### Estrutura de Dados

A tabela `lead_metrics` no Supabase armazena:

- `date`: Data das métricas (YYYY-MM-DD)
- `total_leads`: Total de leads capturados
- `qualified_leads`: Leads qualificados
- `unqualified_leads`: Leads desqualificados
- `conversion_rate`: Taxa de conversão (%)
- `workflow_id`: ID do workflow que gerou as métricas
- `workflow_name`: Nome do workflow

## 2. Implementação no N8N

Para implementar a extração de métricas reais do N8N usando a estratégia de rastreamento de leads por remotejid, siga as instruções abaixo:

### Método 1: Usando o Nó Function para Extração de Dados Reais (Recomendado)

Este método rastreia leads em tempo real pelos seus identificadores únicos (remotejid ou telefone):

1. Abra o N8N e acesse o workflow com tag "main agent" (ou o workflow principal de processamento de leads)
2. Adicione um nó "Function"
3. Cole o conteúdo do arquivo `scripts/n8n-lead-metrics-webhook.js`
4. Conecte a saída a um nó "HTTP Request"
5. Configure o nó HTTP Request:
   - Método: POST
   - URL: `https://seu-dominio.com/api/metrics/lead-metrics`
   - Headers: `Content-Type: application/json`
   - Body: Use o campo `json` da saída do nó Function
6. Programe o workflow para executar diariamente usando um nó "Cron" ou adicione o nó Function a um fluxo existente para contagem em tempo real

### Como o Script Rastreia Leads

O script implementa uma estratégia robusta para extrair métricas reais:

1. **Identifica nós específicos**: Procura nós com nomes como "Webhook" para leads capturados, "criar_agendamento" para leads qualificados e "cancelarFUP" para leads desqualificados.
2. **Extrai remotejid**: Busca identificadores únicos nos dados dos nós, como números de telefone ou remotejid do WhatsApp.
3. **Elimina duplicação**: Usa Sets para garantir que cada lead seja contado apenas uma vez.
4. **Rastreia conversão**: Identifica quando um mesmo lead passa de capturado para qualificado ou desqualificado.
5. **Calcula métricas**: Determina o total de leads, quantos foram qualificados, desqualificados, e a taxa de conversão.

### Método 2: Usando o Webhook Diretamente

Para workflows que já contam leads de alguma forma, você pode simplesmente adicionar um nó HTTP Request para enviar os dados para a API:

1. No seu workflow que processa leads, adicione um nó "HTTP Request"
2. Configure-o como acima, mas defina manualmente o corpo JSON:

```json
{
  "total_leads": 123,
  "qualified_leads": 89,
  "unqualified_leads": 34,
  "workflow_id": "seu-workflow-id",
  "workflow_name": "Nome do seu Workflow"
}
```

## 3. Testando a Solução

### Testando a API

#### API GET (Para visualização)

```bash
curl -X GET http://localhost:3000/api/metrics/lead-metrics
```

Resultado esperado:
```json
{
  "success": true,
  "metrics": {
    "date": "2025-03-08",
    "total_leads": 175,
    "qualified_leads": 110,
    "unqualified_leads": 65,
    "conversion_rate": 62.86
  },
  "message": "Métricas de leads obtidas com sucesso do Supabase"
}
```

#### API POST (Webhook)

```bash
curl -X POST http://localhost:3000/api/metrics/lead-metrics \
  -H "Content-Type: application/json" \
  -d '{"total_leads": 175, "qualified_leads": 110, "unqualified_leads": 65, "workflow_id": "test_workflow", "workflow_name": "Test Workflow"}'
```

Resultado esperado:
```json
{
  "success": true,
  "metrics": {
    "date": "2025-03-08",
    "total_leads": 175,
    "qualified_leads": 110,
    "unqualified_leads": 65,
    "conversion_rate": 62.86
  },
  "message": "Métricas de leads recebidas via webhook e salvas no Supabase"
}
```

### Testando com o Script de Diagnóstico

Para diagnosticar problemas de conexão com o N8N e verificar a estrutura das execuções, use o script:

```bash
node scripts/test-n8n-connection.js
```

## 4. Solução de Problemas

### Problemas na API

Se a API retornar erros:

1. Verifique se o servidor Next.js está rodando
2. Confirme as variáveis de ambiente estão configuradas:
   - `NEXT_PUBLIC_N8N_API_URL`
   - `NEXT_PUBLIC_N8N_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Verifique os logs do servidor para erros específicos

### Problemas no N8N

Se o script do N8N não estiver contando leads corretamente:

1. Verifique se os nomes dos nós em seu workflow correspondem aos padrões procurados pelo script:
   - Para leads capturados: nós que contenham "webhook" ou "data api" no nome
   - Para leads qualificados: nós que contenham "criar_agendamento" ou "agendarfup" no nome
   - Para leads desqualificados: nós que contenham "cancelarfup" ou "desqualificado" no nome
2. Verifique se o formato dos dados tem o campo remotejid ou telefone para identificação dos leads
3. Adicione logs ao script para depurar o processamento dos leads
4. Certifique-se de que o nó HTTP Request está configurado corretamente

## 5. Personalização

### Ajustando a Lógica de Contagem

Você pode personalizar o script `n8n-lead-metrics-webhook.js` para se adaptar à sua estrutura específica:

1. **Ajustar nomes dos nós**: Modifique as condições que identificam nós de webhook, qualificação e desqualificação
2. **Personalizar extração de remotejid**: Adicione lógica para extrair identificadores no formato específico do seu workflow
3. **Adicionar regras de negócio**: Implemente regras personalizadas para classificar leads como qualificados/desqualificados

Por exemplo, para ajustar quais nós são considerados para leads qualificados:

```javascript
const isQualifiedNode = 
  nodeName.toLowerCase().includes('qualificado') || 
  nodeName.toLowerCase().includes('approved') ||
  // Adicione suas condições personalizadas aqui
  nodeName.toLowerCase().includes('seu_no_personalizado');
```

### Integrando com Outras Fontes de Dados

A API também suporta receber dados de outras fontes além do N8N:

1. Sistemas de CRM ou marketing que possam enviar dados via webhook
2. Scripts externos que processem dados de múltiplas fontes
3. Ferramentas de automação que possam fazer requisições HTTP

## 6. Casos de Uso Avançados

### 1. Métricas por Funil de Vendas

Você pode estender a solução para rastrear métricas por etapa do funil:

```javascript
// No script N8N, adicione contadores para cada etapa
const leadsByStage = {
  awareness: new Set(),
  consideration: new Set(),
  decision: new Set()
};

// Adicione à API e ao Supabase campos adicionais
// para armazenar estas métricas
```

### 2. Insights de Conversão por Campanha

Para rastrear eficácia de diferentes campanhas:

```javascript
// Extrair origem da campanha
const campaign = item.json?.campaign || 'unknown';
campaignLeads.set(campaign, (campaignLeads.get(campaign) || 0) + 1);
```

### 3. Alertas para Quedas de Conversão

Implemente lógica para alertar sobre quedas significativas na taxa de conversão:

```javascript
// Comparar com métricas anteriores
if (conversionRate < previousConversionRate * 0.8) {
  // Enviar alerta via webhook ou email
}
```

## 7. Exemplo de Fluxo Completo com Dados Reais

1. O N8N executa o script de extração de métricas diariamente
2. O script identifica leads únicos por remotejid/telefone
3. Leads são classificados como capturados, qualificados ou desqualificados
4. O webhook envia as métricas para a API
5. A API armazena os dados no Supabase
6. A página `/metricas` exibe os dados reais para os usuários

---

Para qualquer dúvida adicional, consulte a documentação do N8N sobre [Function Nodes](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.function/) e [HTTP Request Nodes](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/). 