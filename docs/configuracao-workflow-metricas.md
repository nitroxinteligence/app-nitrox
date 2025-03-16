# Configuração do Workflow de Métricas de Leads no N8N

Este documento contém instruções detalhadas para configurar o workflow de extração de métricas de leads no N8N.

## Pré-requisitos

1. Acesso ao painel administrativo do N8N
2. Permissões para criar e editar workflows
3. URL da API do SiaFlow configurada

## Importando o Workflow

1. Faça login no painel administrativo do N8N
2. Clique em "Workflows" no menu lateral
3. Clique no botão "Import from File" ou "Import from URL"
4. Selecione o arquivo `lead-metrics-workflow.json` fornecido ou cole o conteúdo do arquivo
5. Clique em "Import"

## Configurando o Workflow

Após importar o workflow, você precisará configurar alguns parâmetros:

### 1. Configurar o nó "Set Environment"

1. Clique no nó "Set Environment"
2. Edite o código JavaScript para definir:
   - `domain`: O domínio da sua aplicação SiaFlow (ex: `siaflow.com.br`)
   - `apiKey`: A chave de API para autenticação (se necessário)

```javascript
// Definir variáveis de ambiente
return {
  json: {
    domain: 'seu-dominio.com', // Substitua pelo seu domínio
    apiKey: 'sua-api-key' // Substitua pela sua API key
  }
};
```

### 2. Configurar o nó "Schedule Trigger"

1. Clique no nó "Schedule Trigger"
2. Configure a frequência de execução do workflow:
   - Padrão: A cada 1 hora
   - Recomendado para produção: A cada 24 horas (definir para executar em um horário de baixo tráfego, como 02:00)

### 3. Configurar o nó "Send to API"

1. Clique no nó "Send to API"
2. Verifique se a URL está correta: `https://{{$node["Set Environment"].json["domain"]}}/api/metrics/lead-metrics`
3. Configure a autenticação HTTP Header:
   - Nome: `Authorization`
   - Valor: `Bearer {{$node["Set Environment"].json["apiKey"]}}`

## Personalizando a Extração de Métricas

Para personalizar a extração de métricas, você pode modificar o nó "Generate Metrics":

1. Clique no nó "Generate Metrics"
2. Edite o código JavaScript para:
   - Conectar a fontes de dados reais (CRM, banco de dados, etc.)
   - Ajustar a lógica de qualificação de leads
   - Adicionar tags ou metadados adicionais

## Exemplo de Integração com CRM

Para integrar com um CRM ou outra fonte de dados, substitua o código do nó "Generate Metrics" por algo como:

```javascript
// Código para extrair métricas de leads de um CRM
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

// Formatar datas para YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Buscar leads do CRM (substitua por sua lógica de integração)
const crmLeads = await $items[0].json.leads || [];

// Processar leads
const totalLeads = crmLeads.length;
const qualifiedLeads = crmLeads.filter(lead => lead.status === 'qualified').length;
const unqualifiedLeads = crmLeads.filter(lead => lead.status === 'unqualified').length;

// Criar objeto de métricas
const metrics = {
  date: formatDate(today),
  total_leads: totalLeads,
  qualified_leads: qualifiedLeads,
  unqualified_leads: unqualifiedLeads,
  workflow_id: 'crm-integration-workflow',
  workflow_name: 'CRM Integration Workflow',
  tags: ['main agent', 'crm', 'lead generation'],
  source: 'crm',
  campaign: 'all'
};

// Calcular taxa de conversão
metrics.conversion_rate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

// Retornar métricas para o próximo nó
return {
  json: {
    metrics: [metrics]
  }
};
```

## Testando o Workflow

1. Clique no botão "Execute Workflow" para testar a execução
2. Verifique os resultados de cada nó para garantir que estão funcionando corretamente
3. Verifique se as métricas foram enviadas com sucesso para a API

## Ativando o Workflow

1. Após testar e confirmar que tudo está funcionando corretamente, ative o workflow clicando no botão "Active" no canto superior direito
2. O workflow agora será executado automaticamente conforme a programação definida

## Solução de Problemas

Se o workflow não estiver funcionando corretamente, verifique:

1. **Logs de Execução**: Verifique os logs de execução do workflow para identificar erros
2. **Configuração de URL**: Certifique-se de que o domínio está configurado corretamente
3. **Autenticação**: Verifique se a chave de API está correta
4. **Formato de Dados**: Certifique-se de que o formato dos dados enviados corresponde ao esperado pela API

## Monitoramento

Recomendamos monitorar regularmente:

1. **Execuções do Workflow**: Verifique se o workflow está sendo executado conforme programado
2. **Qualidade dos Dados**: Verifique se as métricas estão sendo calculadas corretamente
3. **Desempenho da API**: Monitore o tempo de resposta da API ao receber as métricas

## Suporte

Para obter suporte adicional, entre em contato com a equipe de suporte do SiaFlow. 