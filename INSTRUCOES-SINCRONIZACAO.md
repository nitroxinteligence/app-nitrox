# Sincronização Automática N8N ↔ Supabase

Este documento explica a nova solução para sincronização de dados entre o N8N e o Supabase, especificamente para workflows com tag 'agent'.

## Visão Geral da Solução

A solução implementada elimina a necessidade de modificar os workflows no N8N e garante uma sincronização confiável através de:

1. **Sincronização programada via CRON**: Os dados são sincronizados automaticamente a cada 2 horas
2. **Busca direta na API do N8N**: Utilizamos a API do N8N para buscar workflows e suas execuções
3. **Extração e processamento inteligente**: Detectamos automaticamente chamadas à OpenAI e extraímos os dados de uso
4. **Salvamento otimizado no Supabase**: Os dados são salvos em lotes para melhor desempenho

## Como Funciona

A sincronização acontece através dos seguintes componentes:

1. **API de CRON** (`/api/cron/sync-n8n`): Endpoint protegido que aciona a sincronização
2. **Edge Function** (`agent-sync`): Função no Supabase que faz o trabalho pesado de extração e salvamento
3. **Botão de sincronização manual**: Na interface de monitoramento para uso administrativo

## Configuração

### Para Ambientes de Produção (Vercel)

O arquivo `vercel.json` já está configurado para executar a sincronização a cada 2 horas. Não é necessária nenhuma configuração adicional.

### Para Ambientes Locais ou Outros Servidores

Execute o script para instalar o CRON:

```bash
chmod +x scripts/instalar-cron-sync.sh
./scripts/instalar-cron-sync.sh
```

### Variáveis de Ambiente Necessárias

Certifique-se de que as seguintes variáveis estejam configuradas:

```
# N8N API
NEXT_PUBLIC_N8N_API_URL=https://seu-n8n.exemplo.com/api/v1
NEXT_PUBLIC_N8N_API_KEY=sua-chave-api-n8n

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=chave-servico-supabase

# Opcional - para personalizar o segredo do CRON
CRON_SECRET=sua-chave-secreta
```

## Monitoramento e Solução de Problemas

### Logs

Os logs da sincronização são salvos em:

- **Ambiente Vercel**: Acessíveis no painel do Vercel em "Functions" > "Logs"
- **Ambiente local**: Salvos em `./logs/cron-sync-[DATA].log`

### Verificando o Status

1. Acesse a página de monitoramento `/monitoramento`
2. Verifique a data da última sincronização bem-sucedida
3. Caso necessário, acione a sincronização manual pelo botão "Sincronizar Agentes"

### Problemas Comuns

1. **Dados não aparecem no dashboard**:
   - Verifique se os workflows têm a tag 'agent' configurada corretamente
   - Confirme que a API do N8N está acessível
   - Verifique os logs da sincronização

2. **Erro de autenticação**:
   - Confirme se a chave API do N8N está correta e não expirou
   - Verifique a chave de serviço do Supabase

3. **Problemas com a Edge Function**:
   - Confirme se a função está corretamente implantada no Supabase
   - Verifique as variáveis de ambiente no Supabase

## Customização

### Alterando a Frequência de Sincronização

- **No Vercel**: Edite o arquivo `vercel.json` e modifique o valor de `schedule`
- **Local**: Execute novamente o script de instalação após editar a frequência no arquivo

### Período de Busca de Dados

Por padrão, a sincronização busca execuções dos últimos 3 dias. Para modificar:

1. Edite o parâmetro `lookbackDays` no arquivo `supabase/functions/agent-sync/index.ts`
2. Reimplante a Edge Function 