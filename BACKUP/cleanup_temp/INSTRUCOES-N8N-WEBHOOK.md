# Configuração do Webhook no N8N para Sincronização Automática

Para garantir que os dados de execução dos workflows com tag 'agent' sejam enviados automaticamente para o Supabase, você precisa configurar um webhook no N8N. Siga as instruções abaixo:

## Opção 1: Webhook via Node no Workflow

1. Abra o N8N em seu navegador
2. Para cada workflow com tag 'agent', adicione um nó **HTTP Request** no final do fluxo
3. Configure o nó da seguinte forma:
   - **Method**: POST
   - **URL**: `https://seu-site.com/api/webhooks/n8n-executions`
   - **Headers**:
     - `Content-Type`: `application/json`
     - `x-webhook-secret`: `SEU_WEBHOOK_SECRET` (mesmo valor da variável de ambiente WEBHOOK_SECRET)
   - **Body**: Selecione JSON e use o seguinte conteúdo:
     ```json
     {
       "workflowId": "{{$workflow.id}}",
       "executionId": "{{$execution.id}}",
       "workflowName": "{{$workflow.name}}",
       "timestamp": "{{$now.toISOString()}}"
     }
     ```

## Opção 2: Webhook Global via Recursos de Sistema do N8N

Se você tiver acesso ao servidor N8N, uma opção mais eficiente é configurar um webhook global:

1. Edite o arquivo `.env` ou as configurações do seu N8N
2. Adicione a seguinte configuração:
   ```
   N8N_WORKFLOW_EXECUTION_SUCCESS_WEBHOOK=https://seu-site.com/api/webhooks/n8n-executions
   N8N_WORKFLOW_WEBHOOK_HEADERS={"Content-Type":"application/json","x-webhook-secret":"SEU_WEBHOOK_SECRET"}
   ```
3. Reinicie o servidor N8N

## Testando a Configuração

Para verificar se a configuração está funcionando corretamente:

1. Execute manualmente um workflow com tag 'agent'
2. Acesse a página `/monitoramento` na sua aplicação
3. Verifique nos logs do servidor se o webhook foi recebido
4. Confirme que os dados foram sincronizados no dashboard de monitoramento

## Sincronização Manual

Caso precise sincronizar manualmente os dados históricos:

1. Acesse a página `/monitoramento`  
2. Clique no botão "Sincronizar Agentes"
3. Os dados serão processados e exibidos no dashboard 