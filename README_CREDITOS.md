# Resolução de Problemas com a Página de Créditos

## Problemas Identificados

Durante a análise da página de créditos (`/creditos`), foram identificados os seguintes problemas:

1. **Variáveis de ambiente incorretas**: O N8N estava tentando usar variáveis de ambiente (`SUPABASE_URL` e `SUPABASE_SERVICE_KEY`) que não estavam definidas corretamente.

2. **Uso da chave anônima em vez da chave de serviço**: O código estava usando a chave anônima do Supabase para inserir registros, o que não tinha permissão devido às políticas RLS.

3. **Inconsistência no nome da coluna**: Havia uma discrepância no nome da coluna `model` (minúscula no código, mas `Model` com M maiúsculo no banco de dados).

4. **Falta de configuração apropriada no N8N**: O workflow do N8N não estava configurado com as variáveis de ambiente necessárias.

## Soluções Implementadas

### 1. Criação de Arquivo `.env.n8n`

Criamos um arquivo `.env.n8n` que define todas as variáveis de ambiente necessárias para o N8N:

```
# Supabase Configuration
SUPABASE_URL=https://sua-instancia.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-de-servico-aqui

# N8N API
N8N_API_URL=https://seu-n8n-server.com/api/v1
N8N_API_KEY=sua-chave-api-n8n

# OpenAI
OPENAI_API_KEY=sua-chave-openai

# Service Hook
SERVICE_BASE_URL=https://seu-servico.com
WEBHOOK_SECRET=seu-segredo-webhook
```

### 2. Correção do Serviço N8N

Atualizamos o arquivo `lib/n8n-service.ts` para usar o nome correto da coluna:

```typescript
// Antes
record.model = cost.model;

// Depois
record.Model = cost.model;
```

### 3. Correção da Rota de Sincronização com N8N

Atualizamos o arquivo `app/api/n8n/sync-usage/route.ts` para:

1. Usar a chave de serviço em vez da chave anônima
2. Melhorar o tratamento de erros
3. Testar a conexão com o Supabase antes de tentar salvar dados

```typescript
// Prioriza a SUPABASE_SERVICE_KEY sobre a NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

### 4. Criação de Script para Configuração do N8N

Criamos um script `setup-n8n-env.sh` para configurar automaticamente as variáveis de ambiente no servidor N8N:

```bash
#!/bin/bash
# Script para configurar as variáveis de ambiente no servidor N8N
# Carrega as variáveis do arquivo .env.n8n e as configura via API
```

### 5. Atualização do Arquivo .env.local

Atualizamos o arquivo `.env.local` para incluir a `SUPABASE_SERVICE_KEY`, necessária para as operações de escrita no Supabase:

```
# Adicionado:
SUPABASE_SERVICE_KEY=sua-chave-de-servico-aqui
```

## Como Verificar a Solução

1. **Teste a conexão com o Supabase**:
   ```bash
   curl -X POST http://localhost:3000/api/n8n/sync-usage
   ```

2. **Verifique os logs no console** durante a execução do endpoint para assegurar que:
   - A conexão com o Supabase está sendo estabelecida
   - A extração de dados está funcionando
   - Os dados estão sendo inseridos sem erros

3. **Verifique no Supabase** se os dados estão aparecendo na tabela `openai_usage`.

4. **Navegue até a página `/creditos`** e verifique se os dados estão sendo exibidos corretamente.

## Fluxo de Dados Correto

Com as correções implementadas, o fluxo de dados deve funcionar assim:

1. O N8N coleta dados de uso da OpenAI periodicamente
2. Esses dados são enviados para o Supabase usando a chave de serviço
3. A função de agregação atualiza as tabelas de resumo
4. A página de créditos exibe os dados das tabelas de resumo

Para instruções detalhadas sobre a configuração completa do sistema, consulte o arquivo `SETUP_INSTRUCTIONS.md`. 