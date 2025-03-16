#!/usr/bin/env node

/**
 * Script para configurar a estrutura do projeto
 * 
 * Este script cria a estrutura de diretórios necessária, verifica as dependências
 * e prepara o projeto para receber dados de uso do OpenAI.
 * 
 * Uso:
 *   node scripts/configurar-projeto.js
 */

// Importar módulos necessários
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Criar interface para leitura do terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para perguntar ao usuário
function perguntar(pergunta) {
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      resolve(resposta);
    });
  });
}

// Função para verificar se um diretório existe
function verificarDiretorio(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isDirectory();
}

// Função para criar diretório se não existir
function criarDiretorioSeNaoExistir(caminho) {
  if (!fs.existsSync(caminho)) {
    console.log(`Criando diretório: ${caminho}`);
    fs.mkdirSync(caminho, { recursive: true });
    return true;
  }
  return false;
}

// Função para criar um arquivo se não existir
function criarArquivoSeNaoExistir(caminho, conteudo) {
  if (!fs.existsSync(caminho)) {
    console.log(`Criando arquivo: ${caminho}`);
    fs.writeFileSync(caminho, conteudo);
    return true;
  }
  return false;
}

// Função para verificar dependências no package.json
async function verificarDependencias() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.error('Erro: package.json não encontrado. Este comando deve ser executado na raiz do projeto.');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  
  const necessarias = {
    '@supabase/supabase-js': '^2.0.0',
    'next': '^13.0.0 || ^14.0.0',
    'dotenv': '^16.0.0'
  };
  
  const faltantes = [];
  const desatualizadas = [];
  
  for (const [dep, versaoMinima] of Object.entries(necessarias)) {
    const versaoAtual = dependencies[dep] || devDependencies[dep];
    
    if (!versaoAtual) {
      faltantes.push(dep);
    } else {
      // Verifica se a versão atual é menor que a mínima
      // Esta é uma verificação simplificada e pode não funcionar para todos os casos
      const versaoAtualSemSimbolo = versaoAtual.replace(/[\^~]/, '');
      const versaoMinimaSemSimbolo = versaoMinima.replace(/[\^~]/, '');
      
      if (versaoAtualSemSimbolo < versaoMinimaSemSimbolo) {
        desatualizadas.push(`${dep} (atual: ${versaoAtual}, necessária: ${versaoMinima})`);
      }
    }
  }
  
  if (faltantes.length > 0 || desatualizadas.length > 0) {
    console.log('\n⚠️ Dependências ausentes ou desatualizadas:');
    
    if (faltantes.length > 0) {
      console.log('\nDependências ausentes:');
      faltantes.forEach(dep => console.log(`- ${dep}`));
    }
    
    if (desatualizadas.length > 0) {
      console.log('\nDependências desatualizadas:');
      desatualizadas.forEach(dep => console.log(`- ${dep}`));
    }
    
    const instalar = await perguntar('\nDeseja instalar/atualizar estas dependências? (s/n): ');
    
    if (instalar.toLowerCase() === 's') {
      console.log('\nInstalando dependências...');
      try {
        const depInstall = faltantes.join(' ');
        if (depInstall) {
          execSync(`npm install ${depInstall}`, { stdio: 'inherit' });
        }
        
        // Para as desatualizadas, precisaríamos de uma lógica mais complexa
        // Por enquanto, apenas informa ao usuário
        if (desatualizadas.length > 0) {
          console.log('\nVocê pode atualizar as dependências desatualizadas manualmente:');
          const depUpdate = desatualizadas.map(d => d.split(' ')[0]).join(' ');
          console.log(`npm update ${depUpdate}`);
        }
      } catch (error) {
        console.error('Erro ao instalar dependências:', error.message);
      }
    }
  } else {
    console.log('✅ Todas as dependências necessárias estão instaladas e atualizadas.');
  }
}

// Função para verificar e criar estrutura de arquivos
async function verificarEstrutura() {
  const root = process.cwd();
  const diretorioApp = path.join(root, 'app');
  const diretorioApi = path.join(diretorioApp, 'api');
  const diretorioWebhooks = path.join(diretorioApi, 'webhooks');
  const diretorioN8nOpenai = path.join(diretorioWebhooks, 'n8n-openai');
  const diretorioScripts = path.join(root, 'scripts');
  
  console.log('\nVerificando estrutura de diretórios...');
  
  // Verificar se é um projeto Next.js
  if (!verificarDiretorio(diretorioApp)) {
    console.log('⚠️ Este não parece ser um projeto Next.js (diretório "app" não encontrado).');
    const criar = await perguntar('Deseja criar a estrutura de diretórios para Next.js App Router? (s/n): ');
    
    if (criar.toLowerCase() !== 's') {
      console.log('Operação cancelada pelo usuário.');
      return;
    }
  }
  
  // Criar diretórios se não existirem
  criarDiretorioSeNaoExistir(diretorioApp);
  criarDiretorioSeNaoExistir(diretorioApi);
  criarDiretorioSeNaoExistir(diretorioWebhooks);
  criarDiretorioSeNaoExistir(diretorioN8nOpenai);
  criarDiretorioSeNaoExistir(diretorioScripts);
  
  // Verificar arquivos principais
  const arquivoWebhook = path.join(diretorioN8nOpenai, 'route.ts');
  const arquivoScriptTest = path.join(diretorioScripts, 'testar-webhook-openai.js');
  const arquivoScriptFunction = path.join(diretorioScripts, 'extrair-uso-openai-direto.js');
  const arquivoEnvExample = path.join(root, '.env.example');
  
  // Criar arquivo .env.example se não existir
  const templateEnv = `# Configurações do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_KEY=sua-chave-de-servico

# Configurações do webhook
N8N_WEBHOOK_SECRET=seu-segredo-para-autenticacao
NEXT_PUBLIC_WEBHOOK_URL=http://localhost:3000/api/webhooks/n8n-openai

# Configurações do N8N (para implementação automatizada)
N8N_API_URL=http://localhost:5678
N8N_API_KEY=seu-token-de-acesso
`;
  
  criarArquivoSeNaoExistir(arquivoEnvExample, templateEnv);
  
  // Criar arquivo .env.local se não existir (baseado no .env.example)
  const arquivoEnvLocal = path.join(root, '.env.local');
  if (!fs.existsSync(arquivoEnvLocal)) {
    console.log('\n⚠️ Arquivo .env.local não encontrado.');
    const criar = await perguntar('Deseja criar o arquivo .env.local com base no .env.example? (s/n): ');
    
    if (criar.toLowerCase() === 's') {
      fs.copyFileSync(arquivoEnvExample, arquivoEnvLocal);
      console.log('✅ Arquivo .env.local criado. Edite-o com suas configurações reais.');
    }
  }
  
  // Verificar se existem scripts importantes no repositório atual
  const arquivosNecessarios = [
    { caminho: arquivoWebhook, nome: 'Webhook para OpenAI (route.ts)' },
    { caminho: arquivoScriptTest, nome: 'Script de teste do webhook' },
    { caminho: arquivoScriptFunction, nome: 'Script para nó Function do N8N' }
  ];
  
  console.log('\nVerificando arquivos essenciais...');
  
  const arquivosFaltantes = arquivosNecessarios.filter(arquivo => !fs.existsSync(arquivo.caminho));
  
  if (arquivosFaltantes.length > 0) {
    console.log('⚠️ Os seguintes arquivos essenciais não foram encontrados:');
    arquivosFaltantes.forEach(arquivo => console.log(`- ${arquivo.nome} (${arquivo.caminho})`));
    
    console.log('\nVocê precisa criar ou copiar estes arquivos do repositório original.');
    console.log('Instruções detalhadas podem ser encontradas no README.md');
  } else {
    console.log('✅ Todos os arquivos essenciais foram encontrados.');
  }
}

// Função para verificar a estrutura do banco de dados
async function verificarBancoDados() {
  console.log('\nA estrutura do banco de dados Supabase precisa ser configurada manualmente.');
  console.log('Execute o script SQL disponível em scripts/criar-tabela-openai-usage.sql no Editor SQL do Supabase.');
  console.log('Instruções detalhadas podem ser encontradas no arquivo PROBLEMA-TABELA-SUPABASE.md');
}

// Função principal
async function main() {
  console.log('=== Configurando Projeto para Monitoramento de Uso do OpenAI ===\n');
  
  try {
    // Verificar dependências
    await verificarDependencias();
    
    // Verificar estrutura de diretórios e arquivos
    await verificarEstrutura();
    
    // Verificar banco de dados
    await verificarBancoDados();
    
    console.log('\n✅ Verificação concluída!');
    console.log('Para finalizar a configuração:');
    console.log('1. Edite o arquivo .env.local com suas credenciais reais');
    console.log('2. Configure a tabela openai_usage no Supabase');
    console.log('3. Execute o script de teste: node scripts/testar-webhook-openai.js');
    console.log('4. Implemente o nó Function em seus workflows do N8N');
    
  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Executar a função principal
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
}); 