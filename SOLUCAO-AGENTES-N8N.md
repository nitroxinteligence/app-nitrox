# Solução para Sincronização de Dados de Agentes N8N

Este documento descreve a solução implementada para resolver o problema de sincronização de dados entre workflows do N8N marcados com a tag 'agent' e o Supabase, garantindo que informações como tokens, custos, requisições e execuções sejam adequadamente enviadas e exibidas na página `/monitoramento`.

## Problema Resolvido

Os workflows do N8N marcados com a tag 'agent' não estavam enviando dados para o Supabase, impossibilitando a visualização de métricas importantes na página de monitoramento.

## Componentes da Solução

A solução consiste em vários componentes que trabalham em conjunto:

### 1. Edge Function no Supabase (`agent-sync`)

Uma edge function que:

- Busca workflows marcados com a tag 'agent' no N8N
- Extrai dados de uso da OpenAI das execuções recentes
- Calcula custos com base nos modelos e tokens utilizados
- Normaliza nomes de modelos para um formato padronizado
- Formata e salva os dados na tabela `openai_usage` do Supabase
- Atualiza agregações para visualização rápida no dashboard

### 2. API no Next.js (`/api/agent/sync`)

Um endpoint que:

- Serve como ponte entre a aplicação e a Edge Function
- Valida parâmetros e configurações antes de chamar a Edge Function
- Gerencia erros e retorna respostas formatadas

### 3. Webhook para Execuções (`/api/webhooks/agent-execution`)

Um webhook que:

- Recebe notificações do N8N quando um workflow é executado
- Inicia a sincronização em background para manter dados atualizados
- Responde rapidamente para não bloquear o N8N

### 4. Integração na UI de Monitoramento

Melhorias na interface de usuário:

- Botão de sincronização proeminente para atualização manual
- Indicadores visuais do status da sincronização
- Exibição de resultados da sincronização

## Fluxo de Dados

1. **Captura de Dados:**
   - Dados são gerados quando workflows N8N com tag 'agent' são executados
   - O código extrai informações de uso da OpenAI dessas execuções

2. **Processamento:**
   - Os dados são normalizados e formatados
   - Custos são calculados com base em tabelas de preços atualizadas
   - São gerados IDs únicos para cada registro

3. **Armazenamento:**
   - Os dados processados são enviados para a tabela `openai_usage` do Supabase
   - São usadas operações de upsert para evitar duplicações

4. **Agregação:**
   - Funções RPC do Supabase atualizam tabelas agregadas
   - Essas agregações facilitam consultas rápidas no dashboard

5. **Visualização:**
   - Os dados são exibidos na página `/monitoramento`
   - Gráficos e tabelas mostram custos, uso de tokens e execuções por agente

## Como Usar

### Sincronização Manual

Para sincronizar manualmente os dados:

1. Acesse a página de monitoramento (`/monitoramento`)
2. Clique no botão "Sincronizar Agentes"
3. Aguarde a conclusão da sincronização
4. Os dados atualizados serão exibidos automaticamente

### Sincronização Automática

Para configurar a sincronização automática:

1. Configure um webhook no N8N para chamar `/api/webhooks/agent-execution` após cada execução de workflow com tag 'agent'
2. Adicione o header `x-webhook-secret` com o valor da variável de ambiente `WEBHOOK_SECRET`

### Implantação da Edge Function

Para implantar a Edge Function no Supabase:

1. Certifique-se de que o Docker Desktop está em execução
2. Execute o comando: `supabase functions deploy agent-sync`
3. Configure as variáveis de ambiente necessárias no Dashboard do Supabase

## Benefícios

- **Sincronização em Tempo Real:** Dados atualizados logo após a execução dos agentes
- **Monitoramento Eficiente:** Visualização centralizada de custos e uso de recursos
- **Processamento Otimizado:** Uso de Edge Functions para processamento próximo aos dados
- **Manutenção Simples:** Não requer alterações nos workflows existentes
- **Segurança:** Autenticação embutida para proteger dados sensíveis

## Resolução de Problemas

Se os dados não aparecerem no dashboard:

1. Verifique se os workflows têm a tag 'agent' configurada corretamente
2. Tente uma sincronização manual pela página de monitoramento
3. Verifique os logs da Edge Function no Dashboard do Supabase
4. Confirme que as variáveis de ambiente estão configuradas corretamente 