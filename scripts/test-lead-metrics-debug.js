// Script simplificado para testar a extração de métricas de leads com melhor diagnóstico
const http = require('http');
const https = require('https');

console.log('=== Teste de Métricas de Leads (Versão de Diagnóstico) ===');

// Configurações diretas
const config = {
  n8nApiUrl: 'https://node.clinicadopovo.onpsbu.easypanel.host/api/v1',
  n8nApiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2QwNzdlNS1lMzdiLTQ1NzQtOGQ5YS04OGNhNjUyN2VjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQwNTE5OTYyfQ.MrXNBTi13d_VMpCCbKoveb43d8hwpNQa4EFEn4PGVHQ',
  supabaseUrl: 'https://dkvqjisxtdlrdgseiooq.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdnFqaXN4dGRscmRnc2Vpb29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzg2MDY5NSwiZXhwIjoyMDUzNDM2Njk1fQ.kFV65mUt9ljbP9sFaaKQ7JlzL5aiEf-ZOsgdmOk1Lqo',
  baseUrl: process.env.APP_URL || 'http://localhost:3000'
};

// Configurar variáveis de ambiente
process.env.NEXT_PUBLIC_N8N_API_URL = config.n8nApiUrl;
process.env.NEXT_PUBLIC_N8N_API_KEY = config.n8nApiKey;
process.env.NEXT_PUBLIC_SUPABASE_URL = config.supabaseUrl;
process.env.SUPABASE_SERVICE_ROLE_KEY = config.supabaseKey;

console.log('Variáveis de ambiente configuradas:');
console.log(`- NEXT_PUBLIC_N8N_API_URL: ${process.env.NEXT_PUBLIC_N8N_API_URL}`);
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '(configurada)' : '(não configurada)'}`);
console.log(`- Testando servidor em: ${config.baseUrl}`);

// Função para fazer requisições HTTP com mais detalhes
function simpleRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\nFazendo requisição para: ${url}`);
    console.log(`Método: ${options.method || 'GET'}`);
    if (options.headers) {
      console.log('Headers:');
      Object.entries(options.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${key.toLowerCase().includes('key') ? '***' : value}`);
      });
    }
    
    const urlObject = new URL(url);
    const lib = urlObject.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObject.hostname,
      port: urlObject.port || (urlObject.protocol === 'https:' ? 443 : 80),
      path: `${urlObject.pathname}${urlObject.search}`,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    console.log(`Detalhes da requisição: ${JSON.stringify({
      hostname: requestOptions.hostname,
      port: requestOptions.port,
      path: requestOptions.path,
      method: requestOptions.method
    })}`);
    
    const req = lib.request(requestOptions, (res) => {
      console.log(`\nStatus da resposta: ${res.statusCode} ${res.statusMessage}`);
      console.log('Headers da resposta:');
      Object.entries(res.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Tamanho da resposta: ${data.length} bytes`);
        try {
          // Tenta analisar como JSON, mas retorna o texto original se falhar
          const jsonData = data.length ? JSON.parse(data) : null;
          console.log('Resposta é um JSON válido.');
          resolve({ statusCode: res.statusCode, statusMessage: res.statusMessage, body: jsonData, rawBody: data });
        } catch (err) {
          console.log(`Aviso: Resposta não é um JSON válido. Erro: ${err.message}`);
          console.log('Primeiros 200 caracteres da resposta:');
          console.log(data.substring(0, 200) + (data.length > 200 ? '...' : ''));
          resolve({ statusCode: res.statusCode, statusMessage: res.statusMessage, body: null, rawBody: data });
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`Erro na requisição: ${err.message}`);
      reject(err);
    });
    
    // Timeout
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout: A requisição demorou mais de 10 segundos'));
    });
    
    req.end();
  });
}

// Função que busca o arquivo para verificar se existe
async function checkFileExists(path) {
  try {
    const fs = require('fs');
    const fullPath = require('path').resolve(path);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Arquivo encontrado: ${fullPath}`);
      return true;
    } else {
      console.log(`❌ Arquivo não encontrado: ${fullPath}`);
      return false;
    }
  } catch (err) {
    console.error(`Erro ao verificar arquivo: ${err.message}`);
    return false;
  }
}

// Função principal assíncrona
async function runTest() {
  console.log('\nIniciando teste...');
  
  try {
    // Verificar se o arquivo da API existe
    console.log('\nVerificando se o arquivo da API existe...');
    await checkFileExists('app/api/metrics/lead-metrics/route.ts');
    await checkFileExists('app/api/metrics/lead-metrics/route.js');
    
    // 1. Verifica se o servidor está acessível
    console.log(`\n1. Verificando se o servidor está acessível em ${config.baseUrl}...`);
    try {
      const serverTest = await simpleRequest(config.baseUrl);
      if (serverTest.statusCode === 200) {
        console.log('✅ Servidor acessível!');
      } else {
        console.warn(`⚠️ O servidor retornou código ${serverTest.statusCode}`);
        console.log('Seu servidor Next.js está rodando corretamente?');
      }
    } catch (err) {
      console.error(`❌ Erro ao acessar o servidor: ${err.message}`);
      console.log('Verifique se seu servidor Next.js está rodando.');
      console.log('Se estiver em outra URL, execute: APP_URL=sua-url node scripts/test-lead-metrics-debug.js');
      // Continua mesmo com erro para tentar a API
    }
    
    // 2. Chama a API de métricas
    console.log(`\n2. Chamando API de métricas em ${config.baseUrl}/api/metrics/lead-metrics...`);
    try {
      const metricsResponse = await simpleRequest(`${config.baseUrl}/api/metrics/lead-metrics`);
      
      if (metricsResponse.statusCode !== 200) {
        console.error(`❌ A API retornou código ${metricsResponse.statusCode} ${metricsResponse.statusMessage}`);
        console.log('Resposta bruta:');
        console.log(metricsResponse.rawBody);
      } else if (!metricsResponse.body || !metricsResponse.body.success) {
        console.error('❌ A API não retornou sucesso');
        console.log('Resposta:');
        console.log(JSON.stringify(metricsResponse.body, null, 2));
      } else {
        console.log('✅ API retornou com sucesso!');
        console.log('Métricas:');
        const { metrics } = metricsResponse.body;
        console.log(`- Leads Capturados: ${metrics.total_leads}`);
        console.log(`- Leads Qualificados: ${metrics.qualified_leads}`);
        console.log(`- Leads Desqualificados: ${metrics.unqualified_leads}`);
        console.log(`- Taxa de Conversão: ${metrics.conversion_rate}%`);
      }
    } catch (err) {
      console.error(`❌ Erro ao chamar a API: ${err.message}`);
    }
    
    // 3. Tenta acessar diretamente o Supabase para teste
    console.log(`\n3. Verificando acesso ao Supabase em ${config.supabaseUrl}/rest/v1/lead_metrics...`);
    try {
      const supabaseResponse = await simpleRequest(`${config.supabaseUrl}/rest/v1/lead_metrics?limit=1`, {
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        }
      });
      
      if (supabaseResponse.statusCode === 200) {
        console.log('✅ Acesso ao Supabase funcionando!');
      } else {
        console.warn(`⚠️ Supabase retornou código ${supabaseResponse.statusCode}`);
        console.log('Resposta:');
        console.log(supabaseResponse.rawBody);
      }
    } catch (err) {
      console.error(`❌ Erro ao acessar Supabase: ${err.message}`);
    }
    
  } catch (err) {
    console.error(`Erro geral: ${err.message}`);
  }
  
  console.log('\n=== Teste Concluído ===');
  console.log('Dicas para solução de problemas:');
  console.log('1. Certifique-se que seu servidor Next.js está rodando');
  console.log('2. Verifique os logs do servidor para erros específicos');
  console.log('3. Verifique se as variáveis de ambiente estão configuradas corretamente');
  console.log('4. Para testar com outra URL de servidor: APP_URL=sua-url node scripts/test-lead-metrics-debug.js');
}

// Executa o teste
runTest(); 