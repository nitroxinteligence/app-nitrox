// Script para diagnosticar problemas de conexão com a API do N8N
// Este script verifica se conseguimos acessar a API do N8N e listar os workflows disponíveis

require('dotenv').config();

const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "";
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || "";

console.log(`\n=== DIAGNÓSTICO DE CONEXÃO COM N8N ===\n`);
console.log(`Configuração:
- URL da API N8N: ${N8N_API_URL || 'NÃO DEFINIDA'}
- API Key N8N definida: ${N8N_API_KEY ? 'SIM' : 'NÃO'}`);

if (!N8N_API_URL || !N8N_API_KEY) {
  console.error("\n❌ ERRO: Variáveis de ambiente necessárias não estão definidas.");
  console.log("Por favor, configure as variáveis NEXT_PUBLIC_N8N_API_URL e NEXT_PUBLIC_N8N_API_KEY.");
  process.exit(1);
}

async function testApiConnection() {
  try {
    console.log("\n🔍 Testando conexão básica com a API do N8N...");
    const response = await fetch(`${N8N_API_URL}/healthz`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      console.log(`✅ Conexão básica estabelecida - Status: ${response.status}`);
      const data = await response.text();
      console.log(`Resposta: ${data}`);
    } else {
      console.error(`❌ Falha na conexão básica - Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Erro: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao conectar à API: ${error.message}`);
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
        } else {
          console.log("❌ Nenhum workflow com tag 'main agent' ou 'agent' encontrado.");
          console.log("Por favor, adicione a tag 'main agent' ou 'agent' ao workflow desejado no N8N.");
        }
      }
    } else {
      console.error(`❌ Erro ao listar workflows - Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Detalhes: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao listar workflows: ${error.message}`);
  }
}

async function testExecutionsAccess(workflowId) {
  if (!workflowId) {
    console.log("\n⚠️ Nenhum ID de workflow fornecido para testar acesso às execuções.");
    return;
  }
  
  try {
    console.log(`\n🔍 Testando acesso às execuções do workflow ${workflowId}...`);
    const response = await fetch(`${N8N_API_URL}/workflows/${workflowId}/executions`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const executions = data.data || [];
      console.log(`✅ Execuções listadas com sucesso - Total: ${executions.length}`);
      
      if (executions.length > 0) {
        console.log(`\nMostrando ${Math.min(5, executions.length)} execuções mais recentes:`);
        executions.slice(0, 5).forEach((execution, index) => {
          const status = execution.status;
          const startedAt = execution.startedAt;
          const finishedAt = execution.finishedAt;
          console.log(`${index + 1}. ID: ${execution.id} | Status: ${status} | Início: ${startedAt} | Fim: ${finishedAt}`);
        });
        
        // Se há execuções, vamos testar o acesso ao detalhe da primeira
        if (executions.length > 0) {
          await testExecutionDetails(executions[0].id);
        }
      } else {
        console.log("⚠️ Nenhuma execução encontrada para este workflow.");
      }
    } else {
      console.error(`❌ Erro ao listar execuções - Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Detalhes: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao acessar execuções: ${error.message}`);
  }
}

async function testExecutionDetails(executionId) {
  if (!executionId) {
    console.log("\n⚠️ Nenhum ID de execução fornecido para testar acesso aos detalhes.");
    return;
  }
  
  try {
    console.log(`\n🔍 Testando acesso aos detalhes da execução ${executionId}...`);
    const response = await fetch(`${N8N_API_URL}/executions/${executionId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const execution = await response.json();
      console.log(`✅ Detalhes da execução obtidos com sucesso`);
      
      // Analisar estrutura da execução
      const hasData = !!execution.data;
      const hasResultData = hasData && !!execution.data.resultData;
      const hasRunData = hasResultData && !!execution.data.resultData.runData;
      
      console.log(`\nEstrutura da execução:
- Tem data: ${hasData ? 'SIM' : 'NÃO'}
- Tem resultData: ${hasResultData ? 'SIM' : 'NÃO'}
- Tem runData: ${hasRunData ? 'SIM' : 'NÃO'}`);
      
      if (hasRunData) {
        const nodes = Object.keys(execution.data.resultData.runData);
        console.log(`\nNós encontrados (${nodes.length}):`);
        nodes.forEach(node => console.log(`- ${node}`));
        
        // Verificar nós específicos
        const webhookNodes = nodes.filter(node => 
          node.toLowerCase().includes('webhook') || 
          node.toLowerCase().includes('data api')
        );
        
        const qualifiedNodes = nodes.filter(node => 
          node.toLowerCase().includes('criar_agendamento') ||
          node.toLowerCase().includes('criar agendamento') ||
          node.toLowerCase().includes('agendarfup') ||
          node.toLowerCase().includes('agendar fup')
        );
        
        const unqualifiedNodes = nodes.filter(node => 
          node.toLowerCase().includes('cancelarfup') ||
          node.toLowerCase().includes('cancelar fup') ||
          node.toLowerCase().includes('unqualified') ||
          node.toLowerCase().includes('desqualificado')
        );
        
        console.log(`\nNós de interesse:
- Webhook (leads capturados): ${webhookNodes.length > 0 ? webhookNodes.join(', ') : 'Nenhum encontrado'}
- Qualificados: ${qualifiedNodes.length > 0 ? qualifiedNodes.join(', ') : 'Nenhum encontrado'}
- Desqualificados: ${unqualifiedNodes.length > 0 ? unqualifiedNodes.join(', ') : 'Nenhum encontrado'}`);
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

async function checkSupabaseConfiguration() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  
  console.log(`\n=== VERIFICAÇÃO DE CONFIGURAÇÃO DO SUPABASE ===\n`);
  console.log(`Configuração:
- URL Supabase: ${SUPABASE_URL || 'NÃO DEFINIDA'}
- Service Role Key definida: ${SUPABASE_KEY ? 'SIM' : 'NÃO'}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("\n❌ ERRO: Variáveis de ambiente do Supabase não estão definidas.");
    console.log("Por favor, configure as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  } else {
    console.log("✅ Variáveis de ambiente do Supabase estão definidas.");
  }
}

// Função principal
async function main() {
  await testApiConnection();
  await checkSupabaseConfiguration();
  await listWorkflows();
  
  // Se encontrarmos workflows, testar execuções do primeiro workflow
  try {
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
      
      if (agentWorkflows.length > 0) {
        await testExecutionsAccess(agentWorkflows[0].id);
      } else if (workflows.length > 0) {
        console.log("\n⚠️ Nenhum workflow com tag 'main agent' ou 'agent' encontrado. Testando o primeiro workflow disponível...");
        await testExecutionsAccess(workflows[0].id);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar workflows para teste de execuções: ${error.message}`);
  }
  
  console.log(`\n=== DIAGNÓSTICO CONCLUÍDO ===\n`);
  console.log(`Resumo:
1. Verifique se todas as variáveis de ambiente estão corretamente configuradas.
2. Certifique-se de que o servidor N8N está acessível no URL configurado.
3. Valide se a API Key tem permissões para acessar workflows e execuções.
4. Adicione a tag 'main agent' ou 'agent' aos workflows relevantes.
5. Verifique se os workflows possuem execuções recentes.
6. Confirme se os nós 'Webhook', 'criar_agendamento' e 'cancelarFUP' existem nos workflows.`);
}

// Executar diagnóstico
main()
  .then(() => console.log('\nDiagnóstico finalizado.'))
  .catch(error => console.error('Erro durante o diagnóstico:', error)); 