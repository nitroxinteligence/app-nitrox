#!/usr/bin/env node

/**
 * Script para automatizar a implementação do nó Function para extração de dados OpenAI
 * em todos os workflows do N8N que contêm nós OpenAI.
 * 
 * Uso:
 *   node scripts/implementar-function-node.js
 * 
 * Requisitos:
 *   - Node.js 14+
 *   - Variáveis de ambiente N8N_API_URL e N8N_API_KEY configuradas
 */

// Importar módulos necessários
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

// Configurações
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || '';
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || '';
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/n8n-openai';
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'seu-segredo-aqui';

// Verificar configurações
if (!N8N_API_URL || !N8N_API_KEY) {
  console.error('Erro: Variáveis de ambiente N8N_API_URL e N8N_API_KEY são obrigatórias.');
  console.error('Configure-as no arquivo .env.local ou como variáveis de ambiente.');
  process.exit(1);
}

// Caminho para o arquivo do script Function Node
const FUNCTION_NODE_SCRIPT_PATH = path.join(__dirname, 'extrair-uso-openai-direto.js');

// Verificar se o arquivo do script existe
if (!fs.existsSync(FUNCTION_NODE_SCRIPT_PATH)) {
  console.error(`Erro: Arquivo de script não encontrado em ${FUNCTION_NODE_SCRIPT_PATH}`);
  process.exit(1);
}

// Ler o conteúdo do script Function Node
const functionNodeScript = fs.readFileSync(FUNCTION_NODE_SCRIPT_PATH, 'utf8');

// Modificar o script para usar as configurações corretas
const modifiedScript = functionNodeScript
  .replace(/WEBHOOK_URL: '.*?'/g, `WEBHOOK_URL: '${WEBHOOK_URL}'`)
  .replace(/WEBHOOK_SECRET: '.*?' \|\| '.*?'/g, `WEBHOOK_SECRET: '{{$env.WEBHOOK_SECRET}}' || '${WEBHOOK_SECRET}'`);

// Função para fazer requisições HTTP/HTTPS
async function makeRequest(url, method, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: `${urlObj.pathname}${urlObj.search}`,
      method: method,
      headers: headers
    };

    const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`Requisição falhou com status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

// Função para obter todos os workflows do N8N
async function getWorkflows() {
  console.log('Obtendo lista de workflows do N8N...');
  
  try {
    const workflows = await makeRequest(
      `${N8N_API_URL}/workflows`,
      'GET',
      {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    );
    
    console.log(`Encontrados ${workflows.length} workflows.`);
    return workflows;
  } catch (error) {
    console.error('Erro ao obter workflows:', error.message);
    throw error;
  }
}

// Função para verificar se um nó é do tipo OpenAI
function isOpenAINode(node) {
  // Verificar pelo tipo do nó
  if (node.type && (
    node.type.includes('openAi') || 
    node.type.includes('OpenAI') || 
    node.type.includes('openai')
  )) {
    return true;
  }
  
  // Verificar pelo nome do nó
  if (node.name && (
    node.name.toLowerCase().includes('openai') ||
    node.name.toLowerCase().includes('gpt') ||
    node.name.toLowerCase().includes('davinci') ||
    node.name.toLowerCase().includes('embedding')
  )) {
    return true;
  }
  
  // Verificar pelos parâmetros do nó
  if (node.parameters && node.parameters.model && (
    node.parameters.model.includes('gpt') ||
    node.parameters.model.includes('davinci') ||
    node.parameters.model.includes('embedding')
  )) {
    return true;
  }
  
  return false;
}

// Função para adicionar um nó Function após um nó OpenAI
function addFunctionNodeAfterOpenAI(workflow, openAINode) {
  // Criar um novo ID para o nó Function
  const functionNodeId = `Function_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Criar o nó Function
  const functionNode = {
    id: functionNodeId,
    name: `Extrair Dados OpenAI (${openAINode.name})`,
    type: 'n8n-nodes-base.function',
    typeVersion: 1,
    position: [
      openAINode.position[0] + 200, // Posicionar à direita do nó OpenAI
      openAINode.position[1]
    ],
    parameters: {
      functionCode: modifiedScript
    }
  };
  
  // Adicionar o nó Function ao workflow
  workflow.nodes.push(functionNode);
  
  // Encontrar conexões que saem do nó OpenAI
  const connectionsFromOpenAI = workflow.connections.filter(
    conn => conn.source === openAINode.id
  );
  
  // Redirecionar essas conexões para saírem do nó Function
  connectionsFromOpenAI.forEach(conn => {
    conn.source = functionNodeId;
  });
  
  // Adicionar uma conexão do nó OpenAI para o nó Function
  workflow.connections.push({
    source: openAINode.id,
    sourceHandle: null,
    target: functionNodeId,
    targetHandle: null
  });
  
  return functionNodeId;
}

// Função para atualizar um workflow no N8N
async function updateWorkflow(workflowId, workflowData) {
  console.log(`Atualizando workflow ${workflowId}...`);
  
  try {
    const result = await makeRequest(
      `${N8N_API_URL}/workflows/${workflowId}`,
      'PUT',
      {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      workflowData
    );
    
    console.log(`Workflow ${workflowId} atualizado com sucesso.`);
    return result;
  } catch (error) {
    console.error(`Erro ao atualizar workflow ${workflowId}:`, error.message);
    throw error;
  }
}

// Função principal
async function main() {
  console.log('=== Iniciando implementação do nó Function para extração de dados OpenAI ===');
  console.log(`URL da API do N8N: ${N8N_API_URL}`);
  console.log(`URL do Webhook: ${WEBHOOK_URL}`);
  
  try {
    // Obter todos os workflows
    const workflows = await getWorkflows();
    
    // Estatísticas
    const stats = {
      workflowsProcessados: 0,
      workflowsModificados: 0,
      nodesOpenAI: 0,
      nodesFunctionAdicionados: 0,
      erros: 0
    };
    
    // Processar cada workflow
    for (const workflow of workflows) {
      stats.workflowsProcessados++;
      console.log(`\nProcessando workflow: ${workflow.name} (ID: ${workflow.id})`);
      
      try {
        // Obter detalhes completos do workflow
        const workflowDetail = await makeRequest(
          `${N8N_API_URL}/workflows/${workflow.id}`,
          'GET',
          {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
          }
        );
        
        // Verificar se o workflow tem nós OpenAI
        const openAINodes = workflowDetail.nodes.filter(isOpenAINode);
        
        if (openAINodes.length === 0) {
          console.log(`  Nenhum nó OpenAI encontrado no workflow ${workflow.name}.`);
          continue;
        }
        
        console.log(`  Encontrados ${openAINodes.length} nós OpenAI no workflow ${workflow.name}.`);
        stats.nodesOpenAI += openAINodes.length;
        
        // Verificar se já existem nós Function para extração de dados
        const existingFunctionNodes = workflowDetail.nodes.filter(
          node => node.name && node.name.includes('Extrair Dados OpenAI')
        );
        
        if (existingFunctionNodes.length > 0) {
          console.log(`  Já existem ${existingFunctionNodes.length} nós Function para extração de dados.`);
          console.log(`  Pulando workflow ${workflow.name}.`);
          continue;
        }
        
        // Adicionar nós Function após cada nó OpenAI
        let workflowModified = false;
        
        for (const openAINode of openAINodes) {
          console.log(`  Adicionando nó Function após o nó OpenAI: ${openAINode.name}`);
          const functionNodeId = addFunctionNodeAfterOpenAI(workflowDetail, openAINode);
          console.log(`  Nó Function adicionado com ID: ${functionNodeId}`);
          stats.nodesFunctionAdicionados++;
          workflowModified = true;
        }
        
        if (workflowModified) {
          // Atualizar o workflow no N8N
          await updateWorkflow(workflow.id, workflowDetail);
          stats.workflowsModificados++;
        }
      } catch (error) {
        console.error(`  Erro ao processar workflow ${workflow.name}:`, error.message);
        stats.erros++;
      }
    }
    
    // Exibir estatísticas
    console.log('\n=== Implementação concluída ===');
    console.log(`Workflows processados: ${stats.workflowsProcessados}`);
    console.log(`Workflows modificados: ${stats.workflowsModificados}`);
    console.log(`Nós OpenAI encontrados: ${stats.nodesOpenAI}`);
    console.log(`Nós Function adicionados: ${stats.nodesFunctionAdicionados}`);
    console.log(`Erros: ${stats.erros}`);
    
    // Instruções finais
    console.log('\n=== Próximos passos ===');
    console.log('1. Verifique os workflows modificados no N8N');
    console.log('2. Configure a variável de ambiente WEBHOOK_SECRET no N8N');
    console.log('3. Execute os workflows para testar a extração de dados');
    console.log('4. Verifique se os dados estão sendo salvos no Supabase');
    
  } catch (error) {
    console.error('Erro durante a implementação:', error.message);
    process.exit(1);
  }
}

// Executar a função principal
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
}); 