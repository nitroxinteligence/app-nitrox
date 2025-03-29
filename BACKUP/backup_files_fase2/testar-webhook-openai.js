#!/usr/bin/env node

/**
 * Script para testar o webhook de recebimento de dados do OpenAI
 * 
 * Este script envia dados de teste para o webhook para verificar se ele está
 * funcionando corretamente e salvando os dados no Supabase.
 * 
 * Uso:
 *   node scripts/testar-webhook-openai.js
 */

// Importar módulos necessários
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

// Configurações
const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/n8n-openai';
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'seu-segredo-aqui';
const NUM_TESTES = 3;
const VERBOSE = true;

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

    if (VERBOSE) {
      console.log(`\nFazendo requisição ${method} para ${url}`);
      console.log(`Headers: ${JSON.stringify(headers)}`);
      if (data) {
        console.log(`Dados: ${JSON.stringify(data).substring(0, 200)}...`);
      }
    }

    const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (VERBOSE) {
          console.log(`Resposta recebida: Status ${res.statusCode}`);
          console.log(`Headers da resposta: ${JSON.stringify(res.headers)}`);
          console.log(`Corpo da resposta: ${responseData.substring(0, 200)}...`);
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve({ statusCode: res.statusCode, body: parsedData });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: responseData });
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

// Função para gerar dados de teste
function gerarDadosTeste(index) {
  const modelos = ['gpt-3.5-turbo', 'gpt-4', 'text-embedding-ada-002'];
  const modelo = modelos[index % modelos.length];
  
  const workflowId = `workflow-teste-${Math.floor(Math.random() * 1000)}`;
  const workflowName = `Workflow de Teste ${index + 1}`;
  const executionId = `exec-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nodeId = `node-${Math.floor(Math.random() * 1000)}`;
  const nodeName = `OpenAI ${index + 1}`;
  
  let promptTokens, completionTokens, totalTokens;
  
  if (modelo === 'text-embedding-ada-002') {
    promptTokens = Math.floor(Math.random() * 1000) + 100;
    completionTokens = 0;
    totalTokens = promptTokens;
  } else {
    promptTokens = Math.floor(Math.random() * 1000) + 100;
    completionTokens = Math.floor(Math.random() * 500) + 50;
    totalTokens = promptTokens + completionTokens;
  }
  
  return {
    workflow_id: workflowId,
    workflow_name: workflowName,
    execution_id: executionId,
    node_id: nodeId,
    node_name: nodeName,
    model: modelo,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    timestamp: new Date().toISOString(),
    is_estimated: Math.random() > 0.7 // 30% de chance de ser estimado
  };
}

// Função para verificar a tabela no Supabase
async function verificarDadosSupabase() {
  console.log('\nVerificando se os dados foram salvos no Supabase...');
  console.log('NOTA: Esta verificação só funcionará se as credenciais do Supabase estiverem configuradas corretamente.');
  
  try {
    // Esta é uma simulação da verificação, já que não temos acesso direto ao Supabase
    console.log('\n📋 Para verificar manualmente:');
    console.log('1. Acesse o painel do Supabase');
    console.log('2. Vá para a seção "SQL Editor"');
    console.log('3. Execute a seguinte consulta:');
    console.log('\n```sql');
    console.log('SELECT * FROM openai_usage');
    console.log('ORDER BY timestamp DESC');
    console.log('LIMIT 10;');
    console.log('```');
    
    console.log('\nOu verifique especificamente os registros criados neste teste:');
    console.log('\n```sql');
    console.log(`SELECT * FROM openai_usage`);
    console.log(`WHERE timestamp > '${new Date(Date.now() - 5 * 60000).toISOString()}'`); // últimos 5 minutos
    console.log('ORDER BY timestamp DESC;');
    console.log('```');
    
    console.log('\n🔍 Problemas comuns se os dados não aparecerem:');
    console.log('• Verifique se a tabela openai_usage existe e tem a estrutura correta');
    console.log('• Execute o script criar-tabela-openai-usage.sql para corrigir a estrutura');
    console.log('• Verifique as credenciais do Supabase no arquivo .env.local');
    console.log('• Verifique os logs do servidor Next.js para mensagens de erro detalhadas');
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar dados no Supabase:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('=== Iniciando teste do webhook de recebimento de dados do OpenAI ===');
  console.log(`URL do webhook: ${WEBHOOK_URL}`);
  console.log(`Número de testes: ${NUM_TESTES}`);
  console.log(`Secret configurado: ${WEBHOOK_SECRET ? WEBHOOK_SECRET.substring(0, 3) + '...' : 'não configurado'}`);
  
  try {
    // Gerar dados de teste
    const dadosTeste = [];
    for (let i = 0; i < NUM_TESTES; i++) {
      dadosTeste.push(gerarDadosTeste(i));
    }
    
    console.log('\nDados de teste gerados:');
    console.log(JSON.stringify(dadosTeste, null, 2));
    
    // Enviar dados para o webhook
    console.log('\nEnviando dados para o webhook...');
    
    const response = await makeRequest(
      WEBHOOK_URL,
      'POST',
      {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
      },
      dadosTeste
    );
    
    console.log(`\nResposta do webhook (status ${response.statusCode}):`);
    console.log(JSON.stringify(response.body, null, 2));
    
    // Verificar se os dados foram salvos no Supabase
    await verificarDadosSupabase();
    
    console.log('\n=== Teste concluído com sucesso ===');
    console.log('Se a resposta do webhook indica sucesso, os dados provavelmente foram salvos.');
    console.log('Verifique se os dados foram salvos corretamente no Supabase.');
    
  } catch (error) {
    console.error('\n=== Erro durante o teste ===');
    console.error(error.message);
    process.exit(1);
  }
}

// Executar a função principal
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
}); 