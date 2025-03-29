// Script para testar a integração com a Meta Ads API
require('dotenv').config({ path: '.env.local' });

const bizSdk = require('facebook-nodejs-business-sdk');

// Classes do SDK
const {
  FacebookAdsApi,
  AdAccount,
  Campaign,
  AdSet,
  Ad,
  AdCreative,
} = bizSdk;

// Carregar credenciais do ambiente
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_ACCOUNT_ID = process.env.META_ACCOUNT_ID;
const META_PAGE_ID = process.env.META_PAGE_ID;

if (!META_ACCESS_TOKEN || !META_ACCOUNT_ID) {
  console.error('❌ META_ACCESS_TOKEN e META_ACCOUNT_ID são obrigatórios');
  process.exit(1);
}

// Inicializar a API do Facebook
const api = FacebookAdsApi.init(META_ACCESS_TOKEN);
// Ativar debug para ver mais informações
api.setDebug(true);

// Função principal assíncrona
async function main() {
  try {
    console.log('🔄 Iniciando teste da integração com o Meta Ads API');
    
    // Obter a conta de anúncios
    const account = new AdAccount(`act_${META_ACCOUNT_ID}`);
    console.log(`✅ Conta de anúncios configurada: act_${META_ACCOUNT_ID}`);
    
    // Testar leitura de campanhas existentes
    console.log('🔄 Buscando campanhas existentes...');
    const campaigns = await account.getCampaigns(
      ['id', 'name', 'status', 'objective'],
      { limit: 10 }
    );
    
    console.log(`✅ ${campaigns.length} campanhas encontradas:`);
    campaigns.forEach(campaign => {
      console.log(`   - ID: ${campaign.id}, Nome: ${campaign.name}, Status: ${campaign.status}`);
    });
    
    // Testar leitura de conjuntos de anúncios existentes
    console.log('🔄 Buscando conjuntos de anúncios existentes...');
    const adSets = await account.getAdSets(
      ['id', 'name', 'status', 'campaign_id'],
      { limit: 10 }
    );
    
    console.log(`✅ ${adSets.length} conjuntos de anúncios encontrados:`);
    adSets.forEach(adSet => {
      console.log(`   - ID: ${adSet.id}, Nome: ${adSet.name}, Campanha: ${adSet.campaign_id}`);
    });
    
    // Testar acesso à página
    if (META_PAGE_ID) {
      console.log(`🔄 Verificando página ID ${META_PAGE_ID}...`);
      try {
        const Page = bizSdk.Page;
        const page = new Page(META_PAGE_ID);
        const pageInfo = await page.get(['id', 'name', 'fan_count']);
        console.log(`✅ Página encontrada: ${pageInfo.name} (ID: ${pageInfo.id})`);
        console.log(`   Curtidas: ${pageInfo.fan_count}`);
      } catch (error) {
        console.error(`❌ Erro ao acessar informações da página: ${error.message}`);
      }
    } else {
      console.log('⚠️ META_PAGE_ID não definido, pulando teste de página');
    }
    
    console.log('\n✅ Teste de integração com o Meta Ads API concluído com sucesso!');
    console.log('✅ O SDK do Facebook está funcionando corretamente.');
    console.log('✅ Suas credenciais estão configuradas adequadamente.');
    
  } catch (error) {
    console.error('❌ Erro no teste da integração com o Meta Ads API:');
    console.error(error);
    process.exit(1);
  }
}

// Executar função principal
main().catch(error => {
  console.error('❌ Erro fatal:');
  console.error(error);
  process.exit(1);
}); 