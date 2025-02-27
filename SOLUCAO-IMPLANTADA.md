# Solução de Sincronização Automática N8N → Supabase

## O problema resolvido

Workflows no N8N com a tag 'agent' não estavam enviando dados de execução para a tabela `openai_usage` do Supabase, impedindo o monitoramento adequado das métricas de uso.

## A solução implementada

Criamos um sistema de sincronização automática que não requer modificações nos workflows do N8N. O sistema:

1. **Busca workflows com tag 'agent' pela API do N8N**
2. **Extrai execuções recentes desses workflows**
3. **Processa os dados para identificar chamadas à OpenAI**
4. **Salva os dados na tabela `openai_usage` do Supabase**
5. **Executa automaticamente a cada 2 horas**

## Componentes da solução

- **API de sincronização**: `/api/cron/sync-n8n` - Endpoint protegido que realiza a sincronização
- **Configuração CRON**: `vercel.json` - Configura execuções automáticas a cada 2 horas
- **Script de carga histórica**: `scripts/carga-historica.ts` - Para importar dados mais antigos
- **API de diagnóstico**: `/api/teste-sincronizacao` - Para verificar a configuração

## Como usar

### Sincronização automática 

A sincronização automática já está configurada para executar a cada 2 horas através do arquivo `vercel.json` (em ambientes Vercel) ou pelo script `instalar-cron-sync.sh` (em ambientes locais).

### Sincronização manual

Para acionar a sincronização manualmente, use um dos métodos:

1. **Pela interface de monitoramento**:
   - Acesse a página `/monitoramento`
   - Clique no botão "Sincronizar Agentes"

2. **Pela linha de comando**:
   ```bash
   curl "https://seu-site.com/api/cron/sync-n8n?token=sync-n8n-cron-secret"
   ```

### Carga histórica (dados anteriores)

Para importar dados históricos mais antigos:

```bash
# Instalar dependências necessárias
npm install dotenv

# Executar script (busca dados dos últimos 30 dias)
npx ts-node scripts/carga-historica.ts

# Para especificar período maior (ex: 90 dias)
npx ts-node scripts/carga-historica.ts --dias=90
```

## Diagnóstico e solução de problemas

### Verificar configuração

Para verificar se o sistema está corretamente configurado:

1. Acesse `/api/teste-sincronizacao` em seu navegador
2. Verifique se os workflows com tag 'agent' são detectados corretamente
3. Confirme que as execuções estão sendo encontradas

### Logs

Os logs da sincronização podem ser encontrados:

- **Em produção**: No painel do Vercel em "Functions" > "Logs"
- **Localmente**: No terminal onde o servidor está rodando

### Dados não aparecem

Se os dados não aparecerem na página de monitoramento:

1. Verifique se os workflows realmente têm a tag 'agent'
2. Confirme que as execuções contêm chamadas à OpenAI
3. Verifique a conexão com o Supabase

## Próximos passos recomendados

1. **Segurança**: Defina um valor personalizado para `CRON_SECRET` nas variáveis de ambiente
2. **Monitoramento**: Configure alertas para falhas na sincronização
3. **Otimização**: Ajuste o período de busca (`lookbackDays`) conforme necessário 