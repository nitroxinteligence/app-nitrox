#!/usr/bin/env node

/**
 * Script para diagnosticar problemas de DNS com o Supabase
 * 
 * Este script testa a resolução DNS do domínio Supabase e outros
 * domínios relevantes para diagnosticar problemas de conectividade.
 */

const dns = require('dns');
const { exec } = require('child_process');
const http = require('http');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

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

// Verificar resolução DNS
async function checkDNS(domain) {
  return new Promise((resolve) => {
    dns.lookup(domain, (err, address) => {
      if (err) {
        log('error', `Falha ao resolver DNS para ${domain}: ${err.code}`);
        resolve({ domain, success: false, error: err.code });
      } else {
        log('success', `Resolvido ${domain} para ${address}`);
        resolve({ domain, success: true, address });
      }
    });
  });
}

// Testar resolução DNS reversa
async function checkReverseDNS(ip) {
  return new Promise((resolve) => {
    dns.reverse(ip, (err, hostnames) => {
      if (err) {
        log('warning', `Falha ao resolver DNS reverso para ${ip}: ${err.code}`);
        resolve({ ip, success: false, error: err.code });
      } else {
        log('info', `DNS reverso para ${ip}: ${hostnames.join(', ')}`);
        resolve({ ip, success: true, hostnames });
      }
    });
  });
}

// Testar ping para domínio
async function pingDomain(domain) {
  return new Promise((resolve) => {
    exec(`ping -c 3 ${domain}`, (error, stdout, stderr) => {
      if (error) {
        log('error', `Falha ao fazer ping para ${domain}`);
        resolve({ domain, success: false, output: stderr || stdout });
      } else {
        log('success', `Ping bem-sucedido para ${domain}`);
        resolve({ domain, success: true, output: stdout });
      }
    });
  });
}

// Testar conexão HTTP(S)
async function testHttpConnection(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.get(url, (res) => {
      log('info', `Conexão ${isHttps ? 'HTTPS' : 'HTTP'} para ${url}: ${res.statusCode}`);
      resolve({ url, success: true, statusCode: res.statusCode });
    });
    
    req.on('error', (err) => {
      log('error', `Falha na conexão ${isHttps ? 'HTTPS' : 'HTTP'} para ${url}: ${err.message}`);
      resolve({ url, success: false, error: err.message });
    });
    
    req.setTimeout(5000, () => {
      req.abort();
      log('error', `Timeout na conexão para ${url}`);
      resolve({ url, success: false, error: 'Timeout' });
    });
  });
}

// Testar servidores DNS
async function testDNSServers() {
  return new Promise((resolve) => {
    exec('cat /etc/resolv.conf', (error, stdout, stderr) => {
      if (error) {
        log('warning', 'Não foi possível verificar servidores DNS do sistema');
        resolve({ success: false, output: stderr || stdout });
      } else {
        const nameservers = [];
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith('nameserver')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              nameservers.push(parts[1]);
            }
          }
        }
        
        if (nameservers.length > 0) {
          log('info', `Servidores DNS do sistema: ${nameservers.join(', ')}`);
        } else {
          log('warning', 'Nenhum servidor DNS encontrado em /etc/resolv.conf');
        }
        
        resolve({ success: true, nameservers });
      }
    });
  });
}

// Função principal
async function main() {
  log('info', 'Iniciando diagnóstico de DNS para Supabase');
  
  // Verificar variáveis de ambiente
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!SUPABASE_URL) {
    log('error', 'Variável de ambiente NEXT_PUBLIC_SUPABASE_URL não definida');
    process.exit(1);
  }
  
  try {
    // Extrair o domínio do Supabase
    const supabaseUrl = new URL(SUPABASE_URL);
    const supabaseDomain = supabaseUrl.hostname;
    
    log('step', 'Verificando servidores DNS do sistema');
    await testDNSServers();
    
    log('step', 'Testando resolução DNS para domínios de referência');
    await checkDNS('google.com');
    await checkDNS('github.com');
    await checkDNS('supabase.com');
    
    log('step', `Testando resolução DNS para ${supabaseDomain}`);
    const supabaseDnsResult = await checkDNS(supabaseDomain);
    
    if (supabaseDnsResult.success) {
      // Se DNS bem-sucedido, verificar DNS reverso
      await checkReverseDNS(supabaseDnsResult.address);
      
      // Testar ping
      log('step', `Testando ping para ${supabaseDomain}`);
      await pingDomain(supabaseDomain);
      
      // Testar conexão HTTP(S)
      log('step', `Testando conexão HTTPS para ${SUPABASE_URL}`);
      await testHttpConnection(SUPABASE_URL);
    } else {
      // Sugestões para resolver o problema
      log('step', 'Sugestões para resolver problemas de DNS:');
      log('info', '1. Verifique se seu DNS está funcionando corretamente - teste outros sites');
      log('info', '2. Tente usar servidores DNS alternativos (1.1.1.1, 8.8.8.8, etc.)');
      log('info', '3. Verifique se há algum firewall ou proxy bloqueando acesso ao domínio');
      log('info', '4. Adicione uma entrada no arquivo /etc/hosts para o domínio do Supabase');
      log('info', '5. Verifique se o projeto Supabase ainda existe (não foi excluído)');
      log('info', '6. Tente limpar o cache DNS do sistema');
    }
    
    // Testar a conexão ao serviço N8N
    const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL;
    
    if (N8N_API_URL) {
      try {
        const n8nUrl = new URL(N8N_API_URL);
        const n8nDomain = n8nUrl.hostname;
        
        log('step', `Testando resolução DNS para ${n8nDomain} (N8N)`);
        await checkDNS(n8nDomain);
        
        log('step', `Testando ping para ${n8nDomain} (N8N)`);
        await pingDomain(n8nDomain);
      } catch (error) {
        log('error', `Erro ao testar N8N: ${error.message}`);
      }
    } else {
      log('warning', 'Variável de ambiente NEXT_PUBLIC_N8N_API_URL não definida');
    }
    
  } catch (error) {
    log('error', `Erro durante o diagnóstico: ${error.message}`);
  }
  
  log('info', 'Diagnóstico de DNS concluído');
}

// Executar função principal
main().catch(error => {
  log('error', `Erro fatal: ${error.message}`);
  process.exit(1);
}); 