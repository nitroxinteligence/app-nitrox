# Resumo de Alterações e Próximos Passos

## Problema Original
A página de créditos (`/creditos`) não estava exibindo dados de uso da OpenAI porque a sincronização entre o N8N e o Supabase não estava funcionando corretamente.

## Diagnóstico
Após análise detalhada, identificamos os seguintes problemas:

1. **Configuração de Variáveis de Ambiente**: O N8N esperava variáveis como `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` que não estavam definidas.

2. **Chave de Acesso Incorreta**: O código estava utilizando a chave anônima do Supabase, que não tem permissões para inserir dados devido às políticas RLS (Row Level Security).

3. **Inconsistência nos Nomes de Colunas**: Havia discrepância entre o nome da coluna no código (`model` em minúsculo) e no banco de dados (`Model` com M maiúsculo).

4. **Problemas de Referência à Tabela `auth.users`**: A tabela `openai_usage` tinha uma referência à tabela `auth.users` via chave estrangeira, mas isto causava problemas de permissão.

## Soluções Implementadas

### 1. Correções de Código
- **lib/n8n-service.ts**: Atualizado para usar `Model` (com M maiúsculo) em vez de `model` ao criar registros para o Supabase.
- **app/api/n8n/sync-usage/route.ts**: Modificado para usar a chave de serviço e melhorado o tratamento de erros.
- **hooks/useOpenAIUsage.ts**: Já estava usando corretamente `Model` com M maiúsculo e definindo `user_id: null`.

### 2. Configurações de Ambiente
- **`.env.local`**: Adicionado `SUPABASE_SERVICE_KEY` para permitir operações de escrita no Supabase.
- **`.env.n8n`**: Criado novo arquivo com todas as variáveis necessárias para o N8N.
- **`scripts/setup-n8n-env.sh`**: Script para configurar as variáveis de ambiente no servidor N8N.

### 3. Migrações do Banco de Dados
- Criadas migrações para remover a referência de chave estrangeira à tabela `auth.users`.
- Atualizadas as políticas RLS para permitir inserções anônimas e acesso via `service_role`.
- Corrigida a função de agregação para lidar com a coluna `Model` adequadamente.

### 4. Ferramentas de Diagnóstico
- **`scripts/test-openai-sync.sh`**: Script para verificar se todas as configurações estão corretas.

### 5. Documentação
- **`SETUP_INSTRUCTIONS.md`**: Guia detalhado de configuração do sistema.
- **`README_CREDITOS.md`**: Resumo dos problemas e soluções específicas para a página de créditos.

## Próximos Passos

1. **Execute o script de teste**:
   ```bash
   ./scripts/test-openai-sync.sh
   ```
   Isto verificará se todas as configurações necessárias estão presentes.

2. **Configure o N8N**:
   ```bash
   ./scripts/setup-n8n-env.sh
   ```
   Este script configurará as variáveis de ambiente no servidor N8N.

3. **Verifique o workflow no N8N**:
   - Acesse o painel do N8N
   - Certifique-se de que o workflow "OpenAI Usage Sync" está ativo
   - Execute manualmente o workflow para testar

4. **Teste a sincronização manual**:
   - Acesse a página `/creditos` na aplicação
   - Clique no botão "Sincronizar com N8N"
   - Verifique se os dados aparecem corretamente

5. **Monitore os logs para problemas**:
   - Logs do servidor Next.js
   - Logs de execução do workflow no N8N
   - Logs de erros no Supabase

## Considerações Finais

Todas as alterações foram feitas para preservar a estrutura existente do código, minimizando mudanças enquanto se corrigem os problemas de fundo. O sistema agora deve ser capaz de:

1. Coletar dados de uso da OpenAI via N8N
2. Armazenar esses dados no Supabase
3. Exibir os dados na página de créditos
4. Manter as estatísticas atualizadas

Se novos problemas surgirem, verifique primeiro os logs do servidor e do N8N para identificar a causa raiz antes de fazer alterações adicionais. 