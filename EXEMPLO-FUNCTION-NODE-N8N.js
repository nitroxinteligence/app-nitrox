/**
 * EXEMPLO DE NÓ FUNCTION PARA N8N
 * 
 * Este código deve ser adicionado a um nó Function no N8N após cada nó OpenAI
 * para extrair dados de uso e enviá-los para o endpoint de webhook.
 * 
 * Instruções:
 * 1. Adicione um nó Function após o nó OpenAI em seu workflow
 * 2. Cole este código no nó Function
 * 3. Ajuste as variáveis conforme necessário
 * 4. Conecte o nó OpenAI ao nó Function
 */

// Configurações
const WEBHOOK_URL = 'https://seu-site.vercel.app/api/webhooks/n8n-executions';
const WEBHOOK_SECRET = '{{$env.WEBHOOK_SECRET}}'; // Defina esta variável de ambiente no N8N
const NODE_NAME = 'OpenAI'; // Nome do nó OpenAI no seu workflow

// Obter dados do nó anterior (OpenAI)
const openAIResponse = $input.item.json;
let usageData = null;
let modelName = 'unknown';

// Função para extrair dados de uso da OpenAI
function extractOpenAIUsage(data) {
  console.log('Extraindo dados de uso da OpenAI');
  
  // Tentar encontrar o modelo usado
  if (data.model) {
    modelName = data.model;
  } else if (data.data?.model) {
    modelName = data.data.model;
  }
  
  // Tentar encontrar dados de uso
  if (data.usage) {
    return data.usage;
  } else if (data.data?.usage) {
    return data.data.usage;
  } else if (data.response?.usage) {
    return data.response.usage;
  }
  
  // Se não encontrar dados de uso, mas tiver choices/mensagens, estimar
  if (data.choices && data.choices[0]?.message?.content) {
    const responseLength = data.choices[0].message.content.length;
    const promptLength = data.prompt ? 
      (typeof data.prompt === 'string' ? data.prompt.length : JSON.stringify(data.prompt).length) : 
      500; // valor estimado se não encontrar o prompt
    
    return {
      prompt_tokens: Math.ceil(promptLength / 4), // estimativa: 4 caracteres = 1 token
      completion_tokens: Math.ceil(responseLength / 4),
      total_tokens: Math.ceil((promptLength + responseLength) / 4)
    };
  }
  
  // Se não conseguir extrair ou estimar, retornar valores padrão
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  };
}

// Extrair dados de uso
try {
  usageData = extractOpenAIUsage(openAIResponse);
  
  // Preparar dados para enviar ao webhook
  const webhookData = {
    workflow_id: $workflow.id,
    workflow_name: $workflow.name,
    execution_id: $execution.id,
    node_name: NODE_NAME,
    model: modelName,
    tokens_prompt: usageData.prompt_tokens,
    tokens_completion: usageData.completion_tokens,
    tokens_total: usageData.total_tokens,
    timestamp: new Date().toISOString()
  };
  
  // Enviar dados para o webhook
  const webhookResponse = await $http.post(
    WEBHOOK_URL,
    webhookData,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_SECRET}`
      }
    }
  );
  
  // Verificar resposta do webhook
  if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
    console.log('Dados de uso enviados com sucesso:', webhookResponse.data);
  } else {
    console.error('Erro ao enviar dados de uso:', webhookResponse.status, webhookResponse.data);
  }
  
} catch (error) {
  console.error('Erro ao processar dados de uso da OpenAI:', error.message);
}

// Adicionar dados de uso ao item para uso posterior no workflow
$input.item.json.openAIUsage = {
  model: modelName,
  ...usageData
};

// Retornar o item para continuar o workflow
return $input.item; 