// Script para testar a extração de métricas de leads do N8N e sua exibição no dashboard
const https = require('https');
const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=== Teste de Métricas de Leads ===");
console.log("Verificando variáveis de ambiente...");

// Valores padrão para as variáveis (serão usados se não estiverem definidas no ambiente)
const DEFAULT_N8N_API_URL = "https://node.clinicadopovo.onpsbu.easypanel.host/api/v1";
const DEFAULT_N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2QwNzdlNS1lMzdiLTQ1NzQtOGQ5YS04OGNhNjUyN2VjZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQwNTE5OTYyfQ.MrXNBTi13d_VMpCCbKoveb43d8hwpNQa4EFEn4PGVHQ";
const DEFAULT_SUPABASE_URL = "https://dkvqjisxtdlrdgseiooq.supabase.co";
const DEFAULT_SUPABASE_KEY = ""; // Deixe em branco se não tiver um valor padrão

// Utiliza as variáveis de ambiente se definidas, ou os valores padrão caso contrário
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || DEFAULT_N8N_API_URL;
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || DEFAULT_N8N_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_KEY;

console.log("Usando as seguintes configurações:");
console.log(`- N8N API URL: ${N8N_API_URL}`);
console.log(`- Supabase URL: ${SUPABASE_URL}`);
console.log("- Chaves de API: *** (omitidas por segurança)");

// Define a URL base para as chamadas de API (usando o localhost por padrão)
const BASE_URL = process.env.APP_URL || "http://localhost:3000";

// Sobrescrever as variáveis de ambiente temporariamente apenas para este script
process.env.NEXT_PUBLIC_N8N_API_URL = N8N_API_URL;
process.env.NEXT_PUBLIC_N8N_API_KEY = N8N_API_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_KEY;

// Função para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data.length ? JSON.parse(data) : null
          });
        } catch (err) {
          reject(new Error(`Falha ao analisar resposta: ${err.message}. Dados: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

async function runTests() {
  try {
    console.log("\n1. Extraindo métricas de leads dos workflows do N8N...");
    console.log(`Enviando requisição para ${BASE_URL}/api/metrics/lead-metrics`);
    
    // Chamar a API de métricas
    const metricsResponse = await makeRequest(`${BASE_URL}/api/metrics/lead-metrics`);
    
    if (metricsResponse.statusCode !== 200) {
      throw new Error(`A API retornou status HTTP ${metricsResponse.statusCode}. Resposta: ${JSON.stringify(metricsResponse.body)}`);
    }
    
    if (!metricsResponse.body.success) {
      throw new Error(`A API não retornou sucesso. Resposta: ${JSON.stringify(metricsResponse.body)}`);
    }
    
    console.log("\n✅ API de métricas retornou com sucesso!");
    
    // Extrair e mostrar os dados da resposta
    const { metrics } = metricsResponse.body;
    
    console.log("\nMétricas extraídas:");
    console.log(`- Leads Capturados: ${metrics.total_leads}`);
    console.log(`- Leads Qualificados: ${metrics.qualified_leads}`);
    console.log(`- Leads Desqualificados: ${metrics.unqualified_leads}`);
    console.log(`- Taxa de Conversão: ${metrics.conversion_rate}%`);
    
    // Verificar se os dados foram salvos no Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      console.log("\n2. Verificando se os dados foram salvos no Supabase...");
      
      // Usar data atual formatada como YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const supabaseResponse = await makeRequest(
          `${SUPABASE_URL}/rest/v1/lead_metrics?date=eq.${today}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          }
        );
        
        if (supabaseResponse.statusCode !== 200) {
          console.warn(`AVISO: Não foi possível verificar os dados no Supabase. Status: ${supabaseResponse.statusCode}`);
        } else {
          const records = supabaseResponse.body;
          
          if (!records || records.length === 0) {
            console.warn(`AVISO: Nenhum registro encontrado para hoje (${today}) no Supabase.`);
          } else {
            console.log(`✅ Dados encontrados no Supabase para a data de hoje (${today})!`);
            console.log("Dados salvos no Supabase:");
            console.log(JSON.stringify(records, null, 2));
          }
        }
      } catch (err) {
        console.warn(`AVISO: Erro ao verificar dados no Supabase: ${err.message}`);
      }
    } else {
      console.warn("AVISO: Verificação do Supabase ignorada devido a variáveis de ambiente ausentes.");
    }
    
    // Testar a rota CRON (opcional)
    console.log("\n3. Testando a rota CRON (opcional)...");
    rl.question("Deseja testar também a rota CRON? (s/n): ", async (answer) => {
      if (answer.toLowerCase() === 's') {
        console.log(`Enviando requisição para ${BASE_URL}/cron/metrics`);
        
        try {
          const cronResponse = await makeRequest(`${BASE_URL}/cron/metrics`);
          
          if (cronResponse.statusCode !== 200) {
            console.warn(`AVISO: A rota CRON retornou status HTTP ${cronResponse.statusCode}. Resposta: ${JSON.stringify(cronResponse.body)}`);
          } else if (!cronResponse.body.success) {
            console.warn(`AVISO: A rota CRON não retornou sucesso. Resposta: ${JSON.stringify(cronResponse.body)}`);
          } else {
            console.log("✅ Rota CRON funcionou corretamente!");
          }
        } catch (err) {
          console.warn(`AVISO: Erro ao testar rota CRON: ${err.message}`);
        }
        
        finishTest();
      } else {
        console.log("Teste da rota CRON ignorado.");
        finishTest();
      }
    });
    
  } catch (err) {
    console.error(`ERRO: ${err.message}`);
    rl.close();
    process.exit(1);
  }
}

function finishTest() {
  console.log("\n=== Teste Concluído ===");
  console.log(`Para visualizar as métricas na interface, acesse: ${BASE_URL}/metricas`);
  console.log("Você também pode clicar no botão de atualização na interface para buscar novas métricas.");
  console.log("Lembre-se que o reload da página pode ser necessário após a atualização das métricas.");
  rl.close();
}

runTests(); 