// Script para testar conexão com o N8N usando variáveis hardcoded para diagnóstico
// ATENÇÃO: Este é um script temporário apenas para fins de diagnóstico
// Remova após a resolução do problema

// Definir variáveis diretamente (obtidas do .env.local)
const N8N_API_URL = "https://node.clinicadopovo.onpsbu.easypanel.host/api/v1";
const N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2QwNzdlNS1lMzdiLTQ1NzQtOGQ5YS04OGNhNjUyN2VjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQwNTE5OTYyfQ.MrXNBTi13d_VMpCCbKoveb43d8hwpNQa4EFEn4PGVHQ";

console.log(`\n=== TESTE DE CONEXÃO COM N8N ===\n`);
console.log(`Usando as seguintes configurações:
- URL da API N8N: ${N8N_API_URL}
- API Key N8N: ${N8N_API_KEY.substring(0, 10)}...`);

async function testApiConnection() {
  try {
    console.log("\n🔍 Testando conexão direta com o endpoint de workflows...");
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      console.log(`✅ Conexão estabelecida - Status: ${response.status}`);
      const data = await response.json();
      console.log(`Total de workflows: ${data.data?.length || 0}`);
      return true;
    } else {
      console.error(`❌ Falha na conexão - Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Erro: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao conectar à API: ${error.message}`);
    return false;
  }
}

async function listWorkflows() {
  try {
    console.log("\n🔍 Tentando listar workflows...");
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const workflows = data.data || [];
      console.log(`✅ Workflows listados com sucesso - Total: ${workflows.length}`);
      
      // Listar workflows e suas tags
      if (workflows.length > 0) {
        console.log("\nWorkflows encontrados:");
        workflows.forEach((workflow, index) => {
          const tags = workflow.tags || [];
          const tagNames = tags.map(tag => {
            if (typeof tag === 'string') return tag;
            if (tag && tag.name) return tag.name;
            if (tag && tag.text) return tag.text;
            return 'Tag desconhecida';
          }).join(', ');
          
          console.log(`${index + 1}. ID: ${workflow.id} | Nome: ${workflow.name} | Tags: ${tagNames || 'Nenhuma'}`);
        });
        
        // Filtrar workflows com tag "main agent" ou "agent"
        const agentWorkflows = workflows.filter(workflow => {
          if (!workflow.tags || !Array.isArray(workflow.tags)) {
            return false;
          }
          
          return workflow.tags.some(tag => {
            if (typeof tag === 'string') {
              return tag.toLowerCase() === 'main agent' || tag.toLowerCase() === 'agent';
            }
            else if (tag && typeof tag === 'object' && tag.name) {
              return tag.name.toLowerCase() === 'main agent' || tag.name.toLowerCase() === 'agent';
            }
            else if (tag && typeof tag === 'object' && tag.id && tag.text) {
              return tag.text.toLowerCase() === 'main agent' || tag.text.toLowerCase() === 'agent';
            }
            return false;
          });
        });
        
        console.log(`\nWorkflows com tag "main agent" ou "agent": ${agentWorkflows.length}`);
        if (agentWorkflows.length > 0) {
          agentWorkflows.forEach((workflow, index) => {
            console.log(`${index + 1}. ID: ${workflow.id} | Nome: ${workflow.name}`);
          });
          
          // Retornar o primeiro workflow com tag "agent" para testes
          return agentWorkflows[0].id;
        } else {
          console.log("❌ Nenhum workflow com tag 'main agent' ou 'agent' encontrado.");
          console.log("Por favor, adicione a tag 'main agent' ou 'agent' ao workflow desejado no N8N.");
          
          // Se não encontrou workflows com tag "agent", retornar o primeiro workflow disponível
          if (workflows.length > 0) {
            console.log(`\n⚠️ Usando primeiro workflow disponível para testes: ${workflows[0].name}`);
            return workflows[0].id;
          }
        }
      }
      
      return null;
    } else {
      console.error(`❌ Erro ao listar workflows - Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Detalhes: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao listar workflows: ${error.message}`);
    return null;
  }
}

async function testExecutionsAccess(workflowId) {
  if (!workflowId) {
    console.log("\n⚠️ Nenhum ID de workflow fornecido para testar acesso às execuções.");
    return null;
  }
  
  try {
    console.log(`\n🔍 Testando acesso às execuções do workflow ${workflowId}...`);
    
    // Método 1: Tentativa com endpoint /workflows/{id}/executions
    let response = await fetch(`${N8N_API_URL}/workflows/${workflowId}/executions`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    // Se o primeiro método falhar, tentar o Método 2: endpoint /executions com filtro
    if (!response.ok) {
      console.log(`⚠️ Endpoint /workflows/{id}/executions falhou - Status: ${response.status}`);
      console.log(`🔍 Tentando endpoint alternativo /executions?workflowId=${workflowId}...`);
      
      response = await fetch(`${N8N_API_URL}/executions?workflowId=${workflowId}`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      });
    }

    // Se o segundo método falhar, tentar o Método 3: endpoint /workflows/{id}/executions com formato diferente
    if (!response.ok) {
      console.log(`⚠️ Endpoint /executions com filtro falhou - Status: ${response.status}`);
      console.log(`🔍 Tentando endpoint /workflows/${workflowId}/runs...`);
      
      response = await fetch(`${N8N_API_URL}/workflows/${workflowId}/runs`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      });
    }

    // Se o terceiro método falhar, tentar o Método 4: simplesmente listar todas as execuções
    if (!response.ok) {
      console.log(`⚠️ Endpoint /workflows/{id}/runs falhou - Status: ${response.status}`);
      console.log(`🔍 Tentando listar todas as execuções sem filtro...`);
      
      response = await fetch(`${N8N_API_URL}/executions`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      });
    }

    if (response.ok) {
      const data = await response.json();
      const executions = data.data || [];
      console.log(`✅ Execuções listadas com sucesso - Total: ${executions.length}`);
      
      // Filtrar execuções para o workflow específico (se obtivemos todas as execuções)
      const workflowExecutions = workflowId 
        ? executions.filter(execution => execution.workflowId === workflowId)
        : executions;
      
      console.log(`Execuções para o workflow ${workflowId}: ${workflowExecutions.length}`);
      
      if (workflowExecutions.length > 0) {
        console.log(`\nMostrando ${Math.min(5, workflowExecutions.length)} execuções mais recentes:`);
        workflowExecutions.slice(0, 5).forEach((execution, index) => {
          const status = execution.status;
          const startedAt = execution.startedAt;
          const finishedAt = execution.finishedAt;
          console.log(`${index + 1}. ID: ${execution.id} | Status: ${status} | Início: ${startedAt} | Fim: ${finishedAt}`);
        });
        
        // Retornar a primeira execução para análise detalhada
        if (workflowExecutions.length > 0) {
          return workflowExecutions[0].id;
        }
      } else {
        console.log("⚠️ Nenhuma execução encontrada para este workflow.");
      }
      
      return null;
    } else {
      console.error(`❌ Todos os métodos de acesso às execuções falharam - Status final: ${response.status}`);
      const errorText = await response.text();
      console.error(`Detalhes: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao acessar execuções: ${error.message}`);
    return null;
  }
}

async function testExecutionDetails(executionId) {
  if (!executionId) {
    console.log("\n⚠️ Nenhum ID de execução fornecido para testar acesso aos detalhes.");
    return;
  }
  
  try {
    console.log(`\n🔍 Testando acesso aos detalhes da execução ${executionId}...`);
    
    // Método 1: Buscar detalhes básicos da execução
    let response = await fetch(`${N8N_API_URL}/executions/${executionId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const execution = await response.json();
      console.log(`✅ Detalhes básicos da execução obtidos com sucesso`);
      
      // Analisar estrutura básica da execução
      console.log("\nEstrutura básica da execução:");
      console.log(JSON.stringify(execution, null, 2).substring(0, 500) + "...");
      
      // Verificar se a execução tem dados completos
      const hasData = !!execution.data;
      const hasResultData = hasData && !!execution.data.resultData;
      const hasRunData = hasResultData && !!execution.data.resultData.runData;
      
      console.log(`\nVerificação de estrutura:
- Tem data: ${hasData ? 'SIM' : 'NÃO'}
- Tem resultData: ${hasResultData ? 'SIM' : 'NÃO'}
- Tem runData: ${hasRunData ? 'SIM' : 'NÃO'}`);
      
      // Se não temos os dados completos, tentar método alternativo
      if (!hasRunData) {
        console.log("\n🔍 Tentando obter dados completos via endpoint alternativo...");
        
        // Método 2: Buscar dados completos da execução
        const fullDataResponse = await fetch(`${N8N_API_URL}/executions/${executionId}/data`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        });
        
        if (fullDataResponse.ok) {
          const fullData = await fullDataResponse.json();
          console.log("✅ Dados completos obtidos com sucesso");
          
          // Verificar estrutura dos dados completos
          const hasResultData = !!fullData.resultData;
          const hasRunData = hasResultData && !!fullData.resultData.runData;
          
          console.log(`\nVerificação de estrutura dos dados completos:
- Tem resultData: ${hasResultData ? 'SIM' : 'NÃO'}
- Tem runData: ${hasRunData ? 'SIM' : 'NÃO'}`);
          
          if (hasRunData) {
            const nodes = Object.keys(fullData.resultData.runData);
            console.log(`\nNós encontrados nos dados completos (${nodes.length}):`);
            nodes.forEach(node => console.log(`- ${node}`));
            
            // Verificar nós específicos
            analyzeNodes(nodes, fullData.resultData.runData);
          } else {
            console.log("\n⚠️ Não foi possível encontrar runData nos dados completos.");
            
            // Apenas para diagnóstico, mostrar a estrutura dos dados obtidos
            console.log("\nEstrutura dos dados completos:");
            console.log(JSON.stringify(fullData, null, 2).substring(0, 500) + "...");
          }
        } else {
          console.error(`❌ Erro ao obter dados completos - Status: ${fullDataResponse.status}`);
          const errorText = await fullDataResponse.text();
          console.error(`Detalhes: ${errorText}`);
          
          // Método 3: Tentar endpoint Output
          console.log("\n🔍 Tentando obter saída da execução via endpoint alternativo...");
          
          const outputResponse = await fetch(`${N8N_API_URL}/executions/${executionId}/output`, {
            method: 'GET',
            headers: {
              'X-N8N-API-KEY': N8N_API_KEY,
              'Accept': 'application/json'
            }
          });
          
          if (outputResponse.ok) {
            const outputData = await outputResponse.json();
            console.log("✅ Dados de saída obtidos com sucesso");
            
            console.log("\nEstrutura dos dados de saída:");
            console.log(JSON.stringify(outputData, null, 2).substring(0, 500) + "...");
            
            // Verificar se podemos extrair nós e analisá-los
            if (Array.isArray(outputData) && outputData.length > 0) {
              console.log(`\nNós na saída da execução (${outputData.length}):`);
              outputData.forEach((nodeOutput, index) => {
                console.log(`- Nó ${index + 1}: ${nodeOutput.name || 'Nome não disponível'}`);
              });
              
              // Tentar analisar os nós
              const nodeNames = outputData.map(node => node.name || `Node_${outputData.indexOf(node)}`);
              const nodeData = {};
              outputData.forEach(node => {
                const nodeName = node.name || `Node_${outputData.indexOf(node)}`;
                nodeData[nodeName] = node.data;
              });
              
              analyzeNodes(nodeNames, nodeData);
            } else {
              console.log("⚠️ Não foi possível encontrar nós na saída da execução.");
            }
          } else {
            console.error(`❌ Erro ao obter saída da execução - Status: ${outputResponse.status}`);
            const errorText = await outputResponse.text();
            console.error(`Detalhes: ${errorText}`);
          }
        }
      } else {
        // Já temos os dados, podemos analisar os nós diretamente
        const nodes = Object.keys(execution.data.resultData.runData);
        console.log(`\nNós encontrados (${nodes.length}):`);
        nodes.forEach(node => console.log(`- ${node}`));
        
        // Verificar nós específicos
        analyzeNodes(nodes, execution.data.resultData.runData);
      }
    } else {
      console.error(`❌ Erro ao obter detalhes da execução - Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Detalhes: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao acessar detalhes da execução: ${error.message}`);
  }
}

// Função auxiliar para analisar nós e procurar remotejid
function analyzeNodes(nodeNames, nodeData) {
  // Verificar nós específicos
  const webhookNodes = nodeNames.filter(node => 
    node.toLowerCase().includes('webhook') || 
    node.toLowerCase().includes('data api')
  );
  
  const qualifiedNodes = nodeNames.filter(node => 
    node.toLowerCase().includes('criar_agendamento') ||
    node.toLowerCase().includes('criar agendamento') ||
    node.toLowerCase().includes('agendarfup') ||
    node.toLowerCase().includes('agendar fup')
  );
  
  const unqualifiedNodes = nodeNames.filter(node => 
    node.toLowerCase().includes('cancelarfup') ||
    node.toLowerCase().includes('cancelar fup') ||
    node.toLowerCase().includes('unqualified') ||
    node.toLowerCase().includes('desqualificado')
  );
  
  console.log(`\nNós de interesse:
- Webhook (leads capturados): ${webhookNodes.length > 0 ? webhookNodes.join(', ') : 'Nenhum encontrado'}
- Qualificados: ${qualifiedNodes.length > 0 ? qualifiedNodes.join(', ') : 'Nenhum encontrado'}
- Desqualificados: ${unqualifiedNodes.length > 0 ? unqualifiedNodes.join(', ') : 'Nenhum encontrado'}`);
  
  // Analisar todos os nós para entender a estrutura e encontrar remotejid
  console.log("\n🔍 Analisando estrutura dos nós para procurar dados de leads...");
  
  for (const nodeName of nodeNames) {
    console.log(`\nAnalisando nó: ${nodeName}`);
    const nodeRuns = nodeData[nodeName];
    
    // Verificar se os dados do nó têm o formato esperado
    if (!nodeRuns) {
      console.log(`- Nó não possui dados`);
      continue;
    }
    
    if (!Array.isArray(nodeRuns)) {
      console.log(`- Dados não estão no formato esperado (array)`);
      console.log(`- Formato: ${typeof nodeRuns}`);
      continue;
    }
    
    console.log(`- Nó tem ${nodeRuns.length} execuções`);
    
    // Tentar encontrar dados nos formatos que conhecemos
    try {
      let foundData = false;
      
      // Para não sobrecarregar o log, limitar a análise à primeira execução
      if (nodeRuns.length > 0) {
        const run = nodeRuns[0];
        
        // Verificar se tem data.main
        if (run.data && run.data.main && Array.isArray(run.data.main)) {
          console.log(`- Encontrado data.main com ${run.data.main.length} saídas`);
          foundData = true;
          
          // Analisar as saídas para encontrar remotejid
          for (let i = 0; i < Math.min(run.data.main.length, 1); i++) {
            const output = run.data.main[i];
            if (Array.isArray(output) && output.length > 0) {
              console.log(`- Saída ${i+1} tem ${output.length} itens`);
              
              // Analisar apenas o primeiro item para não sobrecarregar
              if (output.length > 0) {
                const item = output[0];
                if (item.json) {
                  console.log("- Encontrado item.json");
                  console.log(`- Amostra: ${JSON.stringify(item.json).substring(0, 300)}...`);
                  
                  // Verificar se encontramos remotejid ou telefone
                  const foundRemotejid = findRemotejidInJson(item.json);
                  if (foundRemotejid) {
                    console.log(`✅ Encontrado identificador de lead: ${foundRemotejid}`);
                  } else {
                    console.log("❌ Não foi possível encontrar identificador de lead.");
                  }
                }
              }
            }
          }
        } else {
          console.log("- Não encontrado data.main no formato esperado");
        }
        
        // Se não encontramos data.main, verificar outros formatos possíveis
        if (!foundData) {
          console.log("- Verificando formatos alternativos...");
          console.log(`- Formato do nó: ${JSON.stringify(run).substring(0, 300)}...`);
        }
      }
    } catch (error) {
      console.error(`Erro ao analisar nó ${nodeName}: ${error.message}`);
    }
  }
}

// Função auxiliar para encontrar remotejid em um objeto JSON
function findRemotejidInJson(json) {
  try {
    // Verificar campos comuns
    if (json.remotejid) return json.remotejid;
    if (json.remoteJid) return json.remoteJid;
    
    if (json.body && json.body.telefone) return json.body.telefone;
    
    if (json.data && json.data.remotejid) return json.data.remotejid;
    if (json.data && json.data.remoteJid) return json.data.remoteJid;
    
    if (json.data && json.data.key && json.data.key.remoteJid) return json.data.key.remoteJid;
    
    // Buscar por regex
    const jsonStr = JSON.stringify(json);
    
    const remoteJidRegex = /"(remotejid|remoteJid)"\s*:\s*"([^"]+)"/i;
    const match = jsonStr.match(remoteJidRegex);
    if (match && match[2]) return match[2];
    
    const phoneRegex = /"telefone"\s*:\s*"([^"]+)"/i;
    const phoneMatch = jsonStr.match(phoneRegex);
    if (phoneMatch && phoneMatch[1]) return phoneMatch[1];
    
    // Não encontrou nada
    return null;
  } catch (error) {
    console.error(`Erro ao buscar remotejid: ${error.message}`);
    return null;
  }
}

// Função principal
async function main() {
  // Testar conexão diretamente com o endpoint de workflows
  const connectionOk = await testApiConnection();
  
  if (!connectionOk) {
    console.error("\n❌ Não foi possível estabelecer conexão com a API do N8N.");
    console.log("Verifique se o servidor N8N está acessível, se a URL está correta e se a API Key tem permissões adequadas.");
    return;
  }
  
  const workflowId = await listWorkflows();
  
  if (!workflowId) {
    console.error("\n❌ Não foi possível obter um workflow para testes.");
    return;
  }
  
  const executionId = await testExecutionsAccess(workflowId);
  
  if (executionId) {
    await testExecutionDetails(executionId);
  } else {
    console.log("\n⚠️ Não foi possível obter uma execução para análise detalhada.");
  }
  
  console.log(`\n=== TESTE CONCLUÍDO ===\n`);
}

// Executar teste
main()
  .then(() => console.log('\nTeste finalizado.'))
  .catch(error => console.error('Erro durante o teste:', error)); 