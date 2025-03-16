/**
 * Script para analisar dados de execução do N8N e identificar informações de uso da OpenAI
 * 
 * Este script simula uma execução específica e analisa os dados para identificar
 * informações de uso da OpenAI, como tokens, modelo e custo.
 */

// Simulação de dados de execução
const execucaoSimulada = {
  id: "17475",
  workflowId: "SeT26vs5Tr66na72",
  workflowName: "Base de Conhecimento | RAG System",
  status: "success",
  startedAt: "2025-02-27T17:25:30.026Z",
  stoppedAt: "2025-02-27T17:25:30.136Z",
  data: {
    resultData: {
      runData: {
        // Simulação de um nó OpenAI
        "OpenAI": [
          {
            data: {
              json: {
                id: "chatcmpl-123456789",
                object: "chat.completion",
                created: 1677649420,
                model: "gpt-3.5-turbo",
                usage: {
                  prompt_tokens: 56,
                  completion_tokens: 31,
                  total_tokens: 87
                },
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: "Esta é uma resposta simulada do modelo GPT-3.5 Turbo."
                    },
                    finish_reason: "stop",
                    index: 0
                  }
                ]
              }
            }
          }
        ],
        // Simulação de um nó que processa a resposta do OpenAI
        "Processar Resposta": [
          {
            data: {
              json: {
                resposta: "Esta é uma resposta simulada do modelo GPT-3.5 Turbo.",
                modelo: "gpt-3.5-turbo",
                tokens: 87
              }
            }
          }
        ]
      }
    }
  }
};

// Função para analisar dados de execução
function analisarDadosExecucao(execucao) {
  console.log("=== ANÁLISE DE EXECUÇÃO ===");
  console.log(`ID: ${execucao.id}`);
  console.log(`Workflow: ${execucao.workflowName} (${execucao.workflowId})`);
  console.log(`Status: ${execucao.status}`);
  console.log(`Duração: ${(new Date(execucao.stoppedAt).getTime() - new Date(execucao.startedAt).getTime())} ms`);
  
  // Verificar se temos dados de execução
  if (!execucao.data || !execucao.data.resultData || !execucao.data.resultData.runData) {
    console.log("Nenhum dado de execução disponível");
    return;
  }
  
  const runData = execucao.data.resultData.runData;
  const nodes = Object.keys(runData);
  
  console.log(`\nNós encontrados (${nodes.length}): ${nodes.join(", ")}`);
  
  // Analisar cada nó
  let dadosOpenAIEncontrados = false;
  
  for (const nodeId of nodes) {
    console.log(`\n--- Nó: ${nodeId} ---`);
    
    const nodeData = runData[nodeId];
    if (!nodeData || !Array.isArray(nodeData) || nodeData.length === 0) {
      console.log("  Sem dados");
      continue;
    }
    
    // Analisar cada execução do nó
    for (let i = 0; i < nodeData.length; i++) {
      console.log(`  Execução ${i+1}:`);
      
      const nodeExecution = nodeData[i];
      if (!nodeExecution.data) {
        console.log("    Sem dados");
        continue;
      }
      
      // Verificar data.json
      if (nodeExecution.data.json) {
        const json = nodeExecution.data.json;
        
        // Verificar modelo
        if (json.model) {
          console.log(`    Modelo: ${json.model}`);
          dadosOpenAIEncontrados = true;
        }
        
        // Verificar usage
        if (json.usage) {
          console.log(`    Usage: prompt_tokens=${json.usage.prompt_tokens || 0}, completion_tokens=${json.usage.completion_tokens || 0}, total_tokens=${json.usage.total_tokens || 0}`);
          dadosOpenAIEncontrados = true;
        }
        
        // Verificar campos aninhados
        for (const field of ['data', 'response', 'result', 'output', 'content']) {
          if (json[field] && typeof json[field] === 'object') {
            if (json[field].model) {
              console.log(`    Modelo em ${field}: ${json[field].model}`);
              dadosOpenAIEncontrados = true;
            }
            
            if (json[field].usage) {
              console.log(`    Usage em ${field}: prompt_tokens=${json[field].usage.prompt_tokens || 0}, completion_tokens=${json[field].usage.completion_tokens || 0}, total_tokens=${json[field].usage.total_tokens || 0}`);
              dadosOpenAIEncontrados = true;
            }
          }
        }
        
        // Verificar se há tokens individuais
        if (json.tokens || json.prompt_tokens || json.completion_tokens || json.total_tokens) {
          console.log(`    Tokens: ${json.tokens || json.total_tokens || 0}`);
          dadosOpenAIEncontrados = true;
        }
        
        // Verificar se há indicação de modelo em outros campos
        if (json.modelo || json.engine || json.ai_model) {
          console.log(`    Modelo alternativo: ${json.modelo || json.engine || json.ai_model}`);
          dadosOpenAIEncontrados = true;
        }
        
        // Mostrar estrutura completa do JSON para debug
        console.log("    Estrutura do JSON:");
        console.log(JSON.stringify(json, null, 2));
      }
      
      // Verificar data.binary
      if (nodeExecution.data.binary) {
        console.log("    Dados binários disponíveis");
        
        for (const binaryKey in nodeExecution.data.binary) {
          console.log(`    Binary "${binaryKey}": ${nodeExecution.data.binary[binaryKey].mimeType}`);
        }
      }
    }
  }
  
  if (!dadosOpenAIEncontrados) {
    console.log("\nNenhum dado de uso da OpenAI encontrado na execução");
  } else {
    console.log("\nDados de uso da OpenAI encontrados na execução");
  }
}

// Analisar a execução simulada
analisarDadosExecucao(execucaoSimulada);

// Analisar uma execução real (se disponível)
try {
  // Tentar carregar dados de uma execução real de um arquivo
  const fs = require('fs');
  if (fs.existsSync('./analise-execucao.json')) {
    console.log("\n\n=== ANALISANDO EXECUÇÃO REAL ===\n");
    const execucaoReal = JSON.parse(fs.readFileSync('./analise-execucao.json', 'utf8'));
    analisarDadosExecucao(execucaoReal);
  }
} catch (error) {
  console.error("Erro ao analisar execução real:", error.message);
}

console.log("\n=== CONCLUSÃO ===");
console.log("A análise mostra que os dados de uso da OpenAI podem estar presentes em diferentes formatos:");
console.log("1. Diretamente no objeto de resposta (json.usage)");
console.log("2. Em campos aninhados (json.data.usage, json.response.usage, etc.)");
console.log("3. Como campos individuais (json.tokens, json.modelo, etc.)");
console.log("\nPara extrair esses dados, é necessário verificar todos esses padrões.");
console.log("Se nenhum dado foi encontrado nas execuções reais, pode ser que:");
console.log("1. O N8N não esteja configurado para salvar dados completos de execução");
console.log("2. Os nós OpenAI não estejam retornando informações de uso");
console.log("3. Os dados estejam em um formato diferente do esperado");

// Sugestões para resolver o problema
console.log("\n=== SUGESTÕES ===");
console.log("1. Verificar a configuração do N8N para garantir que os dados completos de execução sejam salvos");
console.log("2. Adicionar um nó 'Function' no final dos workflows para extrair e salvar explicitamente os dados de uso");
console.log("3. Implementar um webhook no final dos workflows para enviar os dados de uso diretamente para o Supabase");
console.log("4. Executar manualmente um workflow com nós OpenAI e verificar se os dados de uso são salvos"); 