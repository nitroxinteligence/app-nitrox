# Correção da Tabela openai_completions_usage no Supabase

Este documento contém instruções para resolver os seguintes erros:

```
ERROR: 42703: column "efficiency" of relation "openai_completions_usage" does not exist
```

```
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## Os Problemas

1. A tabela `openai_completions_usage` no Supabase não possui a coluna `efficiency`, que é necessária para armazenar a relação entre tokens de saída e entrada.

2. A tabela também não possui a restrição UNIQUE nas colunas `date` e `model`, necessária para a operação de upsert funcionar corretamente.

## Opções de Solução

Existem três maneiras de resolver estes problemas:

### Opção 1: Script de Correção Automática (Recomendado)

1. Configure as variáveis de ambiente necessárias:
   ```
   export NEXT_PUBLIC_SUPABASE_URL="https://dkvqjisxtdlrdgseiooq.supabase.co"
   export SUPABASE_SERVICE_KEY="sua-chave-de-servico-aqui"
   ```

2. Execute o script de correção:
   ```
   npm run fix-efficiency
   ```

3. Reinicie a aplicação para que o Supabase atualize seu cache de esquema.

### Opção 2: Script Manual

1. Edite o arquivo `scripts/manual-fix-efficiency.js` e configure:
   - `SUPABASE_URL` (já preenchido com o valor correto)
   - `SUPABASE_SERVICE_KEY` (adicione sua chave de serviço)

2. Execute o script:
   ```
   node scripts/manual-fix-efficiency.js
   ```

3. Reinicie a aplicação para que o Supabase atualize seu cache de esquema.

### Opção 3: SQL Direto (Se os scripts não funcionarem)

1. Acesse o console do Supabase: https://app.supabase.com/
2. Navegue até o projeto e acesse o SQL Editor
3. Execute os seguintes comandos SQL:

```sql
-- 1. Adicionar a coluna efficiency se não existir
ALTER TABLE openai_completions_usage 
ADD COLUMN IF NOT EXISTS efficiency INTEGER;

-- 2. Adicionar a restrição UNIQUE nas colunas date e model
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'openai_completions_usage_date_model_key' 
        AND conrelid = 'openai_completions_usage'::regclass
    ) THEN
        ALTER TABLE openai_completions_usage 
        ADD CONSTRAINT openai_completions_usage_date_model_key UNIQUE (date, model);
    END IF;
END $$;

-- 3. Atualizar valores existentes
UPDATE openai_completions_usage 
SET efficiency = 
  CASE 
    WHEN input_tokens > 0 THEN 
      ROUND((output_tokens::NUMERIC / input_tokens::NUMERIC) * 100)::INTEGER
    ELSE 0
  END;

-- 4. Criar ou substituir a função de cálculo de eficiência
CREATE OR REPLACE FUNCTION calculate_efficiency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.input_tokens > 0 THEN
    NEW.efficiency := ROUND((NEW.output_tokens::NUMERIC / NEW.input_tokens::NUMERIC) * 100)::INTEGER;
  ELSE
    NEW.efficiency := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para atualização automática da eficiência
DROP TRIGGER IF EXISTS trigger_calculate_efficiency ON openai_completions_usage;
CREATE TRIGGER trigger_calculate_efficiency
BEFORE INSERT OR UPDATE OF input_tokens, output_tokens
ON openai_completions_usage
FOR EACH ROW
EXECUTE FUNCTION calculate_efficiency();
```

## Verificação

Para verificar se a correção foi aplicada com sucesso:

1. Acesse a página de monitoramento no aplicativo
2. Clique em "Sincronizar Completions"
3. Verificar se os dados são exibidos corretamente, incluindo a eficiência

## Adaptações no Código

O código da aplicação foi adaptado para lidar com os problemas detectados:

1. A função `saveCompletionsDataToSupabase` foi modificada para verificar a existência da coluna `efficiency` e adaptará dinamicamente a inserção de dados.
2. A função `processCompletionsData` sempre calculará a eficiência no código, independentemente de estar armazenada no banco.

Isso garante que a aplicação funcione mesmo se a estrutura da tabela não estiver completa, enquanto as correções são aplicadas.

## Suporte Adicional

Se você continuar enfrentando problemas, verifique os logs do servidor para obter informações detalhadas sobre o erro. Os logs podem ajudar a identificar se existem outros problemas estruturais no banco de dados. 