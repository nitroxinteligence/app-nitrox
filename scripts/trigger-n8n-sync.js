#!/usr/bin/env node

/**
 * Script para acionar manualmente a sincronização entre N8N e Supabase
 * 
 * Uso: 
 * 1. Certifique-se de que o servidor Next.js está rodando
 * 2. Execute: node scripts/trigger-n8n-sync.js [--workflow-id ID]
 */

// Importar dotenv para carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });
const http = require('http');
const https = require('https');

// Cores para saída do console
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m"
};

// Função para exibir mensagens formatadas
function log(type, message) {
  const types = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCESSO]${colors.reset}`,
    error: `${colors.red}[ERRO]${colors.reset}`,
    warning: `${colors.yellow}[AVISO]${colors.reset}`,
    step: `${colors.magenta}[PASSO]${colors.reset}`
  };
  
  console.log(`${types[type] || ''} ${message}`);
}

// Função para fazer requisição HTTP/HTTPS
function makeRequest(url, method, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // Tentar fazer parse do JSON
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          // Se o parse falhar, retornar o texto bruto
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Função principal
async function main() {
  log('info', 'Iniciando sincronização manual com N8N');
  
  // Analisar argumentos
  const args = process.argv.slice(2);
  let workflowId = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workflow-id' && i + 1 < args.length) {
      workflowId = args[i + 1];
      i++;
    }
  }
  
  // Determinar a URL base do servidor
  const baseUrl = process.env.SERVICE_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/n8n/sync-usage`;
  
  log('step', `Conectando à API em ${apiUrl}`);
  log('info', workflowId ? `Sincronizando apenas o workflow ${workflowId}` : 'Sincronizando todos os workflows');
  
  try {
    // Fazer a requisição
    const startTime = Date.now();
    const requestBody = workflowId ? { workflowId } : {};
    
    const response = await makeRequest(apiUrl, 'POST', requestBody);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      log('success', `Sincronização concluída em ${elapsedTime}s`);
      
      // Mostrar estatísticas se disponíveis
      if (response.data && response.data.statistics) {
        const stats = response.data.statistics;
        log('info', `Workflows processados: ${stats.workflows_processed || 0}`);
        log('info', `Execuções processadas: ${stats.executions_processed || 0}`);
        log('info', `Registros extraídos: ${stats.total_records || 0}`);
        log('info', `Tokens totais: ${stats.total_tokens || 0}`);
        log('info', `Custo estimado: $${stats.total_cost ? stats.total_cost.toFixed(6) : '0.000000'}`);
      }
    } else {
      log('error', `Falha na sincronização: Código ${response.statusCode}`);
      if (response.data && response.data.error) {
        log('error', `Mensagem de erro: ${response.data.error}`);
      }
    }
    
    console.log("\nResposta completa:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    log('error', `Erro ao fazer requisição: ${error.message}`);
  }
}

// Executar função principal
main().catch(error => {
  log('error', `Erro fatal: ${error.message}`);
  process.exit(1);
}); 