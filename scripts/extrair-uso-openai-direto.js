/**
 * Script para extrair dados de uso do OpenAI e enviar para webhook
 * 
 * Este script deve ser colocado em um nó Function do N8N, logo após um nó OpenAI.
 * Ele extrai informações de uso (modelo, tokens) da resposta do OpenAI e envia para um webhook.
 * 
 * Instruções:
 * 1. Adicione este nó Function após cada nó OpenAI em seus workflows
 * 2. Configure a URL do webhook e o segredo de autenticação abaixo
 * 3. Certifique-se de que o webhook esteja configurado para receber e processar os dados
 */

// Configurações - Ajuste conforme necessário
const CONFIG = {
  // URL do webhook para enviar os dados
  WEBHOOK_URL: 'http://localhost:3000/api/webhooks/n8n-openai',
  
  // Segredo para autenticação no webhook (deve corresponder ao configurado no webhook)
  WEBHOOK_SECRET: '{{$env.WEBHOOK_SECRET}}' || 'seu-segredo-aqui',
  
  // Ativar logs de depuração
  DEBUG: true,
  
  // Estimar tokens quando não for possível extrair diretamente
  ESTIMATE_TOKENS: true,
  
  // Fator de estimativa de tokens (caracteres por token)
  CHARS_PER_TOKEN: 4
};

/**
 * Função principal que extrai dados de uso do OpenAI e envia para o webhook
 */
async function extractAndSendOpenAIUsage(items, runIndex) {
  // Obter informações do workflow e execução
  const workflowId = $workflow.id;
  const workflowName = $workflow.name;
  const executionId = $execution.id;
  
  if (CONFIG.DEBUG) {
    console.log(`[OpenAI Extractor] Processando execução ${executionId} do workflow ${workflowName} (${workflowId})`);
    console.log(`[OpenAI Extractor] Número de itens: ${items.length}`);
  }
  
  // Array para armazenar os dados de uso extraídos
  const usageData = [];
  
  // Processar cada item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      // Obter informações do nó anterior (OpenAI)
      const previousNodeName = Object.keys(item.json.$node)[0];
      const previousNodeId = item.json.$node[previousNodeName];
      
      if (CONFIG.DEBUG) {
        console.log(`[OpenAI Extractor] Processando item ${i+1}, nó anterior: ${previousNodeName} (${previousNodeId})`);
      }
      
      // Extrair dados de uso do OpenAI
      const openAIUsage = extractOpenAIUsage(item.json);
      
      if (openAIUsage) {
        // Adicionar informações do workflow e execução
        const usageRecord = {
          workflow_id: workflowId,
          workflow_name: workflowName,
          execution_id: executionId,
          node_id: previousNodeId,
          node_name: previousNodeName,
          ...openAIUsage,
          timestamp: new Date().toISOString()
        };
        
        usageData.push(usageRecord);
        
        if (CONFIG.DEBUG) {
          console.log(`[OpenAI Extractor] Dados extraídos:`, usageRecord);
        }
      } else if (CONFIG.DEBUG) {
        console.log(`[OpenAI Extractor] Não foi possível extrair dados de uso do OpenAI para o item ${i+1}`);
      }
    } catch (error) {
      console.error(`[OpenAI Extractor] Erro ao processar item ${i+1}:`, error.message);
    }
  }
  
  // Enviar dados para o webhook se houver dados extraídos
  if (usageData.length > 0) {
    try {
      if (CONFIG.DEBUG) {
        console.log(`[OpenAI Extractor] Enviando ${usageData.length} registros para o webhook`);
      }
      
      // Enviar dados para o webhook
      const response = await $http.post(
        CONFIG.WEBHOOK_URL,
        usageData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': CONFIG.WEBHOOK_SECRET
          }
        }
      );
      
      if (CONFIG.DEBUG) {
        console.log(`[OpenAI Extractor] Resposta do webhook: ${response.statusCode}`);
        if (response.body) {
          console.log(`[OpenAI Extractor] Corpo da resposta:`, response.body);
        }
      }
    } catch (error) {
      console.error(`[OpenAI Extractor] Erro ao enviar dados para o webhook:`, error.message);
    }
  } else if (CONFIG.DEBUG) {
    console.log(`[OpenAI Extractor] Nenhum dado de uso do OpenAI para enviar`);
  }
  
  // Retornar os itens originais para não interromper o fluxo do workflow
  return items;
}

/**
 * Função para extrair dados de uso do OpenAI de um item
 */
function extractOpenAIUsage(data) {
  try {
    // Tentar extrair do formato padrão da API do OpenAI
    if (data.usage && data.model) {
      return {
        model: data.model,
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0
      };
    }
    
    // Tentar extrair do formato de chat completions
    if (data.choices && data.model && data.usage) {
      return {
        model: data.model,
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0
      };
    }
    
    // Tentar extrair do formato de embeddings
    if (data.model && data.usage && data.data) {
      return {
        model: data.model,
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: 0, // Embeddings não têm completion tokens
        total_tokens: data.usage.total_tokens || data.usage.prompt_tokens || 0
      };
    }
    
    // Tentar extrair do formato de resposta do nó OpenAI do N8N
    if (data.data && data.data.usage && data.data.model) {
      return {
        model: data.data.model,
        prompt_tokens: data.data.usage.prompt_tokens || 0,
        completion_tokens: data.data.usage.completion_tokens || 0,
        total_tokens: data.data.usage.total_tokens || 0
      };
    }
    
    // Tentar extrair de estruturas aninhadas
    for (const key in data) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        // Verificar se este objeto tem os campos necessários
        if (data[key].model && data[key].usage) {
          return {
            model: data[key].model,
            prompt_tokens: data[key].usage.prompt_tokens || 0,
            completion_tokens: data[key].usage.completion_tokens || 0,
            total_tokens: data[key].usage.total_tokens || 0
          };
        }
        
        // Recursivamente verificar objetos aninhados
        const nestedResult = extractOpenAIUsage(data[key]);
        if (nestedResult) {
          return nestedResult;
        }
      }
    }
    
    // Se não conseguiu extrair diretamente, tentar estimar com base no conteúdo
    if (CONFIG.ESTIMATE_TOKENS) {
      let model = '';
      let promptText = '';
      let completionText = '';
      
      // Tentar encontrar o modelo
      if (data.model) {
        model = data.model;
      } else if (data.data && data.data.model) {
        model = data.data.model;
      } else {
        // Tentar inferir o modelo com base em outros campos
        if (data.function_call || (data.choices && data.choices[0] && data.choices[0].function_call)) {
          model = 'gpt-4'; // Suposição para chamadas de função
        } else {
          model = 'gpt-3.5-turbo'; // Modelo padrão
        }
      }
      
      // Tentar encontrar o texto do prompt
      if (data.prompt) {
        promptText = data.prompt;
      } else if (data.messages) {
        promptText = data.messages.map(m => m.content || '').join(' ');
      } else if (data.input) {
        promptText = typeof data.input === 'string' ? data.input : JSON.stringify(data.input);
      }
      
      // Tentar encontrar o texto da resposta
      if (data.choices && data.choices[0]) {
        if (data.choices[0].text) {
          completionText = data.choices[0].text;
        } else if (data.choices[0].message && data.choices[0].message.content) {
          completionText = data.choices[0].message.content;
        }
      } else if (data.text) {
        completionText = data.text;
      } else if (data.content) {
        completionText = data.content;
      } else if (data.answer) {
        completionText = data.answer;
      }
      
      // Estimar tokens com base no comprimento do texto
      if (promptText || completionText) {
        const promptTokens = Math.ceil((promptText.length || 0) / CONFIG.CHARS_PER_TOKEN);
        const completionTokens = Math.ceil((completionText.length || 0) / CONFIG.CHARS_PER_TOKEN);
        const totalTokens = promptTokens + completionTokens;
        
        return {
          model: model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          is_estimated: true
        };
      }
    }
    
    // Não foi possível extrair ou estimar os dados de uso
    return null;
    
  } catch (error) {
    console.error(`[OpenAI Extractor] Erro ao extrair dados de uso:`, error.message);
    return null;
  }
}

// Executar a função principal
return extractAndSendOpenAIUsage($input.all(), $runIndex); 